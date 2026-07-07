-- ============================================================
-- MODULE : PROMOTION IMMOBILIÈRE — ImmoPrestige CI
-- Date   : 2026-06-29
-- ============================================================

-- 1. PROGRAMMES IMMOBILIERS
CREATE TABLE IF NOT EXISTS programmes_immobiliers (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        UUID NOT NULL REFERENCES auth.users(id),
  nom                            TEXT NOT NULL,
  description                    TEXT,
  localisation                   TEXT NOT NULL,
  commune                        TEXT NOT NULL,
  ville                          TEXT NOT NULL DEFAULT 'Abidjan',
  type_programme                 TEXT NOT NULL CHECK (type_programme IN ('villa', 'appartement', 'mixte', 'terrain_loti')),
  statut                         TEXT NOT NULL DEFAULT 'en_preparation'
                                   CHECK (statut IN ('en_preparation', 'en_commercialisation', 'en_construction', 'livre', 'cloture')),
  date_lancement                 DATE,
  date_livraison_prevue          DATE,
  date_livraison_effective       DATE,
  nombre_lots_total              INTEGER NOT NULL DEFAULT 0,
  prix_min_fcfa                  BIGINT,
  prix_max_fcfa                  BIGINT,
  superficie_terrain_m2          NUMERIC(12,2),
  numero_acd                     TEXT,
  numero_permis_construire       TEXT,
  numero_agrement_promoteur      TEXT,
  garantie_financiere_achevement BOOLEAN DEFAULT FALSE,
  nom_garant                     TEXT,
  image_principale_url           TEXT,
  images_urls                    TEXT[],
  plan_masse_url                 TEXT,
  created_at                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LOTS DU PROGRAMME
CREATE TABLE IF NOT EXISTS lots_programme (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id  UUID NOT NULL REFERENCES programmes_immobiliers(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  reference_lot TEXT NOT NULL,
  type_bien     TEXT NOT NULL CHECK (type_bien IN ('villa', 'appartement', 'duplex', 'studio', 'terrain')),
  statut        TEXT NOT NULL DEFAULT 'disponible'
                  CHECK (statut IN ('disponible', 'reserve', 'vendu', 'indisponible')),
  superficie_m2  NUMERIC(10,2),
  nombre_pieces  INTEGER,
  etage          INTEGER,
  orientation    TEXT,
  prix_fcfa      BIGINT NOT NULL,
  description    TEXT,
  plan_url       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(programme_id, reference_lot)
);

-- 3. CLIENTS ACHETEURS
CREATE TABLE IF NOT EXISTS clients_acheteurs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id),
  nom                 TEXT NOT NULL,
  prenoms             TEXT NOT NULL,
  telephone           TEXT NOT NULL,
  telephone_2         TEXT,
  email               TEXT,
  adresse             TEXT,
  commune             TEXT,
  ville               TEXT DEFAULT 'Abidjan',
  nationalite         TEXT DEFAULT 'Ivoirienne',
  numero_cni          TEXT,
  date_expiration_cni DATE,
  profession          TEXT,
  employeur           TEXT,
  type_client         TEXT DEFAULT 'particulier'
                        CHECK (type_client IN ('particulier', 'entreprise', 'diaspora')),
  nom_entreprise      TEXT,
  numero_rccm         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RÉSERVATIONS
CREATE TABLE IF NOT EXISTS reservations_lots (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      UUID NOT NULL REFERENCES auth.users(id),
  programme_id                 UUID NOT NULL REFERENCES programmes_immobiliers(id),
  lot_id                       UUID NOT NULL REFERENCES lots_programme(id),
  client_id                    UUID NOT NULL REFERENCES clients_acheteurs(id),
  statut                       TEXT NOT NULL DEFAULT 'en_cours'
                                 CHECK (statut IN ('en_cours', 'confirmee', 'acte_signe', 'annulee', 'resiliee')),
  date_reservation             DATE NOT NULL DEFAULT CURRENT_DATE,
  montant_depot_garantie_fcfa  BIGINT NOT NULL DEFAULT 0,
  date_versement_depot         DATE,
  depot_verse                  BOOLEAN DEFAULT FALSE,
  compte_sequestre             TEXT,
  prix_vente_fcfa              BIGINT NOT NULL,
  mode_financement             TEXT CHECK (mode_financement IN ('comptant', 'credit_bancaire', 'echelonne_promoteur', 'mixte')),
  banque_financement           TEXT,
  date_fin_retractation        DATE,
  date_signature_acte_prevue   DATE,
  date_signature_acte_effective DATE,
  notaire_nom                  TEXT,
  notaire_contact              TEXT,
  numero_contrat_reservation   TEXT UNIQUE,
  numero_acte_vente            TEXT,
  observations                 TEXT,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. APPELS DE FONDS (VEFA)
CREATE TABLE IF NOT EXISTS appels_de_fonds (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id          UUID NOT NULL REFERENCES reservations_lots(id) ON DELETE CASCADE,
  numero_appel            INTEGER NOT NULL,
  libelle                 TEXT NOT NULL,
  stade_travaux           TEXT NOT NULL
                            CHECK (stade_travaux IN ('depot_garantie','fondations','hors_eau','achevement_travaux','remise_cles','autre')),
  pourcentage_prix        NUMERIC(5,2),
  montant_fcfa            BIGINT NOT NULL,
  date_appel              DATE NOT NULL,
  date_echeance           DATE,
  statut_paiement         TEXT NOT NULL DEFAULT 'en_attente'
                            CHECK (statut_paiement IN ('en_attente','partiellement_paye','paye','en_retard')),
  montant_paye_fcfa       BIGINT DEFAULT 0,
  date_paiement           DATE,
  mode_paiement           TEXT CHECK (mode_paiement IN ('virement','cheque','especes','mobile_money','banque')),
  reference_paiement      TEXT,
  attestation_travaux_url TEXT,
  observations            TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_programmes_user_id     ON programmes_immobiliers(user_id);
CREATE INDEX IF NOT EXISTS idx_lots_programme_id      ON lots_programme(programme_id);
CREATE INDEX IF NOT EXISTS idx_lots_statut            ON lots_programme(statut);
CREATE INDEX IF NOT EXISTS idx_reservations_programme ON reservations_lots(programme_id);
CREATE INDEX IF NOT EXISTS idx_reservations_lot       ON reservations_lots(lot_id);
CREATE INDEX IF NOT EXISTS idx_reservations_client    ON reservations_lots(client_id);
CREATE INDEX IF NOT EXISTS idx_reservations_statut    ON reservations_lots(statut);
CREATE INDEX IF NOT EXISTS idx_appels_reservation     ON appels_de_fonds(reservation_id);
CREATE INDEX IF NOT EXISTS idx_appels_statut          ON appels_de_fonds(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_clients_user_id        ON clients_acheteurs(user_id);

-- ============================================================
-- TRIGGERS updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_promotion_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_programmes_updated_at
  BEFORE UPDATE ON programmes_immobiliers
  FOR EACH ROW EXECUTE FUNCTION update_promotion_updated_at();

CREATE TRIGGER trg_lots_updated_at
  BEFORE UPDATE ON lots_programme
  FOR EACH ROW EXECUTE FUNCTION update_promotion_updated_at();

CREATE TRIGGER trg_reservations_updated_at
  BEFORE UPDATE ON reservations_lots
  FOR EACH ROW EXECUTE FUNCTION update_promotion_updated_at();

CREATE TRIGGER trg_appels_updated_at
  BEFORE UPDATE ON appels_de_fonds
  FOR EACH ROW EXECUTE FUNCTION update_promotion_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE programmes_immobiliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots_programme          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations_lots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appels_de_fonds         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients_acheteurs       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "programmes_user_policy"
  ON programmes_immobiliers FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "lots_user_policy"
  ON lots_programme FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "reservations_user_policy"
  ON reservations_lots FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "appels_user_policy"
  ON appels_de_fonds FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM reservations_lots r
    WHERE r.id = reservation_id AND r.user_id = auth.uid()
  ));

CREATE POLICY "clients_user_policy"
  ON clients_acheteurs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
