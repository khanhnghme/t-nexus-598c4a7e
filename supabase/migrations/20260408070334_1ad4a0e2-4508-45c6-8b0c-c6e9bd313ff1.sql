
-- Step 1: Remove 'plan' column from workspaces table
-- The workspace plan is now determined by the owner's user_plan (cascading billing)
ALTER TABLE public.workspaces DROP COLUMN IF EXISTS plan;

-- Step 2: Create a helper function to get workspace owner's plan
CREATE OR REPLACE FUNCTION public.get_workspace_plan(_workspace_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_plan::text
  FROM public.workspaces w
  JOIN public.profiles p ON p.id = w.owner_id
  WHERE w.id = _workspace_id
$$;

-- Step 3: Create a helper function to check if workspace has premium plan
CREATE OR REPLACE FUNCTION public.is_workspace_premium(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces w
    JOIN public.profiles p ON p.id = w.owner_id
    WHERE w.id = _workspace_id
      AND p.user_plan IN ('plan_plus', 'plan_pro', 'plan_business', 'plan_custom')
  )
$$;
