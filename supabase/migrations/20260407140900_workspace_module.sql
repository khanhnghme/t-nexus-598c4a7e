-- ================================================================
-- WORKSPACE MODULE — Phase 1 Migration
-- ================================================================
-- This migration introduces the Workspace layer that wraps
-- around existing "groups" (Projects). It includes:
--   1. New enums
--   2. workspaces table
--   3. workspace_members table
--   4. workspace_invites table
--   5. ALTER groups: add workspace_id + visibility
--   6. ALTER group_members: add is_guest
--   7. Data migration (auto-create workspaces for existing users)
--   8. Helper functions
--   9. RLS Policies
--  10. Auto-create workspace trigger for new users
-- ================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════

CREATE TYPE public.workspace_role AS ENUM ('admin', 'member');

CREATE TYPE public.project_visibility AS ENUM ('private', 'workspace_public', 'public_link');

CREATE TYPE public.invite_scope AS ENUM ('workspace', 'project');

-- ═══════════════════════════════════════════════════════════════
-- 2. WORKSPACES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url    VARCHAR(500),

    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Plan & Soft-Limits (not enforced yet, informational only)
    plan              VARCHAR(20) NOT NULL DEFAULT 'free',
    max_projects      INT NOT NULL DEFAULT 2,
    max_members       INT NOT NULL DEFAULT 5,
    max_storage_mb    BIGINT NOT NULL DEFAULT 250,

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT workspaces_slug_unique UNIQUE (slug),
    CONSTRAINT chk_plan CHECK (plan IN ('free','plus','pro','business','enterprise'))
);

CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX idx_workspaces_slug  ON public.workspaces(slug);

-- Auto-update updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- 3. WORKSPACE_MEMBERS TABLE
-- ═══════════════════════════════════════════════════════════════
-- NOTE: Owner is NOT stored here. Owner = workspaces.owner_id
-- This table only holds admin and member roles.

CREATE TABLE public.workspace_members (
    workspace_id  UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role          public.workspace_role NOT NULL DEFAULT 'member',

    invited_by    UUID REFERENCES auth.users(id),
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX idx_ws_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_ws_members_ws   ON public.workspace_members(workspace_id);

-- ═══════════════════════════════════════════════════════════════
-- 4. WORKSPACE_INVITES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.workspace_invites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    scope           public.invite_scope NOT NULL,
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    group_id        UUID REFERENCES public.groups(id) ON DELETE CASCADE,

    invitee_email   VARCHAR(255) NOT NULL,
    invitee_user_id UUID REFERENCES auth.users(id),
    role_granted    VARCHAR(20) NOT NULL,
    is_guest        BOOLEAN NOT NULL DEFAULT FALSE,

    invited_by      UUID NOT NULL REFERENCES auth.users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_invite_scope CHECK (
        (scope = 'workspace' AND group_id IS NULL) OR
        (scope = 'project' AND group_id IS NOT NULL)
    ),
    CONSTRAINT chk_invite_status CHECK (status IN ('pending','accepted','declined','expired'))
);

CREATE INDEX idx_ws_invites_workspace ON public.workspace_invites(workspace_id);
CREATE INDEX idx_ws_invites_email     ON public.workspace_invites(invitee_email);
CREATE INDEX idx_ws_invites_status    ON public.workspace_invites(status) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════
-- 5. ALTER GROUPS — Add workspace_id + visibility
-- ═══════════════════════════════════════════════════════════════

-- Add nullable first (will make NOT NULL after data migration)
ALTER TABLE public.groups
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

ALTER TABLE public.groups
    ADD COLUMN visibility public.project_visibility NOT NULL DEFAULT 'private';

CREATE INDEX idx_groups_ws_visibility ON public.groups(workspace_id, visibility);

-- ═══════════════════════════════════════════════════════════════
-- 6. ALTER GROUP_MEMBERS — Add is_guest
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.group_members
    ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_group_members_guest ON public.group_members(user_id, is_guest)
    WHERE is_guest = TRUE;

-- ═══════════════════════════════════════════════════════════════
-- 7. DATA MIGRATION
-- ═══════════════════════════════════════════════════════════════
-- Create a default workspace for each user who has created groups.
-- Assign existing groups to their creator's workspace.
-- Set visibility based on current is_public / share_token values.

-- 7a. Create default workspace per distinct group creator
DO $$
DECLARE
    rec RECORD;
    ws_id UUID;
    ws_slug TEXT;
    counter INT := 0;
