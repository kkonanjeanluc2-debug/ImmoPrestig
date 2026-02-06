-- Backfill existing KKiaPay payments into online_rent_payments
INSERT INTO public.online_rent_payments (user_id, payment_id, tenant_id, amount, payment_method, status, paid_at, created_at)
SELECT 
  p.user_id,
  p.id as payment_id,
  p.tenant_id,
  p.amount,
  'kkiapay' as payment_method,
  'received' as status,
  COALESCE(p.paid_date::timestamp with time zone, p.updated_at) as paid_at,
  COALESCE(p.paid_date::timestamp with time zone, p.updated_at) as created_at
FROM public.payments p
WHERE p.method = 'kkiapay'
  AND p.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM public.online_rent_payments orp 
    WHERE orp.payment_id = p.id
  );