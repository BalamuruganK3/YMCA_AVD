-- Migration: Fix Row Level Security (RLS) policies for rooms, work_items, work_updates and populate all room tasks

-- 1. Enable RLS and grant appropriate permissions to authenticated and service_role
GRANT ALL ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.rooms TO anon;

GRANT ALL ON public.work_items TO authenticated;
GRANT ALL ON public.work_items TO service_role;
GRANT ALL ON public.work_items TO anon;

GRANT ALL ON public.work_updates TO authenticated;
GRANT ALL ON public.work_updates TO service_role;

GRANT ALL ON public.work_photos TO authenticated;
GRANT ALL ON public.work_photos TO service_role;

GRANT ALL ON public.project_settings TO authenticated;
GRANT ALL ON public.project_settings TO service_role;

-- 2. Drop overly restrictive policies if existing
DROP POLICY IF EXISTS "rooms readable" ON public.rooms;
DROP POLICY IF EXISTS "rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms update" ON public.rooms;
DROP POLICY IF EXISTS "rooms delete" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms read" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms insert" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms update" ON public.rooms;
DROP POLICY IF EXISTS "allow all rooms delete" ON public.rooms;

DROP POLICY IF EXISTS "work items readable" ON public.work_items;
DROP POLICY IF EXISTS "staff update work items" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items read" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items insert" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items update" ON public.work_items;
DROP POLICY IF EXISTS "allow all work_items delete" ON public.work_items;

-- 3. Create comprehensive RLS policies on rooms
CREATE POLICY "allow all rooms read" ON public.rooms FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all rooms insert" ON public.rooms FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all rooms update" ON public.rooms FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all rooms delete" ON public.rooms FOR DELETE TO authenticated, anon USING (true);

-- 4. Create comprehensive RLS policies on work_items
CREATE POLICY "allow all work_items read" ON public.work_items FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "allow all work_items insert" ON public.work_items FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "allow all work_items update" ON public.work_items FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "allow all work_items delete" ON public.work_items FOR DELETE TO authenticated, anon USING (true);

-- 5. Delete obsolete rooms and obsolete items
DELETE FROM public.rooms WHERE area = 'server';
DELETE FROM public.rooms WHERE area = 'staff_room' AND name IN ('Staff Room 2', 'Staff Room 3', 'Staff Room 4', 'Staff Room 5');

