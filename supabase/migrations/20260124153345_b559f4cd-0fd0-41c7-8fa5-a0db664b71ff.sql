-- Table pour les membres d'équipe de chaque agence
CREATE TABLE public.agency_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'lecture_seule'::app_role,
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    joined_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(agency_id, user_id)
);

-- Enable RLS
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- Policies for agency_members
-- Agency owners can view all members of their agency
CREATE POLICY "Agency owners can view their members"
ON public.agency_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.agencies
        WHERE agencies.id = agency_members.agency_id
        AND agencies.user_id = auth.uid()
    )
);

-- Agency admins can view members
CREATE POLICY "Agency admins can view members"
ON public.agency_members
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.agency_members am
        WHERE am.agency_id = agency_members.agency_id
        AND am.user_id = auth.uid()
        AND am.role = 'admin'::app_role
        AND am.status = 'active'
    )
);

-- Users can view their own membership
CREATE POLICY "Users can view their own membership"
ON public.agency_members
FOR SELECT
USING (auth.uid() = user_id);

-- Agency owners can insert members
CREATE POLICY "Agency owners can insert members"
ON public.agency_members
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.agencies
        WHERE agencies.id = agency_members.agency_id
        AND agencies.user_id = auth.uid()
    )
);

-- Agency owners can update members
CREATE POLICY "Agency owners can update members"
ON public.agency_members
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.agencies
        WHERE agencies.id = agency_members.agency_id
        AND agencies.user_id = auth.uid()
    )
);

-- Agency owners can delete members
CREATE POLICY "Agency owners can delete members"
ON public.agency_members
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.agencies
        WHERE agencies.id = agency_members.agency_id
        AND agencies.user_id = auth.uid()
    )
);

-- Super admins policies
CREATE POLICY "Super admins can view all agency members"
ON public.agency_members
FOR SELECT
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all agency members"
ON public.agency_members
FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_agency_members_updated_at
BEFORE UPDATE ON public.agency_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to count active agency members
CREATE OR REPLACE FUNCTION public.get_agency_member_count(p_agency_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.agency_members
    WHERE agency_id = p_agency_id
    AND status = 'active'
$$;

-- Function to check if agency can add more members based on subscription
CREATE OR REPLACE FUNCTION public.can_agency_add_member(p_agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT 
                CASE 
                    WHEN sp.max_users IS NULL THEN TRUE
                    ELSE (SELECT public.get_agency_member_count(p_agency_id)) < sp.max_users
                END
            FROM public.agency_subscriptions ags
            JOIN public.subscription_plans sp ON sp.id = ags.plan_id
            WHERE ags.agency_id = p_agency_id
            AND ags.status = 'active'
            LIMIT 1
        ),
        TRUE -- If no subscription, allow (for free tier handling)
    )
$$;