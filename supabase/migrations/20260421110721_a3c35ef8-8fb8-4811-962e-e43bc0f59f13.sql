-- 1. Nettoyer les éventuels doublons (garder le plus récent par utilisateur)
WITH ranked AS (
  SELECT id,
         user_id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM public.user_roles
)
DELETE FROM public.user_roles ur
USING ranked r
WHERE ur.id = r.id
  AND r.rn > 1;

-- 2. Contrainte UNIQUE stricte : un seul rôle par utilisateur
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_unique'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 3. CHECK : user_id obligatoire et non nul (déjà NOT NULL mais on durcit)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_not_empty'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_user_id_not_empty
      CHECK (user_id IS NOT NULL);
  END IF;
END $$;

-- 4. CHECK : rôle doit appartenir à l'enum (défense contre cast manipulé)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_role_valid'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
      ADD CONSTRAINT user_roles_role_valid
      CHECK (role IN (
        'super_admin'::app_role,
        'admin'::app_role,
        'gestionnaire'::app_role,
        'comptable'::app_role,
        'caissiere'::app_role,
        'lecture_seule'::app_role,
        'locataire'::app_role
      ));
  END IF;
END $$;

-- 5. Index UNIQUE partiel : un seul super_admin sur toute la plateforme
-- Empêche structurellement la multiplication de comptes ultra-privilégiés
DROP INDEX IF EXISTS public.user_roles_single_super_admin_idx;
CREATE UNIQUE INDEX user_roles_single_super_admin_idx
  ON public.user_roles ((1))
  WHERE role = 'super_admin'::app_role;

-- 6. Index pour optimiser les lookups par rôle
CREATE INDEX IF NOT EXISTS user_roles_role_idx
  ON public.user_roles (role);
