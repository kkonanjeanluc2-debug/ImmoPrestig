
-- Table pour les documents liés aux biens d'achat immobilier
CREATE TABLE public.documents_achats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bien_id UUID NOT NULL REFERENCES public.biens_achat(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'autre',
  file_url TEXT,
  file_size TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documents_achats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own documents_achats"
ON public.documents_achats FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents_achats"
ON public.documents_achats FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents_achats"
ON public.documents_achats FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents_achats"
ON public.documents_achats FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_documents_achats_updated_at
BEFORE UPDATE ON public.documents_achats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for achat documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents-achats', 'documents-achats', false);

-- Storage policies
CREATE POLICY "Users can upload achat documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents-achats' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their achat documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents-achats' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their achat documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents-achats' AND auth.uid()::text = (storage.foldername(name))[1]);
