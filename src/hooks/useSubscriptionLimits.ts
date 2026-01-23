import { useAgencySubscription } from "./useAgencySubscription";
import { useProperties } from "./useProperties";
import { useTenants } from "./useTenants";
import { useMemo } from "react";

export interface SubscriptionLimits {
  maxProperties: number | null;
  maxTenants: number | null;
  maxUsers: number | null;
  currentProperties: number;
  currentTenants: number;
  canCreateProperty: boolean;
  canCreateTenant: boolean;
  propertiesRemaining: number | null;
  tenantsRemaining: number | null;
  planName: string;
  isLoading: boolean;
}

export function useSubscriptionLimits(): SubscriptionLimits {
  const { data: subscription, isLoading: subLoading } = useAgencySubscription();
  const { data: properties, isLoading: propLoading } = useProperties();
  const { data: tenants, isLoading: tenantLoading } = useTenants();

  return useMemo(() => {
    const isLoading = subLoading || propLoading || tenantLoading;
    
    const maxProperties = subscription?.plan?.max_properties ?? null;
    const maxTenants = subscription?.plan?.max_tenants ?? null;
    const maxUsers = subscription?.plan?.max_users ?? null;
    const planName = subscription?.plan?.name ?? "Gratuit";
    
    const currentProperties = properties?.length ?? 0;
    const currentTenants = tenants?.length ?? 0;

    // null means unlimited
    const canCreateProperty = maxProperties === null || currentProperties < maxProperties;
    const canCreateTenant = maxTenants === null || currentTenants < maxTenants;

    const propertiesRemaining = maxProperties === null ? null : Math.max(0, maxProperties - currentProperties);
    const tenantsRemaining = maxTenants === null ? null : Math.max(0, maxTenants - currentTenants);

    return {
      maxProperties,
      maxTenants,
      maxUsers,
      currentProperties,
      currentTenants,
      canCreateProperty,
      canCreateTenant,
      propertiesRemaining,
      tenantsRemaining,
      planName,
      isLoading,
    };
  }, [subscription, properties, tenants, subLoading, propLoading, tenantLoading]);
}
