
CREATE OR REPLACE FUNCTION public.auto_create_workspace_for_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    ws_name TEXT;
    ws_slug TEXT;
BEGIN
    ws_name := CASE
        WHEN NEW.full_name IS NOT NULL AND NEW.full_name != ''
            THEN NEW.full_name || '''s Workspace'
        ELSE 'My Workspace'
    END;
    
    ws_slug := public.generate_workspace_slug(ws_name);
    
    INSERT INTO public.workspaces (name, slug, owner_id, max_projects, max_members, max_storage_mb)
    VALUES (ws_name, ws_slug, NEW.id, 2, 5, 250);
    
    RETURN NEW;
END $function$;
