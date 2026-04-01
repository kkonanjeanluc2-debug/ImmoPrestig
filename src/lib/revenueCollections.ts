type RevenuePayment = {
  amount: number | string;
  paid_amount?: number | string | null;
  paid_date?: string | null;
  due_date?: string | null;
  status?: string | null;
  payment_months?: string[] | null;
};

const FRENCH_MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export const normalizePaymentStatus = (status?: string | null) => {
  const normalized = (status || "").toLowerCase();
  const map: Record<string, string> = {
    paye: "paid",
    payé: "paid",
    paid: "paid",
    pending: "pending",
    en_attente: "pending",
    "en attente": "pending",
    late: "late",
    overdue: "late",
    impaye: "late",
    impayé: "late",
  };

  return map[normalized] || normalized;
};

export const toYearMonth = (month: string): string | null => {
  if (/^\d{4}-\d{2}$/.test(month)) return month;

  const parts = month.split(" ");
  if (parts.length === 2) {
    const monthIndex = FRENCH_MONTH_NAMES.indexOf(parts[0]);
    if (monthIndex >= 0) {
      return `${parts[1]}-${String(monthIndex + 1).padStart(2, "0")}`;
    }
  }

  return month.length >= 7 ? month.substring(0, 7) : null;
};

export const countOverlappingMonths = (
  paymentMonths: string[] | null | undefined,
  fromDate: string,
  toDate: string,
) => {
  if (!paymentMonths?.length) return 0;

  const fromYM = fromDate.substring(0, 7);
  const toYM = toDate.substring(0, 7);

  return paymentMonths.reduce((count, month) => {
    const ym = toYearMonth(month);
    if (!ym) return count;
    return ym >= fromYM && ym <= toYM ? count + 1 : count;
  }, 0);
};

export const getCollectedRevenueForPeriod = (
  payments: RevenuePayment[],
  fromDate: string,
  toDate: string,
) => {
  return payments.reduce((sum, payment) => {
    // Skip virtual payments
    if ((payment as any)._isVirtual) return sum;

    const status = normalizePaymentStatus(payment.status);
    const paidDate = payment.paid_date || null;

    // Only count payments whose paid_date falls within the period
    if (!paidDate) {
      // For pending/late with partial payment, check paid_date only
      if ((status === "pending" || status === "late") && Number(payment.paid_amount) > 0) {
        return sum; // no paid_date means we can't attribute it to a period
      }
      return sum;
    }

    const paidDateOnly = paidDate.substring(0, 10);
    const isPaidInPeriod = paidDateOnly >= fromDate && paidDateOnly <= toDate;

    if (!isPaidInPeriod) return sum;

    if (status === "paid") {
      const totalAmount = Number(payment.paid_amount) || Number(payment.amount) || 0;
      return sum + totalAmount;
    }

    if ((status === "pending" || status === "late") && Number(payment.paid_amount) > 0) {
      return sum + Number(payment.paid_amount);
    }

    return sum;
  }, 0);
};

export const getCollectedRevenueByMonth = (
  payments: RevenuePayment[],
  monthStarts: string[],
) => {
  return monthStarts.map((monthStart) => {
    const date = new Date(`${monthStart}T00:00:00`);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const monthEndStr = `${monthStart.substring(0, 7)}-${String(monthEnd.getDate()).padStart(2, "0")}`;

    return getCollectedRevenueForPeriod(payments, monthStart, monthEndStr);
  });
};
