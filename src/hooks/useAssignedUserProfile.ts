import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyMembers } from "./useAgencyMembers";

interface AssignedProfile {
  userId: string;
  fullName: string;
  email: string;
}

// Hook to get a map of user IDs to their profile info
export function useAssignedUsersMap() {
  const { data: members } = useAgencyMembers();

  const usersMap = new Map<string, AssignedProfile>();
  
  if (members) {
    members.forEach(member => {
      if (member.profile) {
        usersMap.set(member.user_id, {
          userId: member.user_id,
          fullName: member.profile.full_name || member.profile.email || "Inconnu",
          email: member.profile.email || "",
        });
      }
    });
  }

  return usersMap;
}

// Hook to get a single user's name by ID
export function useAssignedUserName(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["assigned-user-name", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user profile:", error);
        return null;
      }

      return data?.full_name || data?.email || null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Component-friendly hook that returns profile info for a list of user IDs
export function useUserProfiles(userIds: (string | null | undefined)[]) {
  const validIds = userIds.filter((id): id is string => !!id);
  const uniqueIds = [...new Set(validIds)];

  return useQuery({
    queryKey: ["user-profiles", uniqueIds.sort().join(",")],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<string, string>();

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", uniqueIds);

      if (error) {
        console.error("Error fetching user profiles:", error);
        return new Map<string, string>();
      }

      const profilesMap = new Map<string, string>();
      data?.forEach(profile => {
        profilesMap.set(profile.user_id, profile.full_name || profile.email || "Inconnu");
      });

      return profilesMap;
    },
    enabled: uniqueIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
