-- Fix: Set ends_at for the Loua agency Starter monthly subscription (started Jan 24, should expire Feb 24)
UPDATE agency_subscriptions 
SET ends_at = starts_at + INTERVAL '1 month'
WHERE id = 'd692e9f9-0109-4e49-a311-0cff522b7715' 
AND ends_at IS NULL 
AND billing_cycle = 'monthly';

-- Also fix any other monthly/yearly subscriptions missing ends_at (excluding lifetime and free plans)
UPDATE agency_subscriptions asub
SET ends_at = CASE 
  WHEN asub.billing_cycle = 'monthly' THEN asub.starts_at + INTERVAL '1 month'
  WHEN asub.billing_cycle = 'yearly' THEN asub.starts_at + INTERVAL '1 year'
  ELSE asub.ends_at
END
FROM subscription_plans sp
WHERE asub.plan_id = sp.id
AND asub.ends_at IS NULL
AND asub.billing_cycle IN ('monthly', 'yearly')
AND sp.price_monthly > 0;