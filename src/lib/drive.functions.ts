import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type UploadInput = {
  roomId: string;
  workItemId: string | null;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  folderName: string;
  area?: string;
  roomName?: string;
};

export const uploadWorkPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadInput) => {
    if (!input.roomId || !input.dataBase64) throw new Error("Missing photo data");
    // 10MB raw image in base64 is ~13.7M characters
    if (input.dataBase64.length > 15_000_000) throw new Error("Photo exceeds 10MB limit");
    return input;
  })
  .handler(async ({ data, context }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
    if (!lovableKey || !driveKey) throw new Error("Google Drive is not connected");

    const boundary = "lovable-" + crypto.randomUUID();
    // Optional target Drive folder for all site photos. Photos are placed inside this folder.
    const targetFolderId =
      process.env["GOOGLE_DRIVE_FOLDER_ID"] || "1PeJrZjAdHwS9kTfRxrPMByqRZvMHIi0e";
    const metadata: Record<string, unknown> = {
      name: `${data.folderName} - ${data.fileName}`,
      mimeType: data.mimeType,
      description: `Uploaded from the works tracker (${data.folderName})`,
    };
    if (targetFolderId) {
      metadata["parents"] = [targetFolderId];
    }
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: ${data.mimeType}\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n${data.dataBase64}\r\n` +
      `--${boundary}--`;

    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_drive/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": driveKey,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`Drive upload failed [${res.status}]: ${text}`);
      throw new Error(`Drive upload failed [${res.status}]: ${text}`);
    }

    const file = (await res.json()) as {
      id: string;
      name: string;
      webViewLink?: string;
      thumbnailLink?: string;
    };

    const { supabase } = context;
    let roomId = data.roomId;
    if ((!roomId || roomId.startsWith("virtual-")) && data.area && data.roomName) {
      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("id")
        .eq("area", data.area)
        .eq("name", data.roomName)
        .maybeSingle();
      if (existingRoom?.id) {
        roomId = existingRoom.id;
      } else {
        const { data: createdRoom, error: createRoomErr } = await supabase
          .from("rooms")
          .insert({ area: data.area, name: data.roomName, sort_order: 1 })
          .select("id")
          .single();
        if (createRoomErr || !createdRoom) {
          throw new Error(createRoomErr?.message || "Failed to create room for photo");
        }
        roomId = createdRoom.id;
      }
    }

    let workItemId = data.workItemId;
    if (workItemId?.startsWith("virtual-")) workItemId = null;

    const { error } = await supabase.from("work_photos").insert({
      room_id: roomId,
      work_item_id: workItemId,
      file_name: file.name,
      drive_file_id: file.id,
      drive_view_url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
      drive_thumbnail_url: file.thumbnailLink ?? null,
      user_id: context.userId,
    });
    if (error) throw new Error(error.message);

    return { id: file.id, name: file.name };
  });
