import { useAgencySubscription } from "./useAgencySubscription";
import { useProperties } from "./useProperties";
import { useTenants } from "./useTenants";
import { useAgencyMemberCount } from "./useAgencyMembers";
import { useMemo } from "react";

export interface SubscriptionLimits {
  maxProperties: number | null;
  maxTenants: number | null;
  maxUsers: number | null;
  currentProperties: number;
  currentTenants: number;
  currentUsers: number;
  canCreateProperty: boolean;
  canCreateTenant: boolean;
  canCreateUser: boolean;
  propertiesRemaining: number | null;
  tenantsRemaining: number | null;
  usersRemaining: number | null;
  planName: string;
  isLoading: boolean;
}

export function useSubscriptionLimits(): SubscriptionLimits {
  const { data: subscription, isLoading: subLoading } = useAgencySubscription();
  const { data: properties, isLoading: propLoading } = useProperties();
  const { data: tenants, isLoading: tenantLoading } = useTenants();
  const { data: memberCount, isLoading: memberLoading } = useAgencyMemberCount();

  return useMemo(() => {
    const isLoading = subLoading || propLoading || tenantLoading || memberLoading;
    
    const maxProperties = subscription?.plan?.max_properties ?? null;
    const maxTenants = subscription?.plan?.max_tenants ?? null;
    const maxUsers = subscription?.plan?.max_users ?? null;
    const planName = subscription?.plan?.name ?? "Gratuit";
    
    const currentProperties = properties?.length ?? 0;
    const currentTenants = tenants?.length ?? 0;
    const currentUsers = (memberCount ?? 0) + 1; // +1 for agency owner

    // null means unlimited
    const canCreateProperty = maxProperties === null || currentProperties < maxProperties;
    const canCreateTenant = maxTenants === null || currentTenants < maxTenants;
    const canCreateUser = maxUsers === null || currentUsers < maxUsers;

    const propertiesRemaining = maxProperties === null ? null : Math.max(0, maxProperties - currentProperties);
    const tenantsRemaining = maxTenants === null ? null : Math.max(0, maxTenants - currentTenants);
    const usersRemaining = maxUsers === null ? null : Math.max(0, maxUsers - currentUsers);

    return {
      maxProperties,
      maxTenants,
      maxUsers,
      currentProperties,
      currentTenants,
      currentUsers,
      canCreateProperty,
      canCreateTenant,
      canCreateUser,
      propertiesRemaining,
      tenantsRemaining,
      usersRemaining,
      planName,
      isLoading,
    };
  }, [subscription, properties, tenants, memberCount, subLoading, propLoading, tenantLoading, memberLoading]);
}
