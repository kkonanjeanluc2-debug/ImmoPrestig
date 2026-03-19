type PaymentLike = {
  status?: string | null;
  paid_amount?: number | null;
  amount: number;
  paid_date?: string | null;
  created_at?: string | null;
};

export const wasPaymentCollectedInPeriod = (
  payment: Pick<PaymentLike, "paid_date" | "created_at">,
  periodStart: string,
  periodEnd: string,
) => {
  const paidDate = payment.paid_date?.substring(0, 10);
  const createdDate = payment.created_at?.substring(0, 10);

  return (
    !!paidDate && paidDate >= periodStart && paidDate <= periodEnd
  ) || (
    !paidDate && !!createdDate && createdDate >= periodStart && createdDate <= periodEnd
  );
};

export const getCollectedAmount = (payment: Pick<PaymentLike, "status" | "paid_amount" | "amount">) => {
  if (payment.status === "paid") return payment.amount;
  return payment.paid_amount || 0;
};

export const getTenantCollectedAmountForPeriod = <T extends PaymentLike & { tenant_id?: string | null }>(
  payments: T[],
  tenantId: string,
  periodStart: string,
  periodEnd: string,
) => {
  return payments
    .filter((payment) => {
      if (payment.tenant_id !== tenantId) return false;
      if (payment.status !== "paid" && !(payment.paid_amount && payment.paid_amount > 0)) return false;
      return wasPaymentCollectedInPeriod(payment, periodStart, periodEnd);
    })
    .reduce((sum, payment) => sum + getCollectedAmount(payment), 0);
};
