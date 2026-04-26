-- Garantir l'envoi complet des lignes lors des changements
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Ajouter la table à la publication realtime (no-op si déjà présente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END$$;