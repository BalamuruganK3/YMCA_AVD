-- Migration: Fix RLS policies and update all room tasks with clean titles and category headings (no parentheses in titles)

-- 1. Grant full access
GRANT ALL ON public.rooms TO authenticated, anon, service_role;
GRANT ALL ON public.work_items TO authenticated, anon, service_role;
GRANT ALL ON public.work_updates TO authenticated, anon, service_role;
GRANT ALL ON public.work_photos TO authenticated, anon, service_role;
GRANT ALL ON public.project_settings TO authenticated, anon, service_role;

-- 2. Drop existing restrictive policies on rooms and work_items
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('rooms', 'work_items') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 3. Create open RLS policies
CREATE POLICY "allow_all_rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "allow_all_rooms_insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_rooms_update" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rooms_delete" ON public.rooms FOR DELETE USING (true);

CREATE POLICY "allow_all_work_items_select" ON public.work_items FOR SELECT USING (true);
CREATE POLICY "allow_all_work_items_insert" ON public.work_items FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_work_items_update" ON public.work_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_work_items_delete" ON public.work_items FOR DELETE USING (true);

-- 4. Delete obsolete rooms and obsolete items
DELETE FROM public.rooms WHERE area = 'server';
DELETE FROM public.rooms WHERE area = 'staff_room' AND name IN ('Staff Room 2', 'Staff Room 3', 'Staff Room 4', 'Staff Room 5');

-- 5. Insert/Ensure all rooms and all specific work items with clean titles
DO $$
DECLARE
  r_id uuid;
