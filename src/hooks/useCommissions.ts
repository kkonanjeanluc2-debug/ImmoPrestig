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

export function useCommissions(startDate?: string, endDate?: string) {
  const { data: payments = [] } = usePayments();
  const { data: owners = [] } = useOwners();
  const { data: properties = [] } = useProperties();
  const { data: tenants = [] } = useTenants();

  const report = useMemo<CommissionReport>(() => {
    // Filter paid payments within date range
    const filteredPayments = payments.filter((p) => {
      if (p.status !== "paid" || !p.paid_date) return false;
      if (startDate && p.paid_date < startDate) return false;
      if (endDate && p.paid_date > endDate) return false;
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
      const commissionAmount = Math.round((payment.amount * commissionPercentage) / 100);
      const managementTypeName = managementType?.name || "Aucun";

      const commissionData: CommissionData = {
        paymentId: payment.id,
        paymentDate: payment.paid_date!,
        tenantName: tenant.name,
        propertyTitle: property.title,
        ownerName: owner.name,
        ownerId: owner.id,
        rentAmount: payment.amount,
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
      ownerTotals[owner.id].totalRent += payment.amount;
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
