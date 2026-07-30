-- Ajout des champs contact du propriétaire terrien sur la table lotissements
-- Ces champs alimentent {cedant_telephone} et {cedant_cni} dans l'attestation de cession

ALTER TABLE public.lotissements
  ADD COLUMN IF NOT EXISTS proprietaire_telephone text,
  ADD COLUMN IF NOT EXISTS proprietaire_cni       text;
