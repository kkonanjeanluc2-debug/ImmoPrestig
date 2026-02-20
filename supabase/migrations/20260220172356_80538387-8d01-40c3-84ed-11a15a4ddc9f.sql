
-- Create tenant_requests table
CREATE TABLE public.tenant_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- agency owner user_id
  property_id UUID REFERENCES public.properties(id),
  category TEXT NOT NULL DEFAULT 'reclamation',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'nouveau',
  priority TEXT NOT NULL DEFAULT 'normale',
  admin_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_requests ENABLE ROW LEVEL SECURITY;

-- Tenant can view their own requests (via portal)
CREATE POLICY "Tenants can view their own requests"
ON public.tenant_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = tenant_requests.tenant_id
    AND t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
  )
);

-- Tenant can create requests (via portal)
CREATE POLICY "Tenants can create requests"
ON public.tenant_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = tenant_requests.tenant_id
    AND t.portal_user_id = auth.uid()
    AND t.has_portal_access = true
  )
);

-- Agency owner can view requests for their tenants
CREATE POLICY "Users can view their own tenant requests"
ON public.tenant_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Agency owner can update requests (change status, respond)
CREATE POLICY "Users can update their own tenant requests"
ON public.tenant_requests
FOR UPDATE
USING (auth.uid() = user_id);

-- Agency owner can delete requests
CREATE POLICY "Users can delete their own tenant requests"
ON public.tenant_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_requests_updated_at
BEFORE UPDATE ON public.tenant_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
