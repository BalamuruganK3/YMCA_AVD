import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRoomDefaultWorkItems } from "./room-tasks";
import { AreaSlug } from "./constants";

export const saveWorkItemStatusServerFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    area: string;
    roomName: string;
    itemId: string;
    itemTitle: string;
    status: string;
    remarks?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { area, roomName, itemId, itemTitle, status, remarks } = data;

    // 1. Ensure room exists
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("area", area)
      .eq("name", roomName)
      .maybeSingle();

    let roomId = existingRoom?.id;

    if (!roomId) {
      const { data: createdRoom, error: createRoomErr } = await supabase
        .from("rooms")
        .insert({
          area,
          name: roomName,
          sort_order: 1,
        })
        .select("id")
        .single();

      if (createRoomErr || !createdRoom) {
        throw new Error(createRoomErr?.message || "Failed to create room");
      }
      roomId = createdRoom.id;
    }

    // 2. Ensure default items exist for this room
    const targetItems = getRoomDefaultWorkItems(area as AreaSlug, roomName);
    const { data: existingItems } = await supabase
      .from("work_items")
      .select("id, title")
      .eq("room_id", roomId);

    let currentItems = existingItems ?? [];

    if (currentItems.length === 0) {
      const toInsert = targetItems.map((item) => ({
        ...item,
        room_id: roomId,
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from("work_items")
        .insert(toInsert)
        .select("id, title");
      if (insertErr) throw new Error(insertErr.message);
      currentItems = inserted ?? [];
    }

    // 3. Find the target work item
    let targetWorkItemId = itemId;
    const matchByTitle = currentItems.find((i) => i.title.toLowerCase() === itemTitle.toLowerCase());
    const matchById = currentItems.find((i) => i.id === itemId);

    if (matchByTitle) {
      targetWorkItemId = matchByTitle.id;
    } else if (matchById) {
      targetWorkItemId = matchById.id;
    } else {
      // Create missing item
      const itemDef = targetItems.find((t) => t.title.toLowerCase() === itemTitle.toLowerCase()) ?? {
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
      if (newItemErr || !newItem) throw new Error(newItemErr?.message || "Failed to create work item");
      targetWorkItemId = newItem.id;
    }

    // 4. Update the work item
    const patch = {
      status,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      ...(remarks !== undefined ? { remarks } : {}),
    };

    const { error: updateErr } = await supabase
      .from("work_items")
      .update(patch)
      .eq("id", targetWorkItemId);

    if (updateErr) throw new Error(updateErr.message);

    // 5. Insert work_updates log
    await supabase.from("work_updates").insert({
      work_item_id: targetWorkItemId,
      status,
      remarks: remarks ?? null,
      user_id: userId,
    });

    return { success: true, workItemId: targetWorkItemId, roomId };
  });

export const syncDashboardRoomsServerFn = createServerFn({ method: "POST" })
  .handler(async () => {
    // In server environment, we can interact with supabase client or let it succeed gracefully
    return { ok: true };
  });

