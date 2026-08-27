-- Staff can save progress in every area tab. Public dashboard can read current status.
-- Keep RLS enabled; authorize writes via user_roles (not user_metadata).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_items TO authenticated;
GRANT SELECT ON public.work_items TO anon;
GRANT SELECT, INSERT ON public.work_updates TO authenticated;
GRANT SELECT ON public.work_updates TO anon;
GRANT SELECT, INSERT ON public.work_photos TO authenticated;
GRANT SELECT ON public.work_photos TO anon;
GRANT SELECT ON public.project_settings TO anon, authenticated;
GRANT UPDATE ON public.project_settings TO authenticated;
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms readable" ON public.rooms;
DROP POLICY IF EXISTS "rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms update" ON public.rooms;
DROP POLICY IF EXISTS "rooms delete" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms read" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms update" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms delete" ON public.rooms;
DROP POLICY IF EXISTS "allow_all_rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "allow_all_rooms_insert" ON public.rooms;
DROP POLICY IF EXISTS "allow_all_rooms_update" ON public.rooms;
DROP POLICY IF EXISTS "allow_all_rooms_delete" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select_public" ON public.rooms;
DROP POLICY IF EXISTS "rooms_write_staff" ON public.rooms;
DROP POLICY IF EXISTS "rooms_insert_staff" ON public.rooms;
DROP POLICY IF EXISTS "rooms_update_staff" ON public.rooms;
DROP POLICY IF EXISTS "rooms_delete_staff" ON public.rooms;

DROP POLICY IF EXISTS "work items readable" ON public.work_items;
DROP POLICY IF EXISTS "staff update work items" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items read" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items insert" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items update" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items delete" ON public.work_items;
DROP POLICY IF EXISTS "work_items_select_public" ON public.work_items;
DROP POLICY IF EXISTS "work_items_write_staff" ON public.work_items;
DROP POLICY IF EXISTS "work_items_insert_staff" ON public.work_items;
DROP POLICY IF EXISTS "work_items_update_staff" ON public.work_items;
DROP POLICY IF EXISTS "work_items_delete_staff" ON public.work_items;

DROP POLICY IF EXISTS "updates readable" ON public.work_updates;
DROP POLICY IF EXISTS "staff insert updates" ON public.work_updates;
DROP POLICY IF EXISTS "allow all work_updates read" ON public.work_updates;
DROP POLICY IF EXISTS "allow all work_updates insert" ON public.work_updates;
DROP POLICY IF EXISTS "work_updates_select_public" ON public.work_updates;
DROP POLICY IF EXISTS "work_updates_insert_staff" ON public.work_updates;

DROP POLICY IF EXISTS "photos readable" ON public.work_photos;
DROP POLICY IF EXISTS "staff insert photos" ON public.work_photos;
DROP POLICY IF EXISTS "allow all work_photos read" ON public.work_photos;
DROP POLICY IF EXISTS "allow all work_photos insert" ON public.work_photos;
DROP POLICY IF EXISTS "work_photos_select_public" ON public.work_photos;
DROP POLICY IF EXISTS "work_photos_insert_staff" ON public.work_photos;

DROP POLICY IF EXISTS "settings readable" ON public.project_settings;
DROP POLICY IF EXISTS "admin update settings" ON public.project_settings;
DROP POLICY IF EXISTS "allow all project_settings read" ON public.project_settings;
DROP POLICY IF EXISTS "allow all project_settings update" ON public.project_settings;
DROP POLICY IF EXISTS "project_settings_select_public" ON public.project_settings;
DROP POLICY IF EXISTS "project_settings_update_admin" ON public.project_settings;

CREATE POLICY "rooms_select_public" ON public.rooms
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rooms_insert_staff" ON public.rooms
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rooms_update_staff" ON public.rooms
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rooms_delete_staff" ON public.rooms
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "work_items_select_public" ON public.work_items
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "work_items_insert_staff" ON public.work_items
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "work_items_update_staff" ON public.work_items
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "work_items_delete_staff" ON public.work_items
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "work_updates_select_public" ON public.work_updates
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "work_updates_insert_staff" ON public.work_updates
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "work_photos_select_public" ON public.work_photos
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "work_photos_insert_staff" ON public.work_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "project_settings_select_public" ON public.project_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "project_settings_update_admin" ON public.project_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

