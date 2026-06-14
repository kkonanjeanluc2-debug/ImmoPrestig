-- ============================================================
-- SECURITE : Correction des policies du bucket property-images
-- Les 3 policies de mutation n'avaient aucune vérification
-- d'authentification — n'importe qui pouvait uploader/supprimer.
-- ============================================================

-- Supprimer les anciennes policies permissives
DROP POLICY IF EXISTS "Users can upload property images"  ON storage.objects;
DROP POLICY IF EXISTS "Users can update property images"  ON storage.objects;
DROP POLICY IF EXISTS "Users can delete property images"  ON storage.objects;

-- INSERT : utilisateur authentifié obligatoire
CREATE POLICY "Authenticated users can upload property images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'property-images'
  AND auth.role() = 'authenticated'
);

-- UPDATE : utilisateur authentifié obligatoire
CREATE POLICY "Authenticated users can update property images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'property-images'
  AND auth.role() = 'authenticated'
);

-- DELETE : utilisateur authentifié obligatoire
CREATE POLICY "Authenticated users can delete property images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'property-images'
  AND auth.role() = 'authenticated'
);

-- ============================================================
-- SECURITE : Renforcer la policy INSERT de activity_logs
-- (déjà protégée par WITH CHECK user_id = auth.uid(),
--  on ajoute une validation explicite entity_type pour
--  limiter les valeurs acceptées et réduire le bruit)
-- ============================================================
-- Note : la policy existante est suffisante.
-- Pas de modification nécessaire sur activity_logs.

-- ============================================================
-- SECURITE : Restreindre l'inscription (signup) aux seules
-- adresses email valides en limitant les tentatives répétées
-- via une table de tracking (rate limit applicatif).
-- Cette table est gérée côté Edge Function si besoin.
-- ============================================================
-- Pas de changement SQL requis : Supabase gère le rate-limit
-- natif sur auth.users (configurable dans le dashboard).
