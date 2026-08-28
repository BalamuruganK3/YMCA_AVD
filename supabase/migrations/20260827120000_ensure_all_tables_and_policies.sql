-- Migration: Ensure all required tables exist and have proper RLS policies
-- This fixes "table not exist" errors when saving work item status and other operations

-- 1. Ensure work_updates table exists and has proper policies
CREATE TABLE IF NOT EXISTS public.work_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  status text NOT NULL,
  remarks text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Ensure work_photos table exists and has proper policies
CREATE TABLE IF NOT EXISTS public.work_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid REFERENCES public.work_items(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  drive_file_id text,
  drive_view_url text,
  drive_thumbnail_url text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Ensure project_settings table exists
CREATE TABLE IF NOT EXISTS public.project_settings (
  id int PRIMARY KEY DEFAULT 1,
  deadline date NOT NULL DEFAULT (now() + interval '60 days')::date,
  project_name text NOT NULL DEFAULT 'Facility Works',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

-- Insert default project settings if not exists
INSERT INTO public.project_settings (id)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM public.project_settings WHERE id = 1);

-- 4. Grant comprehensive permissions to all tables
GRANT ALL ON public.work_updates TO authenticated, anon, service_role;
GRANT ALL ON public.work_photos TO authenticated, anon, service_role;
GRANT ALL ON public.project_settings TO authenticated, anon, service_role;

-- 5. Enable RLS on all tables
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;

-- 6. Drop existing policies if they exist
DROP POLICY IF EXISTS "updates readable" ON public.work_updates;
DROP POLICY IF EXISTS "staff insert updates" ON public.work_updates;
DROP POLICY IF EXISTS "allow all work_updates read" ON public.work_updates;
DROP POLICY IF EXISTS "allow all work_updates insert" ON public.work_updates;

DROP POLICY IF EXISTS "photos readable" ON public.work_photos;
DROP POLICY IF EXISTS "staff insert photos" ON public.work_photos;
DROP POLICY IF EXISTS "allow all work_photos read" ON public.work_photos;
DROP POLICY IF EXISTS "allow all work_photos insert" ON public.work_photos;

DROP POLICY IF EXISTS "settings readable" ON public.project_settings;
DROP POLICY IF EXISTS "admin update settings" ON public.project_settings;
DROP POLICY IF EXISTS "allow all project_settings read" ON public.project_settings;
DROP POLICY IF EXISTS "allow all project_settings update" ON public.project_settings;

-- 7. Create comprehensive RLS policies for all tables
-- work_updates policies
CREATE POLICY "allow all work_updates read" ON public.work_updates FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_updates insert" ON public.work_updates FOR INSERT TO authenticated, anon WITH CHECK (true);

-- work_photos policies
CREATE POLICY "allow all work_photos read" ON public.work_photos FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_photos insert" ON public.work_photos FOR INSERT TO authenticated, anon WITH CHECK (true);

-- project_settings policies
CREATE POLICY "allow all project_settings read" ON public.project_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all project_settings update" ON public.project_settings FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- 8. Ensure rooms and work_items tables have proper RLS policies
DROP POLICY IF EXISTS "allow all rooms read" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms update" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms delete" ON public.rooms;

DROP POLICY IF EXISTS "allow all work_items read" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items insert" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items update" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items delete" ON public.work_items;

CREATE POLICY "allow all rooms read" ON public.rooms FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all rooms insert" ON public.rooms FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all rooms update" ON public.rooms FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all rooms delete" ON public.rooms FOR DELETE TO authenticated, anon USING (true);

CREATE POLICY "allow all work_items read" ON public.work_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_items insert" ON public.work_items FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all work_items update" ON public.work_items FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all work_items delete" ON public.work_items FOR DELETE TO authenticated, anon USING (true);