ALTER TABLE public.guided_tour_states
ADD COLUMN IF NOT EXISTS tour_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.guided_tour_states
DROP CONSTRAINT IF EXISTS guided_tour_states_user_id_tour_key_key;

ALTER TABLE public.guided_tour_states
ADD CONSTRAINT guided_tour_states_user_id_tour_key_tour_version_key
UNIQUE (user_id, tour_key, tour_version);