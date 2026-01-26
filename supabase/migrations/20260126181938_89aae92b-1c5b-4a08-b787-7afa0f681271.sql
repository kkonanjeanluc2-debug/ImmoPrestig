-- Table pour stocker les signatures des contrats
CREATE TABLE public.contract_signatures (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
    signer_type TEXT NOT NULL CHECK (signer_type IN ('landlord', 'tenant')),
    signer_name TEXT NOT NULL,
    signer_email TEXT,
    signature_data TEXT, -- Base64 de l'image de signature dessinée (petit fichier)
    signature_text TEXT, -- Texte de signature si mode textuel
    signature_type TEXT NOT NULL CHECK (signature_type IN ('drawn', 'typed')),
    signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    signature_token UUID UNIQUE, -- Token pour signature externe (locataire)
    token_expires_at TIMESTAMP WITH TIME ZONE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche par contrat
CREATE INDEX idx_contract_signatures_contract_id ON public.contract_signatures(contract_id);

-- Index pour recherche par token
CREATE INDEX idx_contract_signatures_token ON public.contract_signatures(signature_token) WHERE signature_token IS NOT NULL;

-- Activer RLS
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs peuvent voir leurs propres signatures
CREATE POLICY "Users can view their own contract signatures"
ON public.contract_signatures
FOR SELECT
USING (auth.uid() = user_id);

-- Politique: les utilisateurs peuvent créer leurs propres signatures
CREATE POLICY "Users can insert their own contract signatures"
ON public.contract_signatures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique: accès public pour signature via token valide (locataire)
CREATE POLICY "Public can view signatures with valid token"
ON public.contract_signatures
FOR SELECT
USING (
    signature_token IS NOT NULL 
    AND token_expires_at > now()
);

-- Politique: mise à jour via token valide (pour signature locataire)
CREATE POLICY "Can update signature with valid token"
ON public.contract_signatures
FOR UPDATE
USING (
    signature_token IS NOT NULL 
    AND token_expires_at > now()
    AND signature_data IS NULL 
    AND signature_text IS NULL
);

-- Ajouter colonne statut de signature au contrat
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending' 
CHECK (signature_status IN ('pending', 'landlord_signed', 'fully_signed'));