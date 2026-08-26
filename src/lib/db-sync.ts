import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AREA_ROOMS, AreaSlug } from "./constants";
import { getRoomDefaultWorkItems } from "./room-tasks";

let syncInProgress: Promise<void> | null = null;
let hasSynced = false;

export async function syncDashboardRooms() {
  if (hasSynced) return;
  if (syncInProgress) return syncInProgress;

  syncInProgress = (async () => {
    try {
      // 1. Fetch current rooms from DB
      const { data: existingRooms, error: fetchErr } = await supabase
        .from("rooms")
        .select("id, area, name");

      if (fetchErr) throw fetchErr;

      const roomsList = existingRooms ?? [];
      const roomsToDelete: string[] = [];

      // Remove obsolete server rooms & obsolete staff rooms (Staff Room 2-5)
      for (const room of roomsList) {
        if (room.area === "server") {
          roomsToDelete.push(room.id);
        } else if (
          room.area === "staff_room" &&
          ["Staff Room 2", "Staff Room 3", "Staff Room 4", "Staff Room 5"].includes(room.name)
        ) {
          roomsToDelete.push(room.id);
        } else if (
          room.area === "lab" &&
          !DEFAULT_AREA_ROOMS.lab.includes(room.name)
        ) {
          roomsToDelete.push(room.id);
        }
      }

      if (roomsToDelete.length > 0) {
        await supabase.from("rooms").delete().in("id", roomsToDelete);
      }

      // 2. Ensure all required rooms exist & have updated work items
      for (const [area, roomNames] of Object.entries(DEFAULT_AREA_ROOMS)) {
        const slug = area as AreaSlug;
        for (let idx = 0; idx < roomNames.length; idx++) {
          const roomName = roomNames[idx];
          if (!roomName) continue;
          let existing = roomsList.find((r) => r.area === slug && r.name === roomName);
          if (!existing) {
            const oldNamed = roomsList.find((r) => r.area === slug && r.name === `${roomName} 1`);
            if (oldNamed) {
              await supabase.from("rooms").update({ name: roomName }).eq("id", oldNamed.id);
              existing = { ...oldNamed, name: roomName };
            }
          }

          let roomId = existing?.id;

          if (!roomId) {
            const { data: created, error: createErr } = await supabase
              .from("rooms")
              .insert({
                area: slug,
                name: roomName,
                sort_order: idx + 1,
              })
              .select("id")
              .single();

            if (!createErr && created) {
              roomId = created.id;
            }
          }

          if (roomId) {
            const currentRoomId = roomId;
            const targetItems = getRoomDefaultWorkItems(slug, roomName);

            // Fetch existing items for this room
            const { data: currentItems } = await supabase
              .from("work_items")
              .select("id, title")
              .eq("room_id", currentRoomId);

            const existingTitles = new Set((currentItems ?? []).map((i) => i.title));
            const targetTitles = new Set(targetItems.map((i) => i.title));

            const isNonSmartClass = slug !== "smart_class";
            const hasOldGenericOnly = isNonSmartClass && (currentItems ?? []).some(
              (i) => (i.title === "LED Panel Lights" || i.title === "Interactive Panel") && !targetTitles.has(i.title)
            );
            const hasOldTitlesWithParens = isNonSmartClass && (currentItems ?? []).some((i) => i.title.includes("("));

            if (!currentItems || currentItems.length === 0 || hasOldGenericOnly || hasOldTitlesWithParens) {
              if (currentItems && currentItems.length > 0) {
                await supabase.from("work_items").delete().eq("room_id", currentRoomId);
              }

              const workItemsToInsert = targetItems.map((item) => ({
                ...item,
                room_id: currentRoomId,
              }));

              await supabase.from("work_items").insert(workItemsToInsert);
            } else {
              // Insert any missing target items
              const missingItems = targetItems.filter((ti) => !existingTitles.has(ti.title));
              if (missingItems.length > 0) {
                const toInsert = missingItems.map((item) => ({
                  ...item,
                  room_id: currentRoomId,
                }));
                await supabase.from("work_items").insert(toInsert);
              }
            }
          }
        }
      }

      // 3. Update project_name to AV DYNAMICS PRIVATE LIMITED if currently default
      await supabase
        .from("project_settings")
        .update({ project_name: "AV DYNAMICS PRIVATE LIMITED" })
        .eq("id", 1);

      hasSynced = true;
    } catch (err) {
      console.warn("DB auto-sync encountered an error:", err);
    } finally {
      syncInProgress = null;
    }
  })();

  return syncInProgress;
}
