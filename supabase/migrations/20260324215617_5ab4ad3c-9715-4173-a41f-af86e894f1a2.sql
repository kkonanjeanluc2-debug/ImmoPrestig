
ALTER TABLE public.owner_payouts 
ADD COLUMN payout_month integer,
ADD COLUMN payout_year integer;

-- Backfill existing rows from payout_date
UPDATE public.owner_payouts 
SET payout_month = EXTRACT(MONTH FROM payout_date::date),
    payout_year = EXTRACT(YEAR FROM payout_date::date);

-- Make columns NOT NULL after backfill
ALTER TABLE public.owner_payouts 
ALTER COLUMN payout_month SET NOT NULL,
ALTER COLUMN payout_year SET NOT NULL;

-- Unique constraint to prevent duplicates for same owner/month/year
ALTER TABLE public.owner_payouts 
ADD CONSTRAINT owner_payouts_owner_month_year_unique UNIQUE (owner_id, payout_month, payout_year, user_id);
