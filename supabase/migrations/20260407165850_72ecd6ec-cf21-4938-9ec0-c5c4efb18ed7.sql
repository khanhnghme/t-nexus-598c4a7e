-- Update existing workspace_members role values to new format
UPDATE public.workspace_members SET role = 'workspace_admin' WHERE role = 'admin';
UPDATE public.workspace_members SET role = 'workspace_member' WHERE role = 'member';