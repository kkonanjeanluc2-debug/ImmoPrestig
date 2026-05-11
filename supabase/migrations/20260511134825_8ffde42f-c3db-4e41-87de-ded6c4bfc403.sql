-- Allow mutations on prefinanced lots (no underlying vente record)
ALTER TABLE public.mutations_parcelles
  ALTER COLUMN vente_id DROP NOT NULL;