import { supabase } from "@/integrations/supabase/client";
import { AreaSlug } from "./constants";
import { getRoomDefaultWorkItems } from "./room-tasks";

export async function saveWorkItemStatusClient(input: {
  userId: string;
  roomId?: string;
  area: string;
  roomName: string;
  itemId: string;
  itemTitle: string;
  status: string;
  remarks?: string | null;
}) {
  const { userId, roomId: inputRoomId, area, roomName, itemId, itemTitle, status, remarks } = input;

  const cleanRemarks = (remarks ?? "").replace(/\[Range:\s*\d+%\]\s*/i, "").trim();
  if (!cleanRemarks) {
    throw new Error("Please enter remarks before saving this update.");
  }

  let targetWorkItemId = itemId;
  let resolvedRoomId = inputRoomId;

  // 1. Direct work item update if it's already an existing record in work_items
  if (targetWorkItemId && !targetWorkItemId.startsWith("virtual-")) {
    const { data: directItem } = await supabase
      .from("work_items")
      .select("id, room_id")
      .eq("id", targetWorkItemId)
      .maybeSingle();

    if (directItem) {
      targetWorkItemId = directItem.id;
      resolvedRoomId = directItem.room_id;

      const { error: updateErr } = await supabase
        .from("work_items")
        .update({
          status,
          updated_at: new Date().toISOString(),
          updated_by: userId,
          ...(remarks !== undefined ? { remarks } : {}),
        })
        .eq("id", targetWorkItemId);
      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase.from("work_updates").insert({
        work_item_id: targetWorkItemId,
        status,
        remarks: remarks ?? null,
        user_id: userId,
      });
      if (logErr) throw logErr;

      return { success: true as const, workItemId: targetWorkItemId, roomId: resolvedRoomId };
    }
  }

  // 2. If it's a virtual item or not found directly, verify the room exists
  if (resolvedRoomId && !resolvedRoomId.startsWith("virtual-")) {
    const { data: realRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", resolvedRoomId)
      .maybeSingle();
    if (realRoom) {
      resolvedRoomId = realRoom.id;
    }
  }

  if (!resolvedRoomId || resolvedRoomId.startsWith("virtual-")) {
    const { data: existingRoom, error: roomFetchErr } = await supabase
      .from("rooms")
      .select("id")
      .eq("area", area)
      .ilike("name", roomName.trim())
      .maybeSingle();
    if (roomFetchErr) throw roomFetchErr;
    resolvedRoomId = existingRoom?.id;
  }

  if (!resolvedRoomId || resolvedRoomId.startsWith("virtual-")) {
    throw new Error("Room not found. Rooms can only be created using the 'Add room type' button.");
  }

  // 3. Room is confirmed to exist. Check its work items.
  const targetItems = getRoomDefaultWorkItems(area as AreaSlug, roomName);
  const { data: existingItems, error: itemsErr } = await supabase
    .from("work_items")
    .select("id, title")
    .eq("room_id", resolvedRoomId);
  if (itemsErr) throw itemsErr;

  const currentItems = existingItems ?? [];

  const matchByTitle = currentItems.find(
    (i) => i.title.toLowerCase() === itemTitle.toLowerCase(),
  );
  const matchById = currentItems.find((i) => i.id === itemId);

  if (matchByTitle) {
    targetWorkItemId = matchByTitle.id;
  } else if (matchById) {
    targetWorkItemId = matchById.id;
  } else {
    // Insert new work item into the existing room
    const itemDef = targetItems.find(
      (t) => t.title.toLowerCase() === itemTitle.toLowerCase(),
    ) ?? {
      group_name: "Civil Work",
      subgroup: null,
      title: itemTitle,
      kind: "work" as const,
      sort_order: currentItems.length + 1,
    };
    const { data: newItem, error: newItemErr } = await supabase
      .from("work_items")
      .insert({
        ...itemDef,
        room_id: resolvedRoomId,
        status,
        remarks: remarks ?? null,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (newItemErr || !newItem) {
      throw new Error(newItemErr?.message || "Failed to create work item");
    }
    targetWorkItemId = newItem.id;
  }

  const { error: updateErr } = await supabase
    .from("work_items")
    .update({
      status,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      ...(remarks !== undefined ? { remarks } : {}),
    })
    .eq("id", targetWorkItemId);
  if (updateErr) throw updateErr;

  const { error: logErr } = await supabase.from("work_updates").insert({
    work_item_id: targetWorkItemId,
    status,
    remarks: remarks ?? null,
    user_id: userId,
  });
  if (logErr) throw logErr;

  return { success: true as const, workItemId: targetWorkItemId, roomId: resolvedRoomId };
}
