-- Predefined login accounts (admin + staff). Passwords are hashed with pgcrypto.
-- Login: admin@smartspace.com / Admin@123  (display name: Admin)
-- Staff logins (display names Admin 1–5):
--   staff@smartspace.com  / Staff@123
--   staff@smartclass1.com / Staff@123
--   staff3@smartspace.com / Staff@123
--   staff4@smartspace.com / Staff@123
--   staff5@smartspace.com / Staff@123
-- Change these passwords after first login via Supabase Auth.

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'admin@smartspace.com', crypt('Admin@123', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Admin","role":"admin"}',
  now(), now(), '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  'staff@smartspace.com', crypt('Staff@123', gen_salt('bf')),
  now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Staff","role":"staff"}',
  now(), now(), '', '', '', ''
);

INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT gen_random_uuid(), u.id::text, u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
FROM auth.users u
WHERE u.email IN ('admin@smartspace.com','staff@smartspace.com');

-- public.profiles and public.user_roles rows are created automatically
-- by the on_auth_user_created trigger (handle_new_user), based on
-- raw_user_meta_data ->> 'role' above.
