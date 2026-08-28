import { supabase } from "@/integrations/supabase/client";
import { AreaSlug } from "./constants";
import { getRoomDefaultWorkItems } from "./room-tasks";

export async function saveWorkItemStatusClient(input: {
  userId: string;
  area: string;
  roomName: string;
  itemId: string;
  itemTitle: string;
  status: string;
  remarks?: string | null;
}) {
  const { userId, area, roomName, itemId, itemTitle, status, remarks } = input;

  const cleanRemarks = (remarks ?? "").replace(/\[Range:\s*\d+%\]\s*/i, "").trim();
  if (!cleanRemarks) {
    throw new Error("Please enter remarks before saving this update.");
  }

  const { data: existingRoom, error: roomFetchErr } = await supabase
    .from("rooms")
    .select("id")
    .eq("area", area)
    .eq("name", roomName)
    .maybeSingle();
  if (roomFetchErr) throw roomFetchErr;

  let roomId = existingRoom?.id;
  let createdRoom = false;
  if (!roomId) {
    const { data: created, error: createRoomErr } = await supabase
      .from("rooms")
      .insert({ area, name: roomName, sort_order: 1 })
      .select("id")
      .single();
    if (createRoomErr || !created) {
      throw new Error(createRoomErr?.message || "Failed to create room");
    }
    roomId = created.id;
    createdRoom = true;
  }

  const targetItems = getRoomDefaultWorkItems(area as AreaSlug, roomName);
  const { data: existingItems, error: itemsErr } = await supabase
    .from("work_items")
    .select("id, title")
    .eq("room_id", roomId);
  if (itemsErr) throw itemsErr;

  let currentItems = existingItems ?? [];
  if (currentItems.length === 0 && createdRoom) {
    const toInsert = targetItems.map((item) => ({
      ...item,
      room_id: roomId,
    }));
    const { data: inserted, error: insertErr } = await supabase
      .from("work_items")
      .insert(toInsert)
      .select("id, title");
    if (insertErr) throw insertErr;
    currentItems = inserted ?? [];
  }

  let targetWorkItemId = itemId;
  const matchByTitle = currentItems.find(
    (i) => i.title.toLowerCase() === itemTitle.toLowerCase(),
  );
  const matchById = currentItems.find((i) => i.id === itemId);

  if (matchByTitle) {
    targetWorkItemId = matchByTitle.id;
  } else if (matchById) {
    targetWorkItemId = matchById.id;
  } else {
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
        room_id: roomId,
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

  return { success: true as const, workItemId: targetWorkItemId, roomId };
}
