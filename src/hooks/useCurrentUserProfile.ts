import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const USER_PROFILE_KEY = (userId: string | undefined) => ["user-profile", userId] as const;

export function useCurrentUserProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: USER_PROFILE_KEY(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvalidateUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY(user?.id) });
}
