INSERT INTO storage.buckets (id, name, public)
VALUES ('work-photos', 'work-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "work_photos_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "work_photos_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "work_photos_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "work_photos_storage_delete" ON storage.objects;

CREATE POLICY "work_photos_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'work-photos');

CREATE POLICY "work_photos_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'work-photos');

CREATE POLICY "work_photos_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'work-photos') WITH CHECK (bucket_id = 'work-photos');

CREATE POLICY "work_photos_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'work-photos');
