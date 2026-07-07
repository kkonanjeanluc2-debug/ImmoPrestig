-- ============================================================
-- MODULE PROMOTIONS — Tables documents et visites (complément)
-- Date : 2026-06-29
-- ============================================================

-- 6. DOCUMENTS FOURNIS PAR LE CLIENT
CREATE TABLE IF NOT EXISTS documents_client (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations_lots(id) ON DELETE CASCADE,
  type_document  TEXT NOT NULL CHECK (type_document IN (
    'cni', 'passeport', 'justificatif_domicile', 'bulletins_salaire',
    'releves_bancaires', 'contrat_travail', 'attestation_employeur',
    'rccm', 'statuts_entreprise', 'autre'
  )),
  nom_document   TEXT NOT NULL,
  fichier_url    TEXT,
  date_reception DATE DEFAULT CURRENT_DATE,
  valide         BOOLEAN DEFAULT FALSE,
  observations   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 7. DOCUMENTS REMIS AU CLIENT (par le promoteur/agence)
CREATE TABLE IF NOT EXISTS documents_remis_client (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations_lots(id) ON DELETE CASCADE,
  type_document  TEXT NOT NULL CHECK (type_document IN (
    'contrat_reservation', 'acte_vente_notarie', 'reglement_copropriete',
    'notice_descriptive', 'plan_lot', 'attestation_gfa', 'appel_de_fonds',
    'recu_paiement', 'pv_remise_cles', 'titre_propriete', 'certificat_acd', 'autre'
  )),
  nom_document   TEXT NOT NULL,
  fichier_url    TEXT,
  date_remise    DATE DEFAULT CURRENT_DATE,
  signe_client   BOOLEAN DEFAULT FALSE,
  date_signature DATE,
  observations   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 8. VISITES DE CHANTIER
CREATE TABLE IF NOT EXISTS visites_chantier (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id   UUID NOT NULL REFERENCES programmes_immobiliers(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations_lots(id) ON DELETE SET NULL,
  type_visite    TEXT CHECK (type_visite IN ('commerciale', 'cloison', 'pre_livraison', 'livraison', 'autre')),
  date_visite    TIMESTAMPTZ NOT NULL,
  observations   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_docs_client_reservation   ON documents_client(reservation_id);
CREATE INDEX IF NOT EXISTS idx_docs_remis_reservation    ON documents_remis_client(reservation_id);
CREATE INDEX IF NOT EXISTS idx_visites_programme         ON visites_chantier(programme_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE documents_client      ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_remis_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites_chantier       ENABLE ROW LEVEL SECURITY;

-- Documents client : accès via la réservation (dont le user_id appartient à l'utilisateur)
CREATE POLICY "docs_client_auth_policy"
  ON documents_client FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservations_lots r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations_lots r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "docs_remis_auth_policy"
  ON documents_remis_client FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reservations_lots r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reservations_lots r
      WHERE r.id = reservation_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "visites_auth_policy"
  ON visites_chantier FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM programmes_immobiliers p
      WHERE p.id = programme_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM programmes_immobiliers p
      WHERE p.id = programme_id AND p.user_id = auth.uid()
    )
  );
