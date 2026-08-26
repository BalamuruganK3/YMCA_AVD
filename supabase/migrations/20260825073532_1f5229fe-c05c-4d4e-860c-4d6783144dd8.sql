
CREATE TYPE public.app_role AS ENUM ('admin','staff');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role','staff') = 'admin' THEN 'admin'::public.app_role ELSE 'staff'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (area, name)
);
GRANT SELECT ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms readable" ON public.rooms FOR SELECT TO authenticated USING (true);

CREATE TABLE public.work_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  subgroup text,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'work',
  status text NOT NULL DEFAULT 'hold',
  remarks text,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.work_items TO authenticated;
GRANT ALL ON public.work_items TO service_role;
ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work items readable" ON public.work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff update work items" ON public.work_items FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.work_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid NOT NULL REFERENCES public.work_items(id) ON DELETE CASCADE,
  status text NOT NULL,
  remarks text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.work_updates TO authenticated;
GRANT ALL ON public.work_updates TO service_role;
ALTER TABLE public.work_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "updates readable" ON public.work_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert updates" ON public.work_updates FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin')));

CREATE TABLE public.work_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id uuid REFERENCES public.work_items(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  drive_file_id text,
  drive_view_url text,
  drive_thumbnail_url text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.work_photos TO authenticated;
GRANT ALL ON public.work_photos TO service_role;
ALTER TABLE public.work_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos readable" ON public.work_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff insert photos" ON public.work_photos FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND (public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'admin')));

CREATE TABLE public.project_settings (
  id int PRIMARY KEY DEFAULT 1,
  deadline date NOT NULL DEFAULT (now() + interval '60 days')::date,
  project_name text NOT NULL DEFAULT 'Facility Works',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);
GRANT SELECT, UPDATE ON public.project_settings TO authenticated;
GRANT ALL ON public.project_settings TO service_role;
ALTER TABLE public.project_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings readable" ON public.project_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin update settings" ON public.project_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.project_settings (id) VALUES (1);

INSERT INTO public.rooms (area, name, sort_order)
SELECT a.area, a.label || ' ' || g.n, g.n
FROM (VALUES
  ('smart_class','Smart Class'),
  ('lab','Lab'),
  ('staff_room','Staff Room'),
  ('server','Server Room')
) AS a(area,label), generate_series(1,5) AS g(n);

INSERT INTO public.work_items (room_id, group_name, subgroup, title, kind, sort_order)
SELECT r.id, t.group_name, t.subgroup, t.title, t.kind, t.sort_order
FROM public.rooms r,
(VALUES
  ('Civil Work','False Ceiling','Plain False Ceiling','work',1),
  ('Civil Work','Painting','Wall Painting','work',2),
  ('Civil Work','Flooring','Floor Tiles','work',3),
  ('Electrical','Wiring','Power Wiring','work',4),
  ('Electrical','Lighting','LED Panel Lights','work',5),
  ('Furniture',NULL,'Tables','material',6),
  ('Furniture',NULL,'Chairs','material',7),
  ('Equipment',NULL,'Interactive Panel','material',8)
) AS t(group_name,subgroup,title,kind,sort_order);
