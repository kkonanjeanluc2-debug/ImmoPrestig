import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PropertyInventory {
  id: string;
  property_id: string;
  contract_id: string | null;
  tenant_id: string | null;
  inventory_date: string;
  type: "entree" | "sortie";
  status: "brouillon" | "valide" | "signe";
  landlord_signature: string | null;
  landlord_signed_at: string | null;
  tenant_signature: string | null;
  tenant_signed_at: string | null;
  general_notes: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  inventory_id: string;
  room: string;
  item_name: string;
  quantity: number;
  brand: string | null;
  model: string | null;
  condition: "neuf" | "bon" | "use" | "a_reparer" | "hors_service";
  observations: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItemInsert {
  inventory_id: string;
  room: string;
  item_name: string;
  quantity?: number;
  brand?: string | null;
  model?: string | null;
  condition?: string;
  observations?: string | null;
}

export const usePropertyInventories = (propertyId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["property-inventories", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_inventories")
        .select("*")
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PropertyInventory[];
    },
    enabled: !!user && !!propertyId,
  });
};

export const useInventoryItems = (inventoryId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["inventory-items", inventoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("inventory_id", inventoryId!)
        .order("room", { ascending: true });

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!user && !!inventoryId,
  });
};

export const useCreatePropertyInventory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (inventory: {
      property_id: string;
      contract_id?: string | null;
      tenant_id?: string | null;
      inventory_date?: string;
      type?: string;
      general_notes?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("property_inventories")
        .insert({ ...inventory, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as PropertyInventory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-inventories", data.property_id] });
    },
  });
};

export const useUpdatePropertyInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<PropertyInventory>) => {
      const { data, error } = await supabase
        .from("property_inventories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as PropertyInventory;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-inventories", data.property_id] });
    },
  });
};

export const useDeletePropertyInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase
        .from("property_inventories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, propertyId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["property-inventories", data.propertyId] });
    },
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (item: InventoryItemInsert) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("inventory_items")
        .insert({ ...item, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as InventoryItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items", data.inventory_id] });
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<InventoryItem>) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as InventoryItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items", data.inventory_id] });
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, inventoryId }: { id: string; inventoryId: string }) => {
      const { error } = await supabase
        .from("inventory_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, inventoryId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items", data.inventoryId] });
    },
  });
};

export const useBulkCreateInventoryItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ inventoryId, items }: { inventoryId: string; items: Omit<InventoryItemInsert, "inventory_id">[] }) => {
      if (!user) throw new Error("User not authenticated");

      const itemsToInsert = items.map(item => ({
        ...item,
        inventory_id: inventoryId,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from("inventory_items")
        .insert(itemsToInsert)
        .select();

      if (error) throw error;
      return data as InventoryItem[];
    },
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["inventory-items", data[0].inventory_id] });
      }
    },
  });
};
