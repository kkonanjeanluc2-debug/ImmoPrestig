-- Correctif post-import : le trigger handle_new_user_role a attribué le rôle
-- global 'admin' à tous les comptes importés dans auth.users, et l'import des
-- vrais rôles a été ignoré (ON CONFLICT DO NOTHING). Les membres apparaissent
-- donc "Administrateur" et contournent leurs permissions granulaires.
-- On réaligne user_roles sur le rôle d'équipe (agency_members.role).

UPDATE public.user_roles ur
SET role = am.role
FROM public.agency_members am
WHERE am.user_id = ur.user_id
  AND am.status = 'active'
  AND ur.role <> 'super_admin'::app_role
  AND ur.role IS DISTINCT FROM am.role;

-- Vérification 1 : pour chaque membre, role_equipe et role_global doivent être identiques
SELECT u.email,
       am.role  AS role_equipe,
       ur.role  AS role_global,
       am.status
FROM public.agency_members am
JOIN auth.users u ON u.id = am.user_id
LEFT JOIN public.user_roles ur ON ur.user_id = am.user_id
ORDER BY u.email;

-- Vérification 2 : le trigger handle_new_user a pu créer une agence parasite
-- pour chaque compte importé. Lister les agences et leur nombre de membres :
-- celles avec 0 membre appartenant à un utilisateur qui est déjà membre d'une
-- autre agence sont des parasites (me montrer ce résultat avant tout nettoyage).
SELECT u.email AS proprietaire,
       a.name  AS agence,
       a.created_at::date AS creee_le,
       (SELECT count(*) FROM public.agency_members am WHERE am.agency_id = a.id) AS nb_membres
FROM public.agencies a
JOIN auth.users u ON u.id = a.user_id
ORDER BY a.created_at;
