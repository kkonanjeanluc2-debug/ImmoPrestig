-- Drop existing SELECT policy for agency users
DROP POLICY IF EXISTS "Users can view their own tenant requests" ON tenant_requests;

-- Create a new SELECT policy that covers agency owner + members
CREATE POLICY "Users can view their own tenant requests" ON tenant_requests
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = tenant_requests.tenant_id
    AND (
      t.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM agency_members am
        JOIN agencies a ON a.id = am.agency_id
        WHERE am.user_id = t.user_id
        AND a.user_id = auth.uid()
        AND am.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM agency_members am
        WHERE am.user_id = auth.uid()
        AND am.agency_id = (
          SELECT am2.agency_id FROM agency_members am2 WHERE am2.user_id = t.user_id AND am2.status = 'active' LIMIT 1
        )
        AND am.status = 'active'
      )
    )
  )
);

-- Also fix UPDATE policy for same reason
DROP POLICY IF EXISTS "Users can update their own tenant requests" ON tenant_requests;

CREATE POLICY "Users can update their own tenant requests" ON tenant_requests
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM tenants t
    WHERE t.id = tenant_requests.tenant_id
    AND (
      t.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM agency_members am
        JOIN agencies a ON a.id = am.agency_id
        WHERE am.user_id = t.user_id
        AND a.user_id = auth.uid()
        AND am.status = 'active'
      )
    )
  )
);