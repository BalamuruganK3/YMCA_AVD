-- Migration: Rename single-room facility areas to remove trailing ' 1'

UPDATE public.rooms SET name = 'Staff Room' WHERE area = 'staff_room' AND name = 'Staff Room 1';
UPDATE public.rooms SET name = 'Control Room' WHERE area = 'control_room' AND name = 'Control Room 1';
UPDATE public.rooms SET name = 'Library' WHERE area = 'library' AND name = 'Library 1';
UPDATE public.rooms SET name = 'Entrance Corridor' WHERE area = 'entrance_corridor' AND name = 'Entrance Corridor 1';
UPDATE public.rooms SET name = 'Principal Room' WHERE area = 'principal_room' AND name = 'Principal Room 1';
UPDATE public.rooms SET name = 'Admin Room' WHERE area = 'admin_room' AND name = 'Admin Room 1';
UPDATE public.rooms SET name = 'Record Store Room' WHERE area = 'record_store_room' AND name = 'Record Store Room 1';
UPDATE public.rooms SET name = 'Medical Room' WHERE area = 'medical_room' AND name = 'Medical Room 1';
UPDATE public.rooms SET name = 'PET Room' WHERE area = 'pet_room' AND name = 'PET Room 1';
UPDATE public.rooms SET name = 'Play Area' WHERE area = 'play_area' AND name = 'Play Area 1';
