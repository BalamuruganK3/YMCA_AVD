-- Permanently remove Smart Class and fold custom class types into Classrooms.

DELETE FROM public.work_photos
WHERE room_id IN (SELECT id FROM public.rooms WHERE area = 'smart_class')
   OR work_item_id IN (
     SELECT wi.id FROM public.work_items wi
     JOIN public.rooms r ON r.id = wi.room_id
     WHERE r.area = 'smart_class'
   );

DELETE FROM public.work_updates
WHERE work_item_id IN (
  SELECT wi.id FROM public.work_items wi
  JOIN public.rooms r ON r.id = wi.room_id
  WHERE r.area = 'smart_class'
);

DELETE FROM public.work_items
WHERE room_id IN (SELECT id FROM public.rooms WHERE area = 'smart_class');

DELETE FROM public.rooms WHERE area = 'smart_class';
DELETE FROM public.area_settings WHERE area = 'smart_class' OR source_area = 'smart_class';

UPDATE public.rooms
SET area = 'classroom'
WHERE area IN ('class-room', 'class_room', 'class', 'classes', 'classrooms');

INSERT INTO public.area_settings (area, label, image_url, source_area, updated_at)
SELECT 'classroom', 'CLASSROOMS', s.image_url, 'classroom', now()
FROM public.area_settings s
WHERE s.area IN ('class-room', 'class_room', 'class', 'classes', 'classrooms')
ON CONFLICT (area) DO UPDATE
SET image_url = COALESCE(public.area_settings.image_url, EXCLUDED.image_url),
    source_area = 'classroom',
    updated_at = now();

DELETE FROM public.area_settings
WHERE area IN ('class-room', 'class_room', 'class', 'classes', 'classrooms');
