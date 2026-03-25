
-- Table pour les modèles d'attestation villageoise
CREATE TABLE public.attestation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  district TEXT DEFAULT '',
  commune TEXT DEFAULT '',
  village TEXT DEFAULT '',
  chef_village_name TEXT DEFAULT '',
  chef_village_titre TEXT DEFAULT '',
  arrete_numero TEXT DEFAULT '',
  arrete_date TEXT DEFAULT '',
  lotissement_origin_name TEXT DEFAULT '',
  arrete_approbation TEXT DEFAULT '',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.attestation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their attestation templates"
  ON public.attestation_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ajouter attestation_template_id sur lotissements
ALTER TABLE public.lotissements ADD COLUMN attestation_template_id UUID REFERENCES public.attestation_templates(id) ON DELETE SET NULL;
