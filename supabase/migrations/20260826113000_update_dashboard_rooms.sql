-- Migration: Update dashboard rooms & areas according to new layout requirements

-- 1. Remove obsolete staff rooms (Staff Room 2..5)
DELETE FROM public.rooms WHERE area = 'staff_room' AND name IN ('Staff Room 2', 'Staff Room 3', 'Staff Room 4', 'Staff Room 5');

-- 2. Remove obsolete server rooms / replace with control_room
DELETE FROM public.rooms WHERE area = 'server';
DELETE FROM public.rooms WHERE area = 'control_room';

-- 3. Delete old generic lab rooms
DELETE FROM public.rooms WHERE area = 'lab';

-- 4. Update or Insert desired rooms for all areas
DO $$
DECLARE
  r_id uuid;
BEGIN
  -- Insert/Ensure Smart Classes 1 to 14
  FOR i IN 1..14 LOOP
    INSERT INTO public.rooms (area, name, sort_order)
    VALUES ('smart_class', 'Smart Class ' || i, i)
    ON CONFLICT (area, name) DO UPDATE SET sort_order = EXCLUDED.sort_order
    RETURNING id INTO r_id;

    -- Add default work items if none exist
    IF NOT EXISTS (SELECT 1 FROM public.work_items WHERE room_id = r_id) THEN
      INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
        (r_id, 'Civil Work', 'False Ceiling', 'Plain False Ceiling', 'work', 1),
        (r_id, 'Civil Work', 'Painting', 'Wall Painting', 'work', 2),
        (r_id, 'Civil Work', 'Flooring', 'Floor Tiles', 'work', 3),
        (r_id, 'Electrical', 'Wiring', 'Power Wiring', 'work', 4),
        (r_id, 'Electrical', 'Lighting', 'LED Panel Lights', 'work', 5),
        (r_id, 'Furniture', NULL, 'Tables', 'material', 6),
        (r_id, 'Furniture', NULL, 'Chairs', 'material', 7),
        (r_id, 'Equipment', NULL, 'Interactive Panel', 'material', 8);
    END IF;
  END LOOP;

  -- Labs: CS lab, Bio lab, Chem lab, Phy lab, stem lab
  FOR r_name, i IN VALUES ('CS lab', 1), ('Bio lab', 2), ('Chem lab', 3), ('Phy lab', 4), ('stem lab', 5) LOOP
    INSERT INTO public.rooms (area, name, sort_order)
    VALUES ('lab', r_name, i)
    ON CONFLICT (area, name) DO UPDATE SET sort_order = EXCLUDED.sort_order
    RETURNING id INTO r_id;

    IF NOT EXISTS (SELECT 1 FROM public.work_items WHERE room_id = r_id) THEN
      INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
        (r_id, 'Civil Work', 'False Ceiling', 'Plain False Ceiling', 'work', 1),
        (r_id, 'Civil Work', 'Painting', 'Wall Painting', 'work', 2),
        (r_id, 'Civil Work', 'Flooring', 'Floor Tiles', 'work', 3),
        (r_id, 'Electrical', 'Wiring', 'Power Wiring', 'work', 4),
        (r_id, 'Electrical', 'Lighting', 'LED Panel Lights', 'work', 5),
        (r_id, 'Furniture', NULL, 'Tables', 'material', 6),
        (r_id, 'Furniture', NULL, 'Chairs', 'material', 7),
        (r_id, 'Equipment', NULL, 'Interactive Panel', 'material', 8);
    END IF;
  END LOOP;

  -- Single rooms
  FOR r_area, r_name IN VALUES
    ('staff_room', 'Staff Room 1'),
    ('control_room', 'Control Room 1'),
    ('library', 'Library 1'),
    ('entrance_corridor', 'Entrance Corridor 1'),
    ('principal_room', 'Principal Room 1'),
    ('admin_room', 'Admin Room 1'),
    ('record_store_room', 'Record Store Room 1'),
    ('medical_room', 'Medical Room 1'),
    ('pet_room', 'PET Room 1'),
    ('play_area', 'Play Area 1')
  LOOP
    INSERT INTO public.rooms (area, name, sort_order)
    VALUES (r_area, r_name, 1)
    ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
    RETURNING id INTO r_id;

    IF NOT EXISTS (SELECT 1 FROM public.work_items WHERE room_id = r_id) THEN
      INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
        (r_id, 'Civil Work', 'False Ceiling', 'Plain False Ceiling', 'work', 1),
        (r_id, 'Civil Work', 'Painting', 'Wall Painting', 'work', 2),
        (r_id, 'Civil Work', 'Flooring', 'Floor Tiles', 'work', 3),
        (r_id, 'Electrical', 'Wiring', 'Power Wiring', 'work', 4),
        (r_id, 'Electrical', 'Lighting', 'LED Panel Lights', 'work', 5),
        (r_id, 'Furniture', NULL, 'Tables', 'material', 6),
        (r_id, 'Furniture', NULL, 'Chairs', 'material', 7),
        (r_id, 'Equipment', NULL, 'Interactive Panel', 'material', 8);
    END IF;
  END LOOP;
END $$;
