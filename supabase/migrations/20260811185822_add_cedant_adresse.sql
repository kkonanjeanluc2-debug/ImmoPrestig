-- Ajout du domicile (adresse) du cédant, sur les deux sources possibles :
-- 1) le propriétaire terrien générique du lotissement
-- 2) un bénéficiaire (membre de famille) auquel un lot précis a été attribué
-- Alimente {cedant_adresse} dans l'attestation de cession.

ALTER TABLE public.lotissements
  ADD COLUMN IF NOT EXISTS proprietaire_adresse text;

ALTER TABLE public.beneficiaires_lots
  ADD COLUMN IF NOT EXISTS adresse text;
