-- Overall room remarks + delete policies so staff can save notes and remove rooms.
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS remarks text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_items TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_updates TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_photos TO authenticated, anon, service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all rooms read" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms update" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms delete" ON public.rooms;
CREATE POLICY "allow all rooms read" ON public.rooms FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all rooms insert" ON public.rooms FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all rooms update" ON public.rooms FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all rooms delete" ON public.rooms FOR DELETE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "allow all work_items read" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items insert" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items update" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items delete" ON public.work_items;
CREATE POLICY "allow all work_items read" ON public.work_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_items insert" ON public.work_items FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all work_items update" ON public.work_items FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all work_items delete" ON public.work_items FOR DELETE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "allow all work_updates read" ON public.work_updates;
DROP POLICY IF EXISTS "allow all work_updates insert" ON public.work_updates;
DROP POLICY IF EXISTS "allow all work_updates delete" ON public.work_updates;
CREATE POLICY "allow all work_updates read" ON public.work_updates FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_updates insert" ON public.work_updates FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all work_updates delete" ON public.work_updates FOR DELETE TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "allow all work_photos read" ON public.work_photos;
DROP POLICY IF EXISTS "allow all work_photos insert" ON public.work_photos;
DROP POLICY IF EXISTS "allow all work_photos delete" ON public.work_photos;
CREATE POLICY "allow all work_photos read" ON public.work_photos FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_photos insert" ON public.work_photos FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all work_photos delete" ON public.work_photos FOR DELETE TO authenticated, anon USING (true);

NOTIFY pgrst, 'reload schema';
