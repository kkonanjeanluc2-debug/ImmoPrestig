-- ============================================================
-- FIX: Admin/propriétaire d'agence ne voit pas les portes
--      créées par un commercial
-- ============================================================
-- Deux cas à couvrir :
--   A) Le compte est propriétaire de l'agence (agencies.user_id = auth.uid())
--      mais pas forcément dans agency_members
--   B) Le compte est membre admin (agency_members.role = 'admin')
--
-- Dans les deux cas, l'admin doit voir les portes créées par
-- n'importe quel membre actif de son agence.
-- ============================================================

-- ============================================================
-- SELECT
-- ============================================================
DROP POLICY IF EXISTS "Agency admins can view all units" ON public.property_units;

CREATE POLICY "Agency admins can view all units"
ON public.property_units FOR SELECT
USING (
  -- Cas A : l'utilisateur courant EST le propriétaire d'une agence
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.user_id = auth.uid()
    AND (
      -- Porte créée par lui-même
      property_units.user_id = auth.uid()
      OR
      -- Porte créée par un membre actif de son agence
      EXISTS (
        SELECT 1 FROM public.agency_members am
        WHERE am.agency_id = a.id
          AND am.user_id = property_units.user_id
          AND am.status = 'active'
      )
    )
  )
  OR
  -- Cas B : l'utilisateur est membre admin (agency_members)
  EXISTS (
    SELECT 1 FROM public.agency_members am_admin
    WHERE am_admin.user_id = auth.uid()
      AND am_admin.role = 'admin'::app_role
      AND am_admin.status = 'active'
      AND (
        -- Porte créée par le propriétaire de son agence
        EXISTS (
          SELECT 1 FROM public.agencies a
          WHERE a.id = am_admin.agency_id
            AND a.user_id = property_units.user_id
        )
        OR
        -- Porte créée par n'importe quel membre actif de la même agence
        EXISTS (
          SELECT 1 FROM public.agency_members am_creator
          WHERE am_creator.agency_id = am_admin.agency_id
            AND am_creator.user_id = property_units.user_id
            AND am_creator.status = 'active'
        )
      )
  )
);

-- ============================================================
-- UPDATE
-- ============================================================
DROP POLICY IF EXISTS "Agency admins can update all units" ON public.property_units;

CREATE POLICY "Agency admins can update all units"
ON public.property_units FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.user_id = auth.uid()
    AND (
      property_units.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.agency_members am
        WHERE am.agency_id = a.id
          AND am.user_id = property_units.user_id
          AND am.status = 'active'
      )
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.agency_members am_admin
    WHERE am_admin.user_id = auth.uid()
      AND am_admin.role = 'admin'::app_role
      AND am_admin.status = 'active'
      AND (
        EXISTS (
          SELECT 1 FROM public.agencies a
          WHERE a.id = am_admin.agency_id
            AND a.user_id = property_units.user_id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.agency_members am_creator
          WHERE am_creator.agency_id = am_admin.agency_id
            AND am_creator.user_id = property_units.user_id
            AND am_creator.status = 'active'
        )
      )
  )
);

-- ============================================================
-- DELETE (admin peut supprimer les portes de ses membres)
-- ============================================================
DROP POLICY IF EXISTS "Agency admins can delete all units" ON public.property_units;

CREATE POLICY "Agency admins can delete all units"
ON public.property_units FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a
    WHERE a.user_id = auth.uid()
    AND (
      property_units.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.agency_members am
        WHERE am.agency_id = a.id
          AND am.user_id = property_units.user_id
          AND am.status = 'active'
      )
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.agency_members am_admin
    WHERE am_admin.user_id = auth.uid()
      AND am_admin.role = 'admin'::app_role
      AND am_admin.status = 'active'
      AND (
        EXISTS (
          SELECT 1 FROM public.agencies a
          WHERE a.id = am_admin.agency_id
            AND a.user_id = property_units.user_id
        )
        OR
        EXISTS (
          SELECT 1 FROM public.agency_members am_creator
          WHERE am_creator.agency_id = am_admin.agency_id
            AND am_creator.user_id = property_units.user_id
            AND am_creator.status = 'active'
        )
      )
  )
);

-- ============================================================
-- Vérification : lister les portes et voir si la politique couvre bien
-- Remplace <ADMIN_USER_ID> par l'UUID de l'admin BEYTH-EL avant d'exécuter
-- ============================================================
-- SELECT pu.id, pu.unit_number, pu.user_id, p.title AS property_name,
--        a.name AS agency_name, am.status AS member_status
-- FROM public.property_units pu
-- JOIN public.properties p ON p.id = pu.property_id
-- LEFT JOIN public.agencies a ON a.user_id = pu.user_id
-- LEFT JOIN public.agency_members am ON am.user_id = pu.user_id
-- WHERE p.title ILIKE '%mbalde%'
-- LIMIT 20;