BEGIN
    FOR rec IN
        SELECT DISTINCT g.created_by, p.full_name
        FROM public.groups g
        JOIN public.profiles p ON p.id = g.created_by
    LOOP
        -- Generate unique slug
        ws_slug := 'ws-' || SUBSTRING(rec.created_by::text, 1, 8) || '-' || counter::text;
        counter := counter + 1;

        INSERT INTO public.workspaces (name, slug, owner_id, plan, max_projects, max_members, max_storage_mb)
        VALUES (
            COALESCE(rec.full_name, 'Workspace') || '''s Workspace',
            ws_slug,
            rec.created_by,
            'free',
            2,
            5,
            250
        )
        RETURNING id INTO ws_id;

        -- Assign all groups by this creator to the workspace
        UPDATE public.groups
        SET workspace_id = ws_id
        WHERE created_by = rec.created_by
          AND workspace_id IS NULL;

        -- Add all existing group members as workspace members (non-guest)
        INSERT INTO public.workspace_members (workspace_id, user_id, role, invited_by)
        SELECT DISTINCT ws_id, gm.user_id, 'member'::public.workspace_role, rec.created_by
        FROM public.group_members gm
        JOIN public.groups g ON g.id = gm.group_id
        WHERE g.created_by = rec.created_by
          AND gm.user_id != rec.created_by  -- Don't add owner as member
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END LOOP;
END $$;

-- 7b. Set visibility based on existing flags
UPDATE public.groups
SET visibility = CASE
    WHEN share_token IS NOT NULL AND share_token != '' THEN 'public_link'::public.project_visibility
    WHEN is_public = TRUE THEN 'workspace_public'::public.project_visibility
    ELSE 'private'::public.project_visibility
END
WHERE workspace_id IS NOT NULL;

-- 7c. Handle orphan groups (created by users without profiles — edge case)
-- Create a catch-all workspace if any groups remain unassigned
DO $$
DECLARE
    orphan_count INT;
    ws_id UUID;
BEGIN
    SELECT COUNT(*) INTO orphan_count FROM public.groups WHERE workspace_id IS NULL;
    
    IF orphan_count > 0 THEN
        -- Assign to the first group's creator anyway
        FOR ws_id IN
            SELECT DISTINCT created_by FROM public.groups WHERE workspace_id IS NULL
        LOOP
            INSERT INTO public.workspaces (name, slug, owner_id)
            VALUES ('Workspace', 'ws-orphan-' || SUBSTRING(ws_id::text, 1, 8), ws_id)
            ON CONFLICT (slug) DO NOTHING;
            
            UPDATE public.groups
            SET workspace_id = (
                SELECT id FROM public.workspaces WHERE owner_id = ws_id LIMIT 1
            )
            WHERE created_by = ws_id AND workspace_id IS NULL;
        END LOOP;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Check if user is workspace owner
CREATE OR REPLACE FUNCTION public.is_workspace_owner(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces
        WHERE id = _workspace_id AND owner_id = _user_id
    )
$$;

-- Check if user is a workspace member (any role, including owner)
CREATE OR REPLACE FUNCTION public.is_workspace_participant(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id
    )
    OR EXISTS (
        SELECT 1 FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id
    )
$$;

-- Get workspace role for a user (returns 'owner', 'admin', 'member', or NULL)
CREATE OR REPLACE FUNCTION public.get_workspace_role(_user_id UUID, _workspace_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM public.workspaces WHERE id = _workspace_id AND owner_id = _user_id)
            THEN 'owner'
        ELSE (SELECT role::text FROM public.workspace_members WHERE workspace_id = _workspace_id AND user_id = _user_id)
    END
$$;

-- Power Query: Check project access
-- Returns access context for authorization decisions
CREATE OR REPLACE FUNCTION public.check_project_access(_user_id UUID, _group_id UUID)
RETURNS TABLE (
    workspace_id UUID,
    ws_owner_id UUID,
    ws_role TEXT,
    group_id UUID,
    visibility public.project_visibility,
    group_role public.app_role,
    is_project_guest BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        w.id AS workspace_id,
        w.owner_id AS ws_owner_id,
        public.get_workspace_role(_user_id, w.id) AS ws_role,
        g.id AS group_id,
        g.visibility,
        gm.role AS group_role,
        gm.is_guest AS is_project_guest
    FROM public.groups g
    JOIN public.workspaces w ON w.id = g.workspace_id
    LEFT JOIN public.group_members gm ON gm.group_id = g.id AND gm.user_id = _user_id
    WHERE g.id = _group_id
$$;

-- Generate URL-safe slug from text
CREATE OR REPLACE FUNCTION public.generate_workspace_slug(_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INT := 0;
BEGIN
    -- Basic slugify: lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(trim(_name), '[^a-zA-Z0-9\s-]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Fallback if empty
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'workspace';
    END IF;
    
    -- Truncate to max 80 chars to leave room for suffix
    base_slug := left(base_slug, 80);
    
    -- Ensure uniqueness
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM public.workspaces WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN final_slug;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 9. AUTO-CREATE WORKSPACE FOR NEW USERS
-- ═══════════════════════════════════════════════════════════════
-- When a new profile is created (via handle_new_user trigger),
-- auto-create a default workspace for them.

CREATE OR REPLACE FUNCTION public.auto_create_workspace_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    ws_name TEXT;
    ws_slug TEXT;
BEGIN
    -- Build workspace name
    ws_name := CASE
        WHEN NEW.full_name IS NOT NULL AND NEW.full_name != ''
            THEN NEW.full_name || '''s Workspace'
        ELSE 'My Workspace'
    END;
    
    -- Generate unique slug
    ws_slug := public.generate_workspace_slug(ws_name);
    
    -- Create workspace
    INSERT INTO public.workspaces (name, slug, owner_id, plan, max_projects, max_members, max_storage_mb)
    VALUES (ws_name, ws_slug, NEW.id, 'free', 2, 5, 250);
    
    RETURN NEW;
END $$;

-- Attach trigger to profiles table (fires after insert)
CREATE TRIGGER on_profile_created_auto_workspace
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_workspace_for_user();

-- ═══════════════════════════════════════════════════════════════
-- 10. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- ── WORKSPACES ──

-- Anyone authenticated can see workspaces they participate in
CREATE POLICY "workspace_select_participant"
    ON public.workspaces FOR SELECT
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_id = id AND user_id = auth.uid()
        )
    );