UPDATE public.rooms SET name = 'Staff Room' WHERE area = 'staff_room' AND name = 'Staff Room 1'
  AND NOT EXISTS (SELECT 1 FROM public.rooms r2 WHERE r2.area = 'staff_room' AND r2.name = 'Staff Room');
UPDATE public.rooms SET name = 'CS lab' WHERE area = 'lab' AND name = 'Lab 1'
  AND NOT EXISTS (SELECT 1 FROM public.rooms r2 WHERE r2.area = 'lab' AND r2.name = 'CS lab');
UPDATE public.rooms SET name = 'Bio lab' WHERE area = 'lab' AND name = 'Lab 2'
  AND NOT EXISTS (SELECT 1 FROM public.rooms r2 WHERE r2.area = 'lab' AND r2.name = 'Bio lab');
UPDATE public.rooms SET name = 'Chem lab' WHERE area = 'lab' AND name = 'Lab 3'
  AND NOT EXISTS (SELECT 1 FROM public.rooms r2 WHERE r2.area = 'lab' AND r2.name = 'Chem lab');
UPDATE public.rooms SET name = 'Phy lab' WHERE area = 'lab' AND name = 'Lab 4'
  AND NOT EXISTS (SELECT 1 FROM public.rooms r2 WHERE r2.area = 'lab' AND r2.name = 'Phy lab');
UPDATE public.rooms SET name = 'stem lab' WHERE area = 'lab' AND name = 'Lab 5'
  AND NOT EXISTS (SELECT 1 FROM public.rooms r2 WHERE r2.area = 'lab' AND r2.name = 'stem lab');

DELETE FROM public.rooms WHERE area = 'server';
DELETE FROM public.rooms WHERE area = 'staff_room' AND name IN ('Staff Room 2', 'Staff Room 3', 'Staff Room 4', 'Staff Room 5');
DELETE FROM public.rooms WHERE area = 'lab' AND name IN ('Lab 1', 'Lab 2', 'Lab 3', 'Lab 4', 'Lab 5');

INSERT INTO public.rooms (area, name, sort_order)
SELECT v.area, v.name, v.sort_order
FROM (VALUES
  ('smart_class', 'Smart Class 1', 1),
  ('smart_class', 'Smart Class 2', 2),
  ('smart_class', 'Smart Class 3', 3),
  ('smart_class', 'Smart Class 4', 4),
  ('smart_class', 'Smart Class 5', 5),
  ('smart_class', 'Smart Class 6', 6),
  ('smart_class', 'Smart Class 7', 7),
  ('smart_class', 'Smart Class 8', 8),
  ('smart_class', 'Smart Class 9', 9),
  ('smart_class', 'Smart Class 10', 10),
  ('smart_class', 'Smart Class 11', 11),
  ('smart_class', 'Smart Class 12', 12),
  ('smart_class', 'Smart Class 13', 13),
  ('smart_class', 'Smart Class 14', 14),
  ('lab', 'CS lab', 1),
  ('lab', 'Bio lab', 2),
  ('lab', 'Chem lab', 3),
  ('lab', 'Phy lab', 4),
  ('lab', 'stem lab', 5),
  ('staff_room', 'Staff Room', 1),
  ('control_room', 'Control Room', 1),
  ('library', 'Library', 1),
  ('entrance_corridor', 'Entrance Corridor', 1),
  ('principal_room', 'Principal Room', 1),
  ('admin_room', 'Admin Room', 1),
  ('record_store_room', 'Record Store Room', 1),
  ('medical_room', 'Medical Room', 1),
  ('pet_room', 'PET Room', 1),
  ('play_area', 'Play Area', 1)
) AS v(area, name, sort_order)
ON CONFLICT (area, name) DO UPDATE SET sort_order = EXCLUDED.sort_order;
