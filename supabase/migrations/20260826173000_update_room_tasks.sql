-- Migration: Update all room-specific tasks according to detailed layout requirements

DO $$
DECLARE
  r RECORD;
  r_id uuid;
BEGIN
  -- Control Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'control_room' AND name = 'Control Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- CS Lab
  SELECT id INTO r_id FROM public.rooms WHERE area = 'lab' AND name = 'CS lab' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Phy Lab
  SELECT id INTO r_id FROM public.rooms WHERE area = 'lab' AND name = 'Phy lab' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Chem Lab
  SELECT id INTO r_id FROM public.rooms WHERE area = 'lab' AND name = 'Chem lab' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Bio Lab
  SELECT id INTO r_id FROM public.rooms WHERE area = 'lab' AND name = 'Bio lab' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Stem Lab
  SELECT id INTO r_id FROM public.rooms WHERE area = 'lab' AND name = 'stem lab' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Library Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'library' AND name = 'Library 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Staff Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'staff_room' AND name = 'Staff Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
    DELETE FROM public.work_items WHERE room_id = r_id;
    INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
      (r_id, 'Civil Work', 'False Ceiling', 'Plain false ceiling', 'work', 1),
      (r_id, 'Civil Work', 'Wall Painting', 'Premium Acrylic Emulsion (Wall Painting)', 'work', 2),
      (r_id, 'Civil Work', 'Ceiling Painting', 'Plain Premium Acrylic Emulsion (Ceiling Painting)', 'work', 3),
      (r_id, 'Civil Work', 'Blinds', 'Zebra Blind (Blackout)', 'material', 4),
      (r_id, 'Civil Work', 'Carpentry Work', 'Teachers table with popup box (carpentry work)', 'material', 5),
      (r_id, 'Civil Work', 'Carpentry Work', 'Teachers chair (carpentry work)', 'material', 6),
      (r_id, 'Civil Work', 'Carpentry Work', 'Locker box (carpentry work)', 'material', 7);
  END IF;

  -- Entrance Corridor
  SELECT id INTO r_id FROM public.rooms WHERE area = 'entrance_corridor' AND name = 'Entrance Corridor 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Principal Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'principal_room' AND name = 'Principal Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Admin Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'admin_room' AND name = 'Admin Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Record Store Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'record_store_room' AND name = 'Record Store Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
    DELETE FROM public.work_items WHERE room_id = r_id;
    INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order) VALUES
      (r_id, 'Civil Work', 'False Ceiling', 'Multi level false ceiling', 'work', 1),
      (r_id, 'Civil Work', 'Wall Painting', 'Premium acrylic emulsion', 'work', 2),
      (r_id, 'Civil Work', 'Ceiling Painting', 'Plain premium acrylic emulsion', 'work', 3),
      (r_id, 'Civil Work', 'Blinds', 'Zebra blind (blackout)', 'material', 4),
      (r_id, 'Civil Work', 'Carpentry Work', 'Waller book case (Carpentry Work)', 'material', 5),
      (r_id, 'Civil Work', 'Carpentry Work', 'Wise book case (Carpentry Work)', 'material', 6);
  END IF;

  -- Medical Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'medical_room' AND name = 'Medical Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- PET Room
  SELECT id INTO r_id FROM public.rooms WHERE area = 'pet_room' AND name = 'PET Room 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

  -- Play Area
  SELECT id INTO r_id FROM public.rooms WHERE area = 'play_area' AND name = 'Play Area 1' LIMIT 1;
  IF r_id IS NOT NULL THEN
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
  END IF;

END $$;
