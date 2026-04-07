
-- =====================================================
-- Step 0: Drop RLS policies that cast to app_role
-- =====================================================
DROP POLICY IF EXISTS "Users can join groups by code" ON public.group_members;
DROP POLICY IF EXISTS "Leaders and admins can create groups" ON public.groups;
DROP POLICY IF EXISTS "Leaders and admins can delete activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Leaders and admins can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Leaders and admins can view activity logs" ON public.activity_logs;

-- =====================================================
-- Step 1: Drop functions that depend on app_role type
-- =====================================================
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.check_project_access(uuid, uuid);

-- =====================================================
-- Step 2: Create new enum
-- =====================================================
CREATE TYPE public.app_role_new AS ENUM ('owner_system', 'leader', 'member');

-- Step 3: Convert columns to text
ALTER TABLE public.user_roles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text;
ALTER TABLE public.group_members ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.group_members ALTER COLUMN role TYPE text;
ALTER TABLE public.project_invitations ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.project_invitations ALTER COLUMN role TYPE text;

-- Step 4: Migrate data
UPDATE public.user_roles SET role = 'owner_system' WHERE role = 'admin';
UPDATE public.group_members SET role = 'owner_system' WHERE role = 'admin';
UPDATE public.project_invitations SET role = 'owner_system' WHERE role = 'admin';

-- Step 5: Drop old enum, rename new
DROP TYPE public.app_role;
ALTER TYPE public.app_role_new RENAME TO app_role;

-- Step 6: Convert back to enum
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role,
  ALTER COLUMN role SET DEFAULT 'member'::public.app_role;
ALTER TABLE public.group_members
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role,
  ALTER COLUMN role SET DEFAULT 'member'::public.app_role;
ALTER TABLE public.project_invitations
  ALTER COLUMN role TYPE public.app_role USING role::public.app_role,
  ALTER COLUMN role SET DEFAULT 'member'::public.app_role;

-- =====================================================
-- Step 7: Recreate all functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_owner_system(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner_system') $$;

-- is_admin as alias for backward compat
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.is_owner_system(_user_id) $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('owner_system', 'leader')) $$;

CREATE OR REPLACE FUNCTION public.is_group_leader(_user_id uuid, _group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role IN ('leader', 'owner_system')
  ) OR public.is_owner_system(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.check_project_access(_user_id uuid, _group_id uuid)
RETURNS TABLE(workspace_id uuid, ws_owner_id uuid, ws_role text, group_id uuid, visibility project_visibility, group_role app_role, is_project_guest boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
    SELECT
        w.id AS workspace_id, w.owner_id AS ws_owner_id,
        public.get_workspace_role(_user_id, w.id) AS ws_role,
        g.id AS group_id, g.visibility,
        gm.role AS group_role, gm.is_guest AS is_project_guest
    FROM public.groups g
    JOIN public.workspaces w ON w.id = g.workspace_id
    LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = _user_id
    WHERE g.id = _group_id
$$;

CREATE OR REPLACE FUNCTION public.check_admin_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _admin_email text;
BEGIN
  SELECT (value->>'email') INTO _admin_email FROM public.system_settings WHERE key = 'admin_contact';
  IF _admin_email IS NULL OR _admin_email = '' THEN RETURN NEW; END IF;
  IF NEW.email = _admin_email THEN
    UPDATE public.profiles SET is_approved = true, email = NEW.email WHERE id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner_system') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- Step 8: Recreate dropped RLS policies
-- =====================================================
CREATE POLICY "Users can join groups by code" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK ((user_id = auth.uid()) AND (role = 'member'::public.app_role) AND (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_members.group_id AND g.allow_join_by_code = true AND g.join_code IS NOT NULL)));

CREATE POLICY "Leaders and admins can create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'leader'::public.app_role) OR is_admin(auth.uid()));

CREATE POLICY "Leaders and admins can delete activity logs" ON public.activity_logs
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'leader'::public.app_role));

CREATE POLICY "Leaders and admins can insert activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'leader'::public.app_role) OR (user_id = auth.uid()));

CREATE POLICY "Leaders and admins can view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'leader'::public.app_role));

-- =====================================================
-- Step 9: Reset all owner_system roles
-- =====================================================
DELETE FROM public.user_roles WHERE role = 'owner_system';
