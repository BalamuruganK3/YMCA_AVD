import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type UploadInput = {
  roomId: string;
  workItemId: string | null;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  folderName: string;
};

export const uploadWorkPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UploadInput) => {
    if (!input.roomId || !input.dataBase64) throw new Error("Missing photo data");
    if (input.dataBase64.length > 12_000_000) throw new Error("Photo too large (max ~8MB)");
    return input;
  })
  .handler(async ({ data, context }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
    if (!lovableKey || !driveKey) throw new Error("Google Drive is not connected");

    const boundary = "lovable-" + crypto.randomUUID();
    const metadata = {
      name: `${data.folderName} - ${data.fileName}`,
      mimeType: data.mimeType,
      description: `Uploaded from the works tracker (${data.folderName})`,
    };
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

    const { error } = await context.supabase.from("work_photos").insert({
      room_id: data.roomId,
      work_item_id: data.workItemId,
      file_name: file.name,
      drive_file_id: file.id,
      drive_view_url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
      drive_thumbnail_url: file.thumbnailLink ?? null,
      user_id: context.userId,
    });
    if (error) throw new Error(error.message);

    return { id: file.id, name: file.name };
  });
