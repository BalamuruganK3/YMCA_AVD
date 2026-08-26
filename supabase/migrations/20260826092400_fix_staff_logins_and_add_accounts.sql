-- Fix existing staff logins and ensure 5 staff accounts with display names Admin 1–5.
-- Password for all staff: Staff@123
-- Login emails:
--   staff@smartspace.com  / Admin 1
--   staff@smartclass1.com / Admin 2
--   staff3@smartspace.com / Admin 3
--   staff4@smartspace.com / Admin 4
--   staff5@smartspace.com / Admin 5

CREATE EXTENSION IF NOT EXISTS pgcrypto;

WITH accounts(email, full_name) AS (
  VALUES
    ('staff@smartspace.com', 'Admin 1'),
    ('staff@smartclass1.com', 'Admin 2'),
    ('staff3@smartspace.com', 'Admin 3'),
    ('staff4@smartspace.com', 'Admin 4'),
    ('staff5@smartspace.com', 'Admin 5')
),
updated AS (
  UPDATE auth.users u
  SET
    encrypted_password = crypt('Staff@123', gen_salt('bf', 10)),
    email_confirmed_at = COALESCE(u.email_confirmed_at, now()),
    raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || '{"provider":"email","providers":["email"]}'::jsonb,
    raw_user_meta_data = jsonb_build_object('full_name', a.full_name, 'role', 'staff'),
    updated_at = now(),
    banned_until = NULL,
    deleted_at = NULL
  FROM accounts a
  WHERE lower(u.email) = lower(a.email)
  RETURNING u.id, u.email
),
inserted AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token, is_sso_user, is_anonymous
  )
  SELECT
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    a.email,
    crypt('Staff@123', gen_salt('bf', 10)),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', a.full_name, 'role', 'staff'),
    now(), now(), '', '', '', '', false, false
  FROM accounts a
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(a.email)
  )
  RETURNING id, email
),
all_staff AS (
  SELECT id, email FROM updated
  UNION ALL
  SELECT id, email FROM inserted
)
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT gen_random_uuid(), s.id::text, s.id,
  jsonb_build_object('sub', s.id::text, 'email', s.email, 'email_verified', true),
  'email', now(), now(), now()
FROM all_staff s
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = s.id AND i.provider = 'email'
);

UPDATE public.profiles p
SET full_name = a.full_name, email = a.email
FROM (VALUES
  ('staff@smartspace.com', 'Admin 1'),
  ('staff@smartclass1.com', 'Admin 2'),
  ('staff3@smartspace.com', 'Admin 3'),
  ('staff4@smartspace.com', 'Admin 4'),
  ('staff5@smartspace.com', 'Admin 5')
) AS a(email, full_name)
WHERE lower(p.email) = lower(a.email);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'staff'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN (
  'staff@smartspace.com',
  'staff@smartclass1.com',
  'staff3@smartspace.com',
  'staff4@smartspace.com',
  'staff5@smartspace.com'
)
ON CONFLICT DO NOTHING;
