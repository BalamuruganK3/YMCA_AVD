import { supabase } from "@/integrations/supabase/client";

/** Hidden work-item used when `rooms.remarks` is not available yet. */
export const OVERALL_REMARKS_TITLE = "__OVERALL_ROOM_REMARKS__";

export function isOverallRemarksItem(item: { title?: string | null }) {
  return item.title === OVERALL_REMARKS_TITLE;
}

export type RoomRow = {
  id: string;
  area: string;
  name: string;
  remarks: string | null;
};

export async function fetchRoomsWithRemarks(): Promise<RoomRow[]> {
  const withCol = await supabase.from("rooms").select("id, area, name, remarks").order("sort_order");
  if (!withCol.error) {
    return (withCol.data ?? []).map((r) => ({
      id: r.id,
      area: r.area,
      name: r.name,
      remarks: r.remarks ?? null,
    }));
  }

  const fallback = await supabase.from("rooms").select("id, area, name").order("sort_order");
  if (fallback.error) throw withCol.error;
  const rooms = fallback.data ?? [];
  const ids = rooms.map((r) => r.id);
  if (ids.length === 0) return rooms.map((r) => ({ ...r, remarks: null }));

  const { data: items } = await supabase
    .from("work_items")
    .select("room_id, remarks")
    .in("room_id", ids)
    .eq("title", OVERALL_REMARKS_TITLE);

  const byRoom = new Map<string, string | null>();
  for (const item of items ?? []) {
    byRoom.set(item.room_id, item.remarks ?? null);
  }
  return rooms.map((r) => ({ ...r, remarks: byRoom.get(r.id) ?? null }));
}

export async function saveOverallRoomRemarks(roomId: string, text: string) {
  const remarks = text.trim() || null;

  const update = await supabase.from("rooms").update({ remarks }).eq("id", roomId);
  if (update.error) {
    throw new Error(update.error.message || "Could not save overall room remarks.");
  }

  const { data: existing } = await supabase
    .from("work_items")
    .select("id")
    .eq("room_id", roomId)
    .eq("title", OVERALL_REMARKS_TITLE)
    .maybeSingle();

  if (existing?.id) {
    if (remarks) {
      const { error } = await supabase
        .from("work_items")
        .update({ remarks, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message || "Could not save overall room remarks.");
    } else {
      await supabase.from("work_updates").delete().eq("work_item_id", existing.id);
      const { error } = await supabase.from("work_items").delete().eq("id", existing.id);
      if (error) throw new Error(error.message || "Could not clear overall room remarks.");
    }
    return;
  }

  if (!remarks) return;

  const { error } = await supabase.from("work_items").insert({
    room_id: roomId,
    group_name: "Room",
    subgroup: "Overall",
    title: OVERALL_REMARKS_TITLE,
    kind: "work",
    status: "hold",
    remarks,
    sort_order: 0,
  });
  if (error) throw new Error(error.message || "Could not save overall room remarks.");
}

function relatedRoom(rel: unknown): { id: string; name: string; area: string } | null {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  if (!row || typeof row !== "object" || !("id" in row)) return null;
  const r = row as { id: string; name: string; area: string };
  return r;
}

export async function fetchOverallRoomRemarksList(): Promise<RoomRow[]> {
  const fromColumn = await supabase
    .from("rooms")
    .select("id, name, area, remarks")
    .not("remarks", "is", null);

  if (!fromColumn.error) {
    return (fromColumn.data ?? [])
      .filter((r) => (r.remarks ?? "").trim().length > 0)
      .map((r) => ({ id: r.id, name: r.name, area: r.area, remarks: r.remarks ?? null }));
  }

  const { data: fallbackItems } = await supabase
    .from("work_items")
    .select("remarks, rooms(id, name, area)")
    .eq("title", OVERALL_REMARKS_TITLE)
    .not("remarks", "is", null);

  const columnRows: RoomRow[] = [];
  const seen = new Set<string>();
  for (const item of fallbackItems ?? []) {
    const room = relatedRoom(item.rooms);
    if (!room || seen.has(room.id) || !(item.remarks ?? "").trim()) continue;
    seen.add(room.id);
    columnRows.push({
      id: room.id,
      name: room.name,
      area: room.area,
      remarks: item.remarks,
    });
  }
  return columnRows;
}

export async function deleteRoomPermanently(roomId: string) {
  const { data: roomRow, error: roomErr } = await supabase
    .from("rooms")
    .select("id, area, name")
    .eq("id", roomId)
    .maybeSingle();
  if (roomErr) throw roomErr;
  if (!roomRow) throw new Error("Room not found.");

  const { count: workCount, error: countErr } = await supabase
    .from("work_items")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .neq("title", OVERALL_REMARKS_TITLE);
  if (countErr) throw countErr;

  const { data: workIds, error: wErr } = await supabase
    .from("work_items")
    .select("id")
    .eq("room_id", roomId);
  if (wErr) throw wErr;
  const ids = (workIds ?? []).map((row) => row.id);
  if (ids.length > 0) {
    await supabase.from("work_photos").delete().in("work_item_id", ids);
    await supabase.from("work_updates").delete().in("work_item_id", ids);
    await supabase.from("work_items").delete().in("id", ids);
  }
  await supabase.from("work_photos").delete().eq("room_id", roomId);

  const { error: delRoom } = await supabase.from("rooms").delete().eq("id", roomId);
  if (delRoom) throw new Error(delRoom.message || "Could not delete this room.");

  const { count: remaining } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("area", roomRow.area);

  return {
    name: roomRow.name,
    area: roomRow.area,
    workCount: workCount ?? 0,
    typeRemoved: (remaining ?? 0) === 0,
  };
}
