import { useMemo } from "react";
import { usePayments } from "./usePayments";
import { useOwners, OwnerWithManagementType } from "./useOwners";
import { useProperties } from "./useProperties";
import { useTenants } from "./useTenants";

export interface CommissionData {
  paymentId: string;
  paymentDate: string;
  tenantName: string;
  propertyTitle: string;
  ownerName: string;
  ownerId: string;
  rentAmount: number;
  commissionPercentage: number;
  commissionAmount: number;
  managementTypeName: string;
}

export interface OwnerCommissionSummary {
  ownerId: string;
  ownerName: string;
  managementTypeName: string;
  commissionPercentage: number;
  totalRent: number;
  totalCommission: number;
  paymentCount: number;
}

export interface CommissionReport {
  period: string;
  startDate: string;
  endDate: string;
  totalRent: number;
  totalCommission: number;
  paymentCount: number;
  commissions: CommissionData[];
  byOwner: OwnerCommissionSummary[];
}

const FRENCH_MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

function toYearMonth(m: string): string | null {
  if (/^\d{4}-\d{2}$/.test(m)) return m;
  const parts = m.split(" ");
  if (parts.length === 2) {
    const monthIdx = FRENCH_MONTH_NAMES.indexOf(parts[0]);
    if (monthIdx >= 0) return `${parts[1]}-${String(monthIdx + 1).padStart(2, '0')}`;
  }
  return null;
}

function paymentMonthsOverlapRange(paymentMonths: string[] | null, startDate?: string, endDate?: string): boolean {
  if (!paymentMonths || !Array.isArray(paymentMonths) || paymentMonths.length === 0) return false;
  if (!startDate || !endDate) return true; // no range filter = all match
  const fromYM = startDate.substring(0, 7);
  const toYM = endDate.substring(0, 7);
  return paymentMonths.some(m => {
    const ym = toYearMonth(m);
    return ym ? ym >= fromYM && ym <= toYM : false;
  });
}

function countOverlapping(paymentMonths: string[], startDate: string, endDate: string): number {
  const fromYM = startDate.substring(0, 7);
  const toYM = endDate.substring(0, 7);
  let count = 0;
  paymentMonths.forEach(m => {
    const ym = toYearMonth(m);
    if (ym && ym >= fromYM && ym <= toYM) count++;
  });
  return count;
}

export function useCommissions(startDate?: string, endDate?: string) {
  const { data: payments = [] } = usePayments();
  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();

  const report = useMemo<CommissionReport>(() => {
    // Filter paid payments AND partial payments within date range
    const filteredPayments = payments.filter((p) => {
      const isPaid = p.status === "paid" && !!p.paid_date;
      const isPartial = p.status !== "paid" && ((p as any).paid_amount || 0) > 0;
      
      if (!isPaid && !isPartial) return false;

      // Use paid_date as the collection date (date d'encaissement)
      const collectionDate = p.paid_date?.substring(0, 10);
      if (!collectionDate) return false;

      if (startDate && collectionDate < startDate) return false;
      if (endDate && collectionDate > endDate) return false;
      return true;
    });

    // Build commission data for each payment
    const commissions: CommissionData[] = [];
    const ownerTotals: Record<string, OwnerCommissionSummary> = {};

    for (const payment of filteredPayments) {
      // Find tenant
      const tenant = tenants.find((t) => t.id === payment.tenant_id);
      if (!tenant || !tenant.property_id) continue;

      // Find property
      const property = properties.find((p) => p.id === tenant.property_id);
      if (!property || !property.owner_id) continue;

      // Find owner with management type
      const owner = owners.find((o) => o.id === property.owner_id) as OwnerWithManagementType | undefined;
      if (!owner) continue;

      // Get commission percentage from management type
      const managementType = owner.management_type;
      const commissionPercentage = managementType?.percentage || 0;
      const managementTypeName = managementType?.name || "Aucun";

      // Calculate amount - use paid_amount for partial payments
      const paymentMonths = (payment as any).payment_months as string[] | null;
      const isMultiMonth = paymentMonths && Array.isArray(paymentMonths) && paymentMonths.length > 1;
      const isPartial = payment.status !== "paid" && ((payment as any).paid_amount || 0) > 0;
      let rentAmount = isPartial ? Number((payment as any).paid_amount) : payment.amount;
      
      if (isMultiMonth && !isPartial && startDate && endDate) {
        const perMonth = Math.round(payment.amount / paymentMonths.length);
        const overlapping = countOverlapping(paymentMonths, startDate, endDate);
        rentAmount = perMonth * overlapping;
      }

      const commissionAmount = Math.round((rentAmount * commissionPercentage) / 100);

      const commissionData: CommissionData = {
        paymentId: payment.id,
        paymentDate: payment.paid_date || (payment as any).due_date || "",
        tenantName: tenant.name + (isPartial ? " (partiel)" : ""),
        propertyTitle: property.title,
        ownerName: owner.name,
        ownerId: owner.id,
        rentAmount,
        commissionPercentage,
        commissionAmount,
        managementTypeName,
      };

      commissions.push(commissionData);

      // Aggregate by owner
      if (!ownerTotals[owner.id]) {
        ownerTotals[owner.id] = {
          ownerId: owner.id,
          ownerName: owner.name,
          managementTypeName,
          commissionPercentage,
          totalRent: 0,
          totalCommission: 0,
          paymentCount: 0,
        };
      }
      ownerTotals[owner.id].totalRent += rentAmount;
      ownerTotals[owner.id].totalCommission += commissionAmount;
      ownerTotals[owner.id].paymentCount += 1;
    }

    // Sort commissions by date (most recent first)
    commissions.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

    // Convert owner totals to array and sort by commission
    const byOwner = Object.values(ownerTotals).sort(
      (a, b) => b.totalCommission - a.totalCommission
    );

    // Calculate totals
    const totalRent = commissions.reduce((sum, c) => sum + c.rentAmount, 0);
    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    return {
      period: startDate && endDate ? `${startDate} - ${endDate}` : "Toutes périodes",
      startDate: startDate || "",
      endDate: endDate || "",
      totalRent,
      totalCommission,
      paymentCount: commissions.length,
      commissions,
      byOwner,
    };
  }, [payments, owners, properties, tenants, startDate, endDate]);

  return report;
}

// Get commission info for a specific payment
export function usePaymentCommission(paymentId: string) {
  const { data: payments = [] } = usePayments();
  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();

  return useMemo(() => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return null;

    const tenant = tenants.find((t) => t.id === payment.tenant_id);
    if (!tenant || !tenant.property_id) return null;

    const property = properties.find((p) => p.id === tenant.property_id);
    if (!property || !property.owner_id) return null;

    const owner = owners.find((o) => o.id === property.owner_id) as OwnerWithManagementType | undefined;
    if (!owner) return null;

    const managementType = owner.management_type;
    const commissionPercentage = managementType?.percentage || 0;
    const commissionAmount = Math.round((payment.amount * commissionPercentage) / 100);

    return {
      ownerName: owner.name,
      managementTypeName: managementType?.name || "Aucun",
      commissionPercentage,
      commissionAmount,
      netAmount: payment.amount - commissionAmount,
    };
  }, [paymentId, payments, owners, properties, tenants]);
}