BEGIN
  -- Smart Class 1 to 14
  FOR i IN 1..14 LOOP
    INSERT INTO public.rooms (area, name, sort_order)
    VALUES ('smart_class', 'Smart Class ' || i, i)
    ON CONFLICT (area, name) DO UPDATE SET sort_order = EXCLUDED.sort_order
    RETURNING id INTO r_id;

    IF NOT EXISTS (SELECT 1 FROM public.work_items WHERE room_id = r_id) THEN
      INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
        (r_id, 'Civil Work', 'False Ceiling', 'Plain False Ceiling', 'work', 1),
        (r_id, 'Civil Work', 'Painting', 'Wall Painting', 'work', 2),
        (r_id, 'Civil Work', 'Flooring', 'Floor Tiles', 'work', 3),
        (r_id, 'Electrical Work', 'Wiring', 'Power Wiring', 'work', 4),
        (r_id, 'Electrical Work', 'Lighting', 'LED Panel Lights', 'work', 5),
        (r_id, 'Furniture', NULL, 'Tables', 'material', 6),
        (r_id, 'Furniture', NULL, 'Chairs', 'material', 7),
        (r_id, 'Equipment', NULL, 'Interactive Panel', 'material', 8);
    END IF;
  END LOOP;

  -- Control Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('control_room', 'Control Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Civil Work', 'Top Finish', 'False Flooring', 'work', 5),
    (r_id, 'Carpentry Work', NULL, 'Work Station Table', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Revolving Chair', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Storage Rack', 'material', 8),
    (r_id, 'Electrical Work', 'Electrical', 'Raw Material', 'material', 9),
    (r_id, 'Electrical Work', 'Electrical', 'PVC conduit', 'work', 10),
    (r_id, 'Electrical Work', 'Electrical', 'Light points', 'work', 11),
    (r_id, 'Electrical Work', 'Electrical', 'Power sockets', 'work', 12),
    (r_id, 'Electrical Work', 'Electrical', 'AC point', 'work', 13),
    (r_id, 'Electrical Work', 'Lighting', 'Light Fixes', 'work', 14),
    (r_id, 'Electrical Work', 'Lighting', 'Cove light', 'material', 15),
    (r_id, 'Electrical Work', 'Lighting', 'Source light', 'material', 16),
    (r_id, 'Electrical Work', 'Lighting', 'Profile light', 'material', 17),
    (r_id, 'Electrical Work', 'Equipment', 'AC', 'material', 18),
    (r_id, 'Electrical Work', 'Equipment', 'White fan', 'material', 19),
    (r_id, 'Server Work', 'Server & Network', 'Main School server', 'material', 20),
    (r_id, 'Server Work', 'Server & Network', 'Server router', 'material', 21),
    (r_id, 'Server Work', 'Server & Network', 'Server rack', 'material', 22),
    (r_id, 'Server Work', 'Hardware', 'Monitor and PC', 'material', 23),
    (r_id, 'Server Work', 'Equipment', 'Inverter AC', 'material', 24),
    (r_id, 'Server Work', 'Server & Network', 'Layer 2 switch', 'material', 25);

  -- CS Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'CS lab', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Material', 'Systems', 'Computer system for students', 'material', 1),
    (r_id, 'Material', 'Systems', 'Computer system for teacher', 'material', 2),
    (r_id, 'Material', 'Networking', '24 Port managed switch', 'material', 3),
    (r_id, 'Material', 'Networking', 'WIFI 6 AP', 'material', 4),
    (r_id, 'Material', 'Networking', 'Cat6A Network data Point', 'work', 5),
    (r_id, 'Material', 'Networking', '24 port Cat6 Patch Panel', 'material', 6),
    (r_id, 'Material', 'Networking', '12U Server Rack', 'material', 7),
    (r_id, 'Material', 'Storage', 'NAS Storage 2 TB', 'material', 8),
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 9),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work', 'work', 10),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 11),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 12),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in Tamil', 'work', 13),
    (r_id, 'Carpentry Work', NULL, 'Computer table', 'material', 14),
    (r_id, 'Carpentry Work', NULL, 'Students chair', 'material', 15),
    (r_id, 'Carpentry Work', NULL, 'Teacher table', 'material', 16),
    (r_id, 'Carpentry Work', NULL, 'Teacher chair', 'material', 17),
    (r_id, 'Carpentry Work', NULL, 'Side table', 'material', 18),
    (r_id, 'Carpentry Work', NULL, 'Storage table with lock & key for interactive board', 'material', 19),
    (r_id, 'Carpentry Work', NULL, 'Storage table with lock & key', 'material', 20),
    (r_id, 'Carpentry Work', NULL, 'Wall storage with lock and key', 'material', 21),
    (r_id, 'Carpentry Work', NULL, 'Rafel metal door', 'material', 22);

  -- Phy Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'Phy lab', 2)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 2
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in Tamil', 'work', 5),
    (r_id, 'Carpentry Work', NULL, 'Workstation table & power sockets', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Workstation table floor mat', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Teacher table', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Teacher chair', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Side table', 'material', 10),
    (r_id, 'Carpentry Work', NULL, 'Storage table with lock & key', 'material', 11),
    (r_id, 'Carpentry Work', NULL, 'Wall storage with lock & key partially glazed', 'material', 12),
    (r_id, 'Carpentry Work', NULL, 'Rafel Metal door', 'material', 13);

  -- Chem Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'Chem lab', 3)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 3
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in Tamil', 'work', 5),
    (r_id, 'Carpentry Work', NULL, 'Workstation table With Sink & Power Sockets', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Teacher table', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Teacher chair', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Side table', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Storage table with lock & key Below of Interactive Board', 'material', 10),
    (r_id, 'Carpentry Work', NULL, 'Storage table with lock & key', 'material', 11),
    (r_id, 'Carpentry Work', NULL, 'Wall storage with lock & key partially glazed', 'material', 12),
    (r_id, 'Carpentry Work', NULL, 'Rafel Metal door', 'material', 13),
    (r_id, 'Carpentry Work', NULL, 'Gas pipeline', 'work', 14),
    (r_id, 'Carpentry Work', NULL, 'Gas Pipeline Connectors', 'material', 15);

  -- Bio Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'Bio lab', 4)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 4
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in Tamil', 'work', 5),
    (r_id, 'Carpentry Work', NULL, 'Workstation table & power sockets with sink', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Workstation table floor mat', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Teacher table', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Teacher chair', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Side table', 'material', 10),
    (r_id, 'Carpentry Work', NULL, 'Storage table with lock & key Below of Interactive Board', 'material', 11),
    (r_id, 'Carpentry Work', NULL, 'Wall storage with lock & key partially glazed', 'material', 12),
    (r_id, 'Carpentry Work', NULL, 'Rafel Metal door', 'material', 13);

  -- Stem Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'stem lab', 5)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 5
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in Tamil', 'work', 5),
    (r_id, 'Carpentry Work', NULL, 'Workstation table', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Students chair', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Rubber mat for table', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Teacher table', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Side table', 'material', 10),
    (r_id, 'Carpentry Work', NULL, 'Wall storage with lock & key partially glazed', 'material', 11),
    (r_id, 'Carpentry Work', NULL, 'Rafel Metal door', 'material', 12);

  -- Library Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('library', 'Library 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in Tamil', 'work', 5),
    (r_id, 'Carpentry Work', NULL, 'Optimize study table', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Students chair', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Teacher table', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Teacher chair', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Side table', 'material', 10),
    (r_id, 'Carpentry Work', NULL, 'Wise book case', 'material', 11),
    (r_id, 'Carpentry Work', NULL, 'Rafel metal door', 'material', 12),
    (r_id, 'System', NULL, 'Computer system', 'material', 13),
    (r_id, 'System', NULL, 'Barcode reader', 'material', 14);

  -- Staff Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('staff_room', 'Staff Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra Blind', 'material', 4),
    (r_id, 'Carpentry Work', NULL, 'Teachers table with popup box', 'material', 5),
    (r_id, 'Carpentry Work', NULL, 'Teachers chair', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Locker box', 'material', 7);

  -- Entrance Corridor
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('entrance_corridor', 'Entrance Corridor 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed acrylic wording', 'work', 4),
    (r_id, 'Reception Area', NULL, 'Computer system for reception', 'material', 5),
    (r_id, 'Reception Area', NULL, 'Reception table', 'material', 6),
    (r_id, 'Reception Area', NULL, 'Reception back wall panel', 'material', 7),
    (r_id, 'Reception Area', NULL, 'Chair', 'material', 8),
    (r_id, 'Reception Area', NULL, 'Loose furniture', 'material', 9),
    (r_id, 'Reception Area', NULL, 'Artifact', 'material', 10);

  -- Principal Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('principal_room', 'Principal Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Multi level false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium acrylic emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain premium acrylic emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra blind', 'material', 4),
    (r_id, 'Carpentry Work', NULL, 'Backwall panaling', 'material', 5),
    (r_id, 'Carpentry Work', NULL, 'Open book rack', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Credenza', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Rafel metal door', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Principal table', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Principal executive chair', 'material', 10),
    (r_id, 'Carpentry Work', NULL, 'Visitor sofa', 'material', 11);

  -- Admin Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('admin_room', 'Admin Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Multi level false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium acrylic emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain premium acrylic emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra blind', 'material', 4),
    (r_id, 'Carpentry Work', NULL, 'Backwall panaling', 'material', 5),
    (r_id, 'Carpentry Work', NULL, 'Open book rack', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Credenza', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Reception table', 'material', 8),
    (r_id, 'Carpentry Work', NULL, 'Rolling chair', 'material', 9),
    (r_id, 'Carpentry Work', NULL, 'Visitor chair', 'material', 10);

  -- Record Store Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('record_store_room', 'Record Store Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Multi level false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium acrylic emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain premium acrylic emulsion', 'work', 3),
    (r_id, 'Civil Work', 'Blackout Blinds', 'Zebra blind', 'material', 4),
    (r_id, 'Carpentry Work', NULL, 'Waller book case', 'material', 5),
    (r_id, 'Carpentry Work', NULL, 'Wise book case', 'material', 6);

  -- Medical Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('medical_room', 'Medical Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Multi level false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium acrylic emulsion', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain premium acrylic emulsion', 'work', 3),
    (r_id, 'Carpentry Work', NULL, 'Lean to wall running table', 'material', 4),
    (r_id, 'Carpentry Work', NULL, 'Visitor chair', 'material', 5),
    (r_id, 'Carpentry Work', NULL, 'Refrigerator', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Patient bed set', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Rafel metal door', 'material', 8);

  -- PET Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('pet_room', 'PET Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'Painting', 'Premium Acrylic Emulsion', 'work', 1),
    (r_id, 'Masonry', NULL, 'Flush door with frame', 'work', 2),
    (r_id, 'Masonry', NULL, 'Slotted angle storage', 'material', 3),
    (r_id, 'Carpentry Work', NULL, 'Executive table', 'material', 4),
    (r_id, 'Carpentry Work', NULL, 'Rolling chair', 'material', 5),
    (r_id, 'Carpentry Work', NULL, 'Visitor chair', 'material', 6),
    (r_id, 'Carpentry Work', NULL, 'Wall mounted fan', 'material', 7),
    (r_id, 'Carpentry Work', NULL, 'Rafel metal door', 'material', 8);

  -- Play Area
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('play_area', 'Play Area 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Play Area & Infrastructure', 'Flooring', 'EPDM rubber safety flooring', 'work', 1),
    (r_id, 'Play Area & Infrastructure', 'Play Station', 'Multi play station with slide, tunnel, climbing wall', 'material', 2),
    (r_id, 'Play Area & Infrastructure', 'Play Equipment', 'Merry go round', 'material', 3),
    (r_id, 'Play Area & Infrastructure', 'Play Equipment', 'Seesaw', 'material', 4),
    (r_id, 'Play Area & Infrastructure', 'Play Equipment', 'Balance play equipment', 'material', 5),
    (r_id, 'Play Area & Infrastructure', 'Artwork', 'Wall graphics and educational artwork', 'work', 6),
    (r_id, 'Play Area & Infrastructure', 'Lighting', 'Decorative LED lighting', 'work', 7),
    (r_id, 'Play Area & Infrastructure', 'Landscaping', 'Indoor landscaping with planters', 'material', 8),
    (r_id, 'Play Area & Infrastructure', 'Electrical', 'Electrical works', 'work', 9);

END $$;
