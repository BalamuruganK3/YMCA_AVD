-- Dashboard copy, room remarks, product counts, and per-area labels/images.
ALTER TABLE public.project_settings
  ADD COLUMN IF NOT EXISTS dashboard_title text NOT NULL DEFAULT 'Dashboard',
  ADD COLUMN IF NOT EXISTS dashboard_subtitle text NOT NULL DEFAULT '';

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS remarks text;

ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.area_settings (
  area text PRIMARY KEY,
  label text NOT NULL,
  image_url text,
  source_area text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.area_settings ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.area_settings TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "area_settings_select_public" ON public.area_settings;
DROP POLICY IF EXISTS "area_settings_write" ON public.area_settings;
CREATE POLICY "area_settings_select_public" ON public.area_settings
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "area_settings_write" ON public.area_settings
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('area-images', 'area-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "area_images_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "area_images_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "area_images_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "area_images_storage_delete" ON storage.objects;

CREATE POLICY "area_images_storage_select"
  ON storage.objects FOR SELECT TO authenticated, anon
  USING (bucket_id = 'area-images');
CREATE POLICY "area_images_storage_insert"
  ON storage.objects FOR INSERT TO authenticated, anon
  WITH CHECK (bucket_id = 'area-images');
CREATE POLICY "area_images_storage_update"
  ON storage.objects FOR UPDATE TO authenticated, anon
  USING (bucket_id = 'area-images') WITH CHECK (bucket_id = 'area-images');
CREATE POLICY "area_images_storage_delete"
  ON storage.objects FOR DELETE TO authenticated, anon
  USING (bucket_id = 'area-images');
