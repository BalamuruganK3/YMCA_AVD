-- Add an overall remark column to rooms so staff can post a whole-room note
-- (shown in the secondary dashboard and the Issues dock for both admin & staff).
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS remarks text;

-- Grant write access so authenticated staff can update the overall room remark.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT SELECT ON public.rooms TO anon;
