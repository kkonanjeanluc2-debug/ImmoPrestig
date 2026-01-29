import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BienVenteImage {
  id: string;
  bien_id: string;
  user_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export const useBienVenteImages = (bienId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bien-vente-images", bienId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("biens_vente_images")
        .select("*")
        .eq("bien_id", bienId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as BienVenteImage[];
    },
    enabled: !!user && !!bienId,
  });
};

export const useAddBienVenteImage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bienId,
      imageUrl,
      displayOrder = 0,
    }: {
      bienId: string;
      imageUrl: string;
      displayOrder?: number;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("biens_vente_images")
        .insert({
          bien_id: bienId,
          user_id: user.id,
          image_url: imageUrl,
          display_order: displayOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bien-vente-images", variables.bienId] });
    },
  });
};

export const useDeleteBienVenteImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bienId }: { id: string; bienId: string }) => {
      const { error } = await supabase.from("biens_vente_images").delete().eq("id", id);
      if (error) throw error;
      return bienId;
    },
    onSuccess: (bienId) => {
      queryClient.invalidateQueries({ queryKey: ["bien-vente-images", bienId] });
    },
  });
};

export const useReorderBienVenteImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bienId,
      images,
    }: {
      bienId: string;
      images: { id: string; display_order: number }[];
    }) => {
      const promises = images.map((img) =>
        supabase
          .from("biens_vente_images")
          .update({ display_order: img.display_order })
          .eq("id", img.id)
      );

      await Promise.all(promises);
      return bienId;
    },
    onSuccess: (bienId) => {
      queryClient.invalidateQueries({ queryKey: ["bien-vente-images", bienId] });
    },
  });
};
