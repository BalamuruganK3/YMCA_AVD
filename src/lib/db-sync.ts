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
      const mergeClassAreas = ["class-room", "class_room", "class", "classes", "classrooms"];
      if (roomsList.some((r) => mergeClassAreas.includes(r.area))) {
        await supabase.from("rooms").update({ area: "classroom" }).in("area", mergeClassAreas);
        for (const room of roomsList) {
          if (mergeClassAreas.includes(room.area)) room.area = "classroom";
        }
      }

      const roomsToDelete: string[] = [];
      for (const room of roomsList) {
        if (room.area === "server" || room.area === "smart_class") {
          roomsToDelete.push(room.id);
        }
      }

      if (roomsToDelete.length > 0) {
        const { data: workIds } = await supabase.from("work_items").select("id").in("room_id", roomsToDelete);
        const itemIds = (workIds ?? []).map((row) => row.id);
        if (itemIds.length > 0) {
          await supabase.from("work_photos").delete().in("work_item_id", itemIds);
          await supabase.from("work_updates").delete().in("work_item_id", itemIds);
          await supabase.from("work_items").delete().in("id", itemIds);
        }
        await supabase.from("work_photos").delete().in("room_id", roomsToDelete);
        await supabase.from("rooms").delete().in("id", roomsToDelete);
        await supabase.from("area_settings").delete().eq("area", "smart_class");
        await supabase.from("area_settings").delete().eq("source_area", "smart_class");
      }

      for (let i = roomsList.length - 1; i >= 0; i -= 1) {
        if (roomsList[i] && (roomsList[i]!.area === "server" || roomsList[i]!.area === "smart_class")) {
          roomsList.splice(i, 1);
        }
      }

      const settings = await fetchAreaSettings().catch(() => []);
      const retired = retiredBuiltinSlugs(settings);
      const knownAreas = new Set(settings.map((row) => row.area));
      const projectAlreadyStarted = roomsList.length > 0;

      // Seed defaults only on a brand-new project, except Classrooms which replace Smart Class.
      for (const [area, roomNames] of Object.entries(DEFAULT_AREA_ROOMS)) {
        const slug = area as AreaSlug;
        if (retired.has(slug)) continue;
        const areaHasRooms = roomsList.some((r) => r.area === slug);
        const skipEmpty = !areaHasRooms && (projectAlreadyStarted || knownAreas.has(slug));
        const seedClassroomsAsReplacement = slug === "classroom" && !areaHasRooms && !knownAreas.has("classroom");
        if (skipEmpty && !seedClassroomsAsReplacement) {
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
