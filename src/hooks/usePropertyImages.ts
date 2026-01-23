import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PropertyImage {
  id: string;
  property_id: string;
  user_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

export const usePropertyImages = (propertyId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-images", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PropertyImage[];
    },
    enabled: !!user && !!propertyId,
  });
};

export const useAddPropertyImage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      propertyId,
      imageUrl,
      displayOrder = 0,
    }: {
      propertyId: string;
      imageUrl: string;
      displayOrder?: number;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("property_images")
        .insert({
          property_id: propertyId,
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
      queryClient.invalidateQueries({ queryKey: ["property-images", variables.propertyId] });
    },
  });
};

export const useDeletePropertyImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from("property_images").delete().eq("id", id);
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
    },
  });
};

export const useReorderPropertyImages = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyId,
      images,
    }: {
      propertyId: string;
      images: { id: string; display_order: number }[];
    }) => {
      const promises = images.map((img) =>
        supabase
          .from("property_images")
          .update({ display_order: img.display_order })
          .eq("id", img.id)
      );

      await Promise.all(promises);
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ["property-images", propertyId] });
    },
  });
};
