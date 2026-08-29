import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_AREA_ROOMS, AreaSlug, AREAS, areaLabel } from "./constants";
import { getRoomDefaultWorkItems } from "./room-tasks";
import { fetchAreaSettings, retiredBuiltinSlugs, upsertAreaSetting } from "./area-catalog";

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

      // Remove obsolete server rooms only. Staff-created rooms (any name) are preserved
      // so newly added rooms stay on the dashboard.
      for (const room of roomsList) {
        if (room.area === "server") {
          roomsToDelete.push(room.id);
        }
      }

      if (roomsToDelete.length > 0) {
        await supabase.from("rooms").delete().in("id", roomsToDelete);
      }

      const settings = await fetchAreaSettings().catch(() => []);
      const retired = retiredBuiltinSlugs(settings);
      const knownAreas = new Set(settings.map((row) => row.area));
      const projectAlreadyStarted = roomsList.some((r) => r.area !== "server");

      // Seed defaults only on a brand-new project. If staff deleted every Smart Class
      // (or any other type), that area stays empty after refresh.
      for (const [area, roomNames] of Object.entries(DEFAULT_AREA_ROOMS)) {
        const slug = area as AreaSlug;
        if (retired.has(slug)) continue;
        const areaHasRooms = roomsList.some((r) => r.area === slug);
        if (!areaHasRooms && (projectAlreadyStarted || knownAreas.has(slug))) {
          continue;
        }

        let seededThisArea = false;

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
          let justCreated = false;

          if (!roomId && !areaHasRooms) {
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
              justCreated = true;
              seededThisArea = true;
              roomsList.push({ id: created.id, area: slug, name: roomName });
            }
          }

          if (roomId && justCreated) {
            const currentRoomId = roomId;
            const targetItems = getRoomDefaultWorkItems(slug, roomName);
            const toInsert = targetItems.map((item) => ({
              ...item,
              room_id: currentRoomId,
            }));
            if (toInsert.length > 0) {
              await supabase.from("work_items").insert(toInsert);
            }
          }
        }

        if (seededThisArea) {
          await upsertAreaSetting({
            area: slug,
            label: AREAS.find((a) => a.slug === slug)?.label ?? areaLabel(slug),
            source_area: slug,
          }).catch(() => undefined);
          knownAreas.add(slug);
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