-- 6. Insert/Ensure all rooms and all specific work items
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
        (r_id, 'Electrical', 'Wiring', 'Power Wiring', 'work', 4),
        (r_id, 'Electrical', 'Lighting', 'LED Panel Lights', 'work', 5),
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
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Work Station Table (Carpentry Work)', 'material', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Revolving Chair (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage Rack (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Flooring', 'False Flooring (top Finish)', 'work', 8),
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
    (r_id, 'Server Work', 'Hardware', 'Monitor and pc', 'material', 23),
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
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work (Wall Painting)', 'work', 10),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 11),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 12),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in tamil (Acrylic wording)', 'work', 13),
    (r_id, 'Civil Work', 'Carpentry Work', 'Computer table (Carpentry Work)', 'material', 14),
    (r_id, 'Civil Work', 'Carpentry Work', 'Students chair (Carpentry Work)', 'material', 15),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher table (Carpentry Work)', 'material', 16),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher chair (Carpentry Work)', 'material', 17),
    (r_id, 'Civil Work', 'Carpentry Work', 'Side table (Carpentry Work)', 'material', 18),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage table with lock & key for interactive board (Carpentry Work)', 'material', 19),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage table with lock & key (Carpentry Work)', 'material', 20),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wall storage with lock and key (Carpentry Work)', 'material', 21),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel metal door (Carpentry Work)', 'material', 22);

  -- Phy Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'Phy lab', 2)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 2
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in tamil (Acrylic wording)', 'work', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Workstation table & power sockets (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Workstation table floor mat (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher table (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher chair (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Side table (Carpentry Work)', 'material', 10),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage table with lock & key (Carpentry Work)', 'material', 11),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wall storage with lock & key partially glazed (Carpentry Work)', 'material', 12),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel Metal door (Carpentry Work)', 'material', 13);

  -- Chem Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'Chem lab', 3)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 3
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in tamil (Acrylic wording)', 'work', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Workstation table With Sink & Power Sockets (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher table (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher chair (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Side table (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage table with lock & key Below of Interactive Board (Carpentry Work)', 'material', 10),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage table with lock & key (Carpentry Work)', 'material', 11),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wall storage with lock & key partially glazed (Carpentry Work)', 'material', 12),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel Metal door (Carpentry Work)', 'material', 13),
    (r_id, 'Civil Work', 'Carpentry Work', 'Gas pipeline (Carpentry Work)', 'work', 14),
    (r_id, 'Civil Work', 'Carpentry Work', 'Gas Pipeline Connectors (Carpentry Work)', 'material', 15);

  -- Bio Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'Bio lab', 4)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 4
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in tamil (Acrylic wording)', 'work', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Workstation table & power sockets, with sink (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Workstation table floor mat (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher table (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher chair (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Side table (Carpentry Work)', 'material', 10),
    (r_id, 'Civil Work', 'Carpentry Work', 'Storage table with lock & key Below of Interactive Board (Carpentry Work)', 'material', 11),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wall storage with lock & key partially glazed (Carpentry Work)', 'material', 12),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel Metal door (Carpentry Work)', 'material', 13);

  -- Stem Lab
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('lab', 'stem lab', 5)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 5
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in tamil (Acrylic wording)', 'work', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Workstation table (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Students chair (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rubber mat for table (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher table (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Side table (Carpentry Work)', 'material', 10),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wall storage with lock & key partially glazed (Carpentry Work)', 'material', 11),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel Metal door (Carpentry Work)', 'material', 12);

  -- Library Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('library', 'Library 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion with art work (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed Acrylic wording in tamil (Acrylic wording)', 'work', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Optimize study table (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Students chair (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher table (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teacher chair (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Side table (Carpentry Work)', 'material', 10),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wise book case (Carpentry Work)', 'material', 11),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel metal door (Carpentry Work)', 'material', 12),
    (r_id, 'Civil Work', 'System', 'Computer system (system)', 'material', 13),
    (r_id, 'Civil Work', 'System', 'Barcode reader (system)', 'material', 14);

  -- Staff Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('staff_room', 'Staff Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teachers table with popup box (carpentry work)', 'material', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Teachers chair (carpentry work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Locker box (carpentry work)', 'material', 7);

  -- Entrance Corridor
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('entrance_corridor', 'Entrance Corridor 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
    (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion (Wall Painting)', 'work', 2),
    (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
    (r_id, 'Civil Work', 'Acrylic Wording', 'Emposed acrylic wording (acrylic wording)', 'work', 4),
    (r_id, 'Civil Work', 'Reception Area', 'Computer system for reception (reception area)', 'material', 5),
    (r_id, 'Civil Work', 'Reception Area', 'Reception table (reception area)', 'material', 6),
    (r_id, 'Civil Work', 'Reception Area', 'Reception back wall panel (reception area)', 'material', 7),
    (r_id, 'Civil Work', 'Reception Area', 'Chair (reception area)', 'material', 8),
    (r_id, 'Civil Work', 'Reception Area', 'Loose furniture (reception area)', 'material', 9),
    (r_id, 'Civil Work', 'Reception Area', 'Artifact (reception area)', 'material', 10);

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
    (r_id, 'Civil Work', 'Blinds', 'Zebra blind (blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Backwall panaling (Carpentry Work)', 'material', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Open book rack (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Credenza (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel metal door (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Principal table (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Principal executive chair (Carpentry Work)', 'material', 10),
    (r_id, 'Civil Work', 'Carpentry Work', 'Visitor sofa (Carpentry Work)', 'material', 11);

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
    (r_id, 'Civil Work', 'Blinds', 'Zebra blind (blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Backwall panaling (Carpentry Work)', 'material', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Open book rack (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Carpentry Work', 'Credenza (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Reception table (Carpentry Work)', 'material', 8),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rolling chair (Carpentry Work)', 'material', 9),
    (r_id, 'Civil Work', 'Carpentry Work', 'Visitor chair (Carpentry Work)', 'material', 10);

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
    (r_id, 'Civil Work', 'Blinds', 'Zebra blind (blackout)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Waller book case (Carpentry Work)', 'material', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Wise book case (Carpentry Work)', 'material', 6);

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
    (r_id, 'Civil Work', 'Carpentry Work', 'Lean to wall running table (Carpentry Work)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Visitor chair (Carpentry Work)', 'material', 5),
    (r_id, 'Civil Work', 'Equipment', 'Refrigerator (Carpentry Work)', 'material', 6),
    (r_id, 'Civil Work', 'Furniture', 'Patient bed set (Carpentry Work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel metal door (Carpentry Work)', 'material', 8);

  -- PET Room
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('pet_room', 'PET Room 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Civil Work', 'Painting', 'Premium Acrylic Emulsion', 'work', 1),
    (r_id, 'Civil Work', 'Masonry', 'Flush door with frame (Masonry)', 'work', 2),
    (r_id, 'Civil Work', 'Masonry', 'Slotted angle storage (Masonry)', 'material', 3),
    (r_id, 'Civil Work', 'Carpentry Work', 'Executive table (Carpentry work)', 'material', 4),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rolling chair (Carpentry work)', 'material', 5),
    (r_id, 'Civil Work', 'Carpentry Work', 'Visitor chair (Carpentry work)', 'material', 6),
    (r_id, 'Civil Work', 'Equipment', 'Wall mounted fan (Carpentry work)', 'material', 7),
    (r_id, 'Civil Work', 'Carpentry Work', 'Rafel metal door (Carpentry work)', 'material', 8);

  -- Play Area
  INSERT INTO public.rooms (area, name, sort_order)
  VALUES ('play_area', 'Play Area 1', 1)
  ON CONFLICT (area, name) DO UPDATE SET sort_order = 1
  RETURNING id INTO r_id;

  DELETE FROM public.work_items WHERE room_id = r_id;
  INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
    (r_id, 'Play & Infrastructure Work', 'Flooring', 'EPDM rubber safety flooring', 'work', 1),
    (r_id, 'Play & Infrastructure Work', 'Play Station', 'Multi play station with slide, tunnel, climbing wall', 'material', 2),
    (r_id, 'Play & Infrastructure Work', 'Play Equipment', 'Merry go round', 'material', 3),
    (r_id, 'Play & Infrastructure Work', 'Play Equipment', 'Seesaw', 'material', 4),
    (r_id, 'Play & Infrastructure Work', 'Play Equipment', 'Balance play equipment', 'material', 5),
    (r_id, 'Play & Infrastructure Work', 'Artwork', 'Wall graphics and educational artwork', 'work', 6),
    (r_id, 'Play & Infrastructure Work', 'Lighting', 'Decorative LED lighting', 'work', 7),
    (r_id, 'Play & Infrastructure Work', 'Landscaping', 'Indoor landscaping with planters', 'material', 8),
    (r_id, 'Play & Infrastructure Work', 'Electrical', 'Electrical work', 'work', 9);

END $$;
