DO $$
DECLARE
  r record;
  v_has_data boolean;
BEGIN
  FOR r IN
    SELECT a.id AS shell_agency_id, a.user_id
    FROM public.agencies a
    WHERE EXISTS (
      SELECT 1 FROM public.agency_members am
      WHERE am.user_id = a.user_id
        AND am.status = 'active'
        AND am.agency_id <> a.id
    )
  LOOP
    SELECT (
      EXISTS (SELECT 1 FROM public.properties WHERE user_id = r.user_id)
      OR EXISTS (SELECT 1 FROM public.tenants WHERE user_id = r.user_id)
      OR EXISTS (SELECT 1 FROM public.owners WHERE user_id = r.user_id)
    ) INTO v_has_data;

    IF NOT v_has_data THEN
      DELETE FROM public.agency_subscriptions WHERE agency_id = r.shell_agency_id;
      DELETE FROM public.agencies WHERE id = r.shell_agency_id;
      RAISE NOTICE 'Removed shell agency % for user %', r.shell_agency_id, r.user_id;
    ELSE
      RAISE NOTICE 'Kept shell agency % for user % (has data)', r.shell_agency_id, r.user_id;
    END IF;
  END LOOP;
END $$;