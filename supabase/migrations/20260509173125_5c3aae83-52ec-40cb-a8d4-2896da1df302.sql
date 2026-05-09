ALTER TABLE public.parcelles
DROP CONSTRAINT IF EXISTS parcelles_lotissement_id_plot_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS parcelles_lotissement_ilot_plot_active_unique
ON public.parcelles (
  lotissement_id,
  COALESCE(ilot_id, '00000000-0000-0000-0000-000000000000'::uuid),
  plot_number
)
WHERE deleted_at IS NULL;