-- Owner can update their workspace
CREATE POLICY "workspace_update_owner"
    ON public.workspaces FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Any authenticated user can create a workspace
CREATE POLICY "workspace_insert_authenticated"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Only owner can delete
CREATE POLICY "workspace_delete_owner"
    ON public.workspaces FOR DELETE
    USING (auth.uid() = owner_id);

-- System admin can see all workspaces
CREATE POLICY "workspace_select_system_admin"
    ON public.workspaces FOR SELECT
    USING (public.is_admin(auth.uid()));

-- ── WORKSPACE_MEMBERS ──

-- Participants can see members of their workspace
CREATE POLICY "ws_members_select"
    ON public.workspace_members FOR SELECT
    USING (
        public.is_workspace_participant(auth.uid(), workspace_id)
    );

-- Owner and admin can add members
CREATE POLICY "ws_members_insert"
    ON public.workspace_members FOR INSERT
    WITH CHECK (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR (
            public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
        )
    );

-- Owner and admin can update member roles
CREATE POLICY "ws_members_update"
    ON public.workspace_members FOR UPDATE
    USING (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
    )
    WITH CHECK (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
    );

-- Owner and admin can remove members. Members can remove themselves.
CREATE POLICY "ws_members_delete"
    ON public.workspace_members FOR DELETE
    USING (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
        OR auth.uid() = user_id  -- Self-removal
    );

-- ── WORKSPACE_INVITES ──

-- Participants can see invites for their workspace
CREATE POLICY "ws_invites_select"
    ON public.workspace_invites FOR SELECT
    USING (
        public.is_workspace_participant(auth.uid(), workspace_id)
        OR invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    );

-- Owner and admin can create invites
CREATE POLICY "ws_invites_insert"
    ON public.workspace_invites FOR INSERT
    WITH CHECK (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
    );

-- Owner, admin, and invitee can update invite status
CREATE POLICY "ws_invites_update"
    ON public.workspace_invites FOR UPDATE
    USING (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
        OR invitee_user_id = auth.uid()
    );

-- Owner and admin can delete invites
CREATE POLICY "ws_invites_delete"
    ON public.workspace_invites FOR DELETE
    USING (
        public.is_workspace_owner(auth.uid(), workspace_id)
        OR public.get_workspace_role(auth.uid(), workspace_id) = 'admin'
    );

COMMIT;
