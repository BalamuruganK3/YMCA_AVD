-- Staff can save dashboard title/subtitle (update previously required admin role,
-- so the editor saved 0 rows with no error).
DROP POLICY IF EXISTS "project_settings_update_admin" ON public.project_settings;

CREATE POLICY "project_settings_update_staff" ON public.project_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin'));
