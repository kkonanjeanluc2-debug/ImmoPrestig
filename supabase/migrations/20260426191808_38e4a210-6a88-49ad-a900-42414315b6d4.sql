
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Table for push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own push subscriptions - select" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions - select"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own push subscriptions - insert" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions - insert"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own push subscriptions - update" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions - update"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own push subscriptions - delete" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions - delete"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger function: send web push when a notification is created for a tenant portal user
CREATE OR REPLACE FUNCTION public.send_web_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_is_tenant boolean;
  v_url text;
  v_body jsonb;
BEGIN
  -- Only fire for tenant portal users
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE portal_user_id = NEW.user_id
      AND has_portal_access = true
  ) INTO v_is_tenant;

  IF NOT v_is_tenant THEN
    RETURN NEW;
  END IF;

  v_url := 'https://zkgfymmqvzifrqnczsjs.supabase.co/functions/v1/send-web-push';

  v_body := jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'body', NEW.message,
    'data', jsonb_build_object(
      'id', NEW.id,
      'entity_type', NEW.entity_type,
      'entity_id', NEW.entity_id,
      'url', '/'
    )
  );

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_body
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_web_push_on_notification ON public.notifications;
CREATE TRIGGER trg_send_web_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.send_web_push_on_notification();
