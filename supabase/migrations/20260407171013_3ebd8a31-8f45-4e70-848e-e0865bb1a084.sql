
-- Step 1: Change column to text first
ALTER TABLE public.project_invitations 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE text USING role::text;

-- Step 2: Migrate data
UPDATE public.project_invitations SET role = 'project_member' WHERE role = 'member';
UPDATE public.project_invitations SET role = 'project_admin' WHERE role = 'leader';
UPDATE public.project_invitations SET role = 'project_owner' WHERE role = 'owner_system';

-- Step 3: Convert to project_role enum
ALTER TABLE public.project_invitations 
  ALTER COLUMN role TYPE project_role USING role::project_role,
  ALTER COLUMN role SET DEFAULT 'project_member'::project_role;
