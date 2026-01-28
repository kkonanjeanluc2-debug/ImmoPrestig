import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "./useAgency";
import { useAuth } from "@/contexts/AuthContext";

export interface AssignableUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string;
}

// Get all users that can be assigned to properties/tenants (agency owner + active members)
export function useAssignableUsers() {
  const { user } = useAuth();
  const { data: agency } = useAgency();

  return useQuery({
    queryKey: ["assignable-users", agency?.id],
    queryFn: async () => {
      if (!agency?.id) return [];

      const assignableUsers: AssignableUser[] = [];

      // Add agency owner
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("user_id", agency.user_id)
        .maybeSingle();

      if (ownerProfile) {
        assignableUsers.push({
          user_id: ownerProfile.user_id,
          email: ownerProfile.email,
          full_name: ownerProfile.full_name || agency.name,
          role: "Propriétaire",
        });
      }

      // Get active members
      const { data: members } = await supabase
        .from("agency_members")
        .select("user_id, role")
        .eq("agency_id", agency.id)
        .eq("status", "active");

      if (members && members.length > 0) {
        const memberUserIds = members.map(m => m.user_id);
        
        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("user_id, email, full_name")
          .in("user_id", memberUserIds);

        const roleLabels: Record<string, string> = {
          admin: "Administrateur",
          gestionnaire: "Gestionnaire",
          lecture_seule: "Lecture seule",
        };

        members.forEach(member => {
          const profile = memberProfiles?.find(p => p.user_id === member.user_id);
          if (profile) {
            assignableUsers.push({
              user_id: profile.user_id,
              email: profile.email,
              full_name: profile.full_name,
              role: roleLabels[member.role] || member.role,
            });
          }
        });
      }

      return assignableUsers;
    },
    enabled: !!agency?.id,
  });
}

// Check if current user is the agency owner or admin
export function useIsAgencyOwner() {
  const { user } = useAuth();
  const { data: agency, isLoading: agencyLoading } = useAgency();

  const { data: isAdminMember, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin-member", user?.id, agency?.id],
    queryFn: async () => {
      if (!user?.id || !agency?.id) return false;
      
      const { data } = await supabase
        .from("agency_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("agency_id", agency.id)
        .eq("status", "active")
        .maybeSingle();
      
      return data?.role === "admin";
    },
    enabled: !!user?.id && !!agency?.id && agency?.user_id !== user?.id,
  });

  return {
    isOwner: agency?.user_id === user?.id || isAdminMember === true,
    isLoading: agencyLoading || adminLoading,
  };
}
