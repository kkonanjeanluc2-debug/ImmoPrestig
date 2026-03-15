ALTER TABLE public.achats_immobiliers ADD COLUMN is_agency_purchase boolean NOT NULL DEFAULT false;
ALTER TABLE public.achats_immobiliers ADD COLUMN post_purchase_action text DEFAULT NULL;
COMMENT ON COLUMN public.achats_immobiliers.post_purchase_action IS 'revente, location, or null if not yet decided';