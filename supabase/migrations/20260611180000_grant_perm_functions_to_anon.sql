-- Les fonctions de permission étaient exécutables uniquement par "authenticated".
-- Quand une politique RLS les évalue pour le rôle "anon" (requête non connectée,
-- ex. pages publiques), la requête entière échoue avec
-- "permission denied for function ..." au lieu de simplement ne rien retourner.
-- Pour anon, auth.uid() est NULL : les fonctions ne révèlent rien.

GRANT EXECUTE ON FUNCTION public.has_member_permission_for_user(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.permitted_user_ids(text) TO anon;
