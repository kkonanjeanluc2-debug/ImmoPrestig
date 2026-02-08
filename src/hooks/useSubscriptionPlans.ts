import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsSuperAdmin } from "./useSuperAdmin";

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_properties: number | null;
  max_tenants: number | null;
  max_users: number | null;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AgencySubscription {
  id: string;
  agency_id: string;
  plan_id: string;
  billing_cycle: "monthly" | "yearly" | "lifetime";
  status: "active" | "cancelled" | "expired" | "trial";
  starts_at: string;
  ends_at: string | null;
  trial_ends_at: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

// Fetch all subscription plans
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });
}

// Create a new subscription plan (super admin only)
export function useCreateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: Omit<SubscriptionPlan, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
  });
}

// Update a subscription plan (super admin only)
export function useUpdateSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SubscriptionPlan>;
    }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
  });
}

// Delete a subscription plan (super admin only)
export function useDeleteSubscriptionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_plans")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
    },
  });
}

// Get all agency subscriptions (super admin only)
export function useAllAgencySubscriptions() {
  const { isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["all-agency-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (AgencySubscription & { plan: SubscriptionPlan })[];
    },
    enabled: isSuperAdmin,
  });
}

// Update agency subscription (super admin only)
export function useUpdateAgencySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<AgencySubscription>;
    }) => {
      const { error } = await supabase
        .from("agency_subscriptions")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agency-subscriptions"] });
    },
  });
}

// Assign subscription to agency (super admin only)
export function useAssignSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agency_id,
      plan_id,
      billing_cycle = "monthly",
      ends_at,
    }: {
      agency_id: string;
      plan_id: string;
      billing_cycle?: "monthly" | "yearly" | "lifetime";
      ends_at?: string | null;
    }) => {
      // Upsert to handle existing subscriptions
      // For lifetime subscriptions, set ends_at to null (never expires)
      const subscriptionData: {
        agency_id: string;
        plan_id: string;
        billing_cycle: string;
        status: string;
        starts_at: string;
        ends_at?: string | null;
      } = {
        agency_id,
        plan_id,
        billing_cycle,
        status: "active",
        starts_at: new Date().toISOString(),
      };

      // Lifetime subscriptions never expire
      if (billing_cycle === "lifetime") {
        subscriptionData.ends_at = null;
      } else if (ends_at !== undefined) {
        subscriptionData.ends_at = ends_at;
      }

      const { error } = await supabase
        .from("agency_subscriptions")
        .upsert(subscriptionData, { onConflict: "agency_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-agency-subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["all-agencies"] });
    },
  });
}
