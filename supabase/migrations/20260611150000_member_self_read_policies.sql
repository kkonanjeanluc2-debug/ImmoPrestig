-- Lecture de ses propres lignes par les membres de l'équipe.
-- Sans ces politiques SELECT, l'application ne peut pas charger le rôle ni les
-- permissions du membre connecté et retombe sur "lecture seule" partout
-- (aucun bouton/menu visible, paramètres inaccessibles).
-- Politiques additives et idempotentes : aucun accès existant n'est retiré.

-- Sa propre adhésion à l'agence
DROP POLICY IF EXISTS "Members can view their own membership" ON public.agency_members;
CREATE POLICY "Members can view their own membership"
ON public.agency_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Son propre rôle
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Ses propres permissions granulaires
DROP POLICY IF EXISTS "Members can view their own permissions" ON public.member_permissions;
CREATE POLICY "Members can view their own permissions"
ON public.member_permissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.id = member_permissions.member_id
      AND am.user_id = auth.uid()
  )
);

-- Son propre profil
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- L'agence à laquelle il appartient (nom, logo, branding)
DROP POLICY IF EXISTS "Members can view their agency" ON public.agencies;
CREATE POLICY "Members can view their agency"
ON public.agencies FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.agency_id = agencies.id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

-- Vérification : chaque table doit avoir au moins 1 politique SELECT listée ici
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('agency_members', 'user_roles', 'member_permissions', 'profiles', 'agencies')
ORDER BY tablename, cmd, policyname;
