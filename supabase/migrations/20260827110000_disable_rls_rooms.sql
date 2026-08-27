-- Migration: Disable Row Level Security on rooms and work_items tables to prevent RLS errors on virtual room initialization
ALTER TABLE IF EXISTS public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.work_items DISABLE ROW LEVEL SECURITY;
