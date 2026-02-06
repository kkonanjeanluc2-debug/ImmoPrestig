import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "./useAgency";
import { AppRole } from "./useUserRoles";

export interface AgencyMember {
  id: string;
  agency_id: string;
  user_id: string;
  role: AppRole;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  status: "pending" | "active" | "inactive";
  created_at: string;
  updated_at: string;
  profile?: {
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateMemberData {
  email: string;
  full_name: string;
  password: string;
  role: AppRole;
}

// Get all members of current agency
export function useAgencyMembers() {
  const { data: agency } = useAgency();

  return useQuery({
    queryKey: ["agency-members", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];

      // Get members
      const { data: members, error: membersError } = await supabase
        .from("agency_members")
        .select("*")
        .eq("agency_id", agency.id)
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get profiles separately for these user IDs
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, avatar_url")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Merge data
      return members.map((member) => {
        const profile = profiles?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          status: member.status as "pending" | "active" | "inactive",
          profile: profile ? {
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          } : undefined,
        } as AgencyMember;
      });
    },
    enabled: !!agency?.id,
  });
}

// Get member count for subscription limits
export function useAgencyMemberCount() {
  const { data: agency } = useAgency();

  return useQuery({
    queryKey: ["agency-member-count", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return 0;

      const { count, error } = await supabase
        .from("agency_members")
        .select("*", { count: "exact", head: true })
        .eq("agency_id", agency.id)
        .eq("status", "active");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!agency?.id,
  });
}

// Check if agency can add more members
export function useCanAddMember() {
  const { data: agency } = useAgency();
  const { data: memberCount, isLoading: countLoading } = useAgencyMemberCount();

  return useQuery({
    queryKey: ["can-add-member", agency?.id, memberCount],
    queryFn: async () => {
      if (!agency?.id) return { canAdd: false, maxUsers: 0, currentUsers: 0 };

      // Get subscription plan limits
      const { data: subscription } = await supabase
        .from("agency_subscriptions")
        .select(`
          plan:subscription_plans(max_users)
        `)
        .eq("agency_id", agency.id)
        .eq("status", "active")
        .maybeSingle();

      const maxUsers = subscription?.plan?.max_users ?? null;
      const currentUsers = (memberCount || 0) + 1; // +1 for agency owner

      return {
        canAdd: maxUsers === null || currentUsers < maxUsers,
        maxUsers,
        currentUsers,
        remaining: maxUsers === null ? null : Math.max(0, maxUsers - currentUsers),
      };
    },
    enabled: !!agency?.id && !countLoading,
  });
}

// Create a new member (invites existing user or creates new one)
export function useCreateAgencyMember() {
  const queryClient = useQueryClient();
  const { data: agency } = useAgency();

  return useMutation({
    mutationFn: async (memberData: CreateMemberData) => {
      if (!agency?.id) throw new Error("Aucune agence trouvée");

      // Call edge function to create user and add to agency
      const { data, error } = await supabase.functions.invoke("create-agency-member", {
        body: {
          agency_id: agency.id,
          email: memberData.email,
          full_name: memberData.full_name,
          password: memberData.password,
          role: memberData.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members"] });
      queryClient.invalidateQueries({ queryKey: ["agency-member-count"] });
      queryClient.invalidateQueries({ queryKey: ["can-add-member"] });
      queryClient.invalidateQueries({ queryKey: ["assignable-users"] });
    },
  });
}

// Update member role
export function useUpdateAgencyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      role,
      status,
    }: {
      memberId: string;
      role?: AppRole;
      status?: "active" | "inactive";
    }) => {
      const updates: Record<string, unknown> = {};
      if (role) updates.role = role;
      if (status) updates.status = status;

      const { error } = await supabase
        .from("agency_members")
        .update(updates)
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members"] });
      queryClient.invalidateQueries({ queryKey: ["assignable-users"] });
    },
  });
}

// Delete member
export function useDeleteAgencyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("agency_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-members"] });
      queryClient.invalidateQueries({ queryKey: ["agency-member-count"] });
      queryClient.invalidateQueries({ queryKey: ["can-add-member"] });
      queryClient.invalidateQueries({ queryKey: ["assignable-users"] });
    },
  });
}
