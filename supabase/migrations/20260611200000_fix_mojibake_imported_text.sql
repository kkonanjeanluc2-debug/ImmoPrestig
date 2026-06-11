-- Répare les textes à double encodage issus de l'import (mojibake) :
-- « Ã© » → « é », « Ã´ » → « ô », « â€™ » → « ' », etc.
-- Parcourt toutes les colonnes texte des tables du schéma public et ne touche
-- que les valeurs contenant des marqueurs de mojibake.

-- Conversion sûre : retourne la valeur d'origine si la conversion échoue
-- (ex. la valeur contient des emojis, donc pas du double encodage).
CREATE OR REPLACE FUNCTION public.fix_mojibake(t text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN convert_from(convert_to(t, 'WIN1252'), 'UTF8');
EXCEPTION WHEN OTHERS THEN
  RETURN t;
END $$;

DO $$
DECLARE
  r record;
  n bigint;
  total bigint := 0;
  report text := '';
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying')
      AND c.is_generated = 'NEVER'
      AND c.is_updatable = 'YES'
  LOOP
    BEGIN
      EXECUTE format(
        'UPDATE public.%I SET %I = public.fix_mojibake(%I)
         WHERE %I LIKE ''%%Ã%%'' OR %I LIKE ''%%â€%%'' OR %I LIKE ''%%Â%%''',
        r.table_name, r.column_name, r.column_name,
        r.column_name, r.column_name, r.column_name
      );
      GET DIAGNOSTICS n = ROW_COUNT;
      IF n > 0 THEN
        total := total + n;
        report := report || r.table_name || '.' || r.column_name || ' : ' || n || E'\n';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      report := report || r.table_name || '.' || r.column_name || ' : IGNORE (' || SQLERRM || ')' || E'\n';
    END;
  END LOOP;
  PERFORM set_config('app.mojibake_report', 'Total valeurs corrigees : ' || total || E'\n' || report, true);
END $$;

-- Rapport : liste des colonnes corrigées et nombre de valeurs par colonne
SELECT current_setting('app.mojibake_report', true) AS rapport;
