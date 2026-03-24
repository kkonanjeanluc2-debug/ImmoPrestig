import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ProformaInvoice {
  id: string;
  user_id: string;
  invoice_number: string;
  invoice_type: "proforma" | "definitive";
  status: "draft" | "sent" | "validated" | "converted" | "cancelled";
  tenant_id: string | null;
  tenant_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  property_name: string | null;
  unit_number: string | null;
  description: string | null;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  notes: string | null;
  due_date: string | null;
  converted_from_id: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProformaData {
  tenant_id?: string | null;
  tenant_name: string;
  tenant_phone?: string;
  tenant_email?: string;
  property_name?: string;
  unit_number?: string;
  description?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  due_date?: string;
}

export function useProformaInvoices(tenantId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["proforma-invoices", tenantId],
    queryFn: async () => {
      let query = supabase
        .from("proforma_invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        items: (d.items || []) as InvoiceItem[],
      })) as ProformaInvoice[];
    },
    enabled: !!user,
  });
}

export function useCreateProforma() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProformaData) => {
      if (!user) throw new Error("Non authentifié");

      // Get agency to generate number
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .or(`user_id.eq.${user.id}`)
        .limit(1)
        .single();

      let invoiceNumber = `PF-${new Date().getFullYear()}-001`;
      if (agency) {
        const { data: numData } = await supabase.rpc("get_next_proforma_number", {
          _agency_id: agency.id,
        });
        if (numData) invoiceNumber = numData;
      }

      const { data: result, error } = await supabase
        .from("proforma_invoices")
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber,
          invoice_type: "proforma",
          tenant_name: data.tenant_name,
          tenant_id: data.tenant_id || null,
          tenant_phone: data.tenant_phone || null,
          tenant_email: data.tenant_email || null,
          property_name: data.property_name || null,
          unit_number: data.unit_number || null,
          description: data.description || null,
          items: data.items as any,
          subtotal: data.subtotal,
          tax_rate: data.tax_rate || 0,
          tax_amount: data.tax_amount || 0,
          total_amount: data.total_amount,
          notes: data.notes || null,
          due_date: data.due_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-invoices"] });
      toast.success("Facture proforma créée avec succès");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });
}

export function useConvertToInvoice() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proformaId: string) => {
      if (!user) throw new Error("Non authentifié");

      // Get the proforma
      const { data: proforma, error: fetchError } = await supabase
        .from("proforma_invoices")
        .select("*")
        .eq("id", proformaId)
        .single();

      if (fetchError || !proforma) throw new Error("Proforma introuvable");

      // Get agency for invoice number
      const { data: agency } = await supabase
        .from("agencies")
        .select("id")
        .or(`user_id.eq.${user.id}`)
        .limit(1)
        .single();

      let invoiceNumber = `F-${new Date().getFullYear()}-001`;
      if (agency) {
        const { data: numData } = await supabase.rpc("get_next_invoice_number", {
          _agency_id: agency.id,
        });
        if (numData) invoiceNumber = numData;
      }

      // Create definitive invoice
      const { error: insertError } = await supabase
        .from("proforma_invoices")
        .insert({
          user_id: user.id,
          invoice_number: invoiceNumber,
          invoice_type: "definitive",
          status: "validated",
          tenant_id: proforma.tenant_id,
          tenant_name: proforma.tenant_name,
          tenant_phone: proforma.tenant_phone,
          tenant_email: proforma.tenant_email,
          property_name: proforma.property_name,
          unit_number: proforma.unit_number,
          description: proforma.description,
          items: proforma.items,
          subtotal: proforma.subtotal,
          tax_rate: proforma.tax_rate,
          tax_amount: proforma.tax_amount,
          total_amount: proforma.total_amount,
          notes: proforma.notes,
          due_date: proforma.due_date,
          converted_from_id: proformaId,
          converted_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update proforma status
      const { error: updateError } = await supabase
        .from("proforma_invoices")
        .update({ status: "converted" })
        .eq("id", proformaId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-invoices"] });
      toast.success("Facture définitive créée avec succès");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la conversion");
    },
  });
}

export function useUpdateProformaStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("proforma_invoices")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-invoices"] });
    },
  });
}

export function useUpdateProforma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProformaData> }) => {
      const { error } = await supabase
        .from("proforma_invoices")
        .update({
          tenant_name: data.tenant_name,
          tenant_id: data.tenant_id || null,
          tenant_phone: data.tenant_phone || null,
          tenant_email: data.tenant_email || null,
          property_name: data.property_name || null,
          unit_number: data.unit_number || null,
          description: data.description || null,
          items: data.items as any,
          subtotal: data.subtotal,
          tax_rate: data.tax_rate || 0,
          tax_amount: data.tax_amount || 0,
          total_amount: data.total_amount,
          notes: data.notes || null,
          due_date: data.due_date || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-invoices"] });
      toast.success("Facture proforma modifiée avec succès");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la modification");
    },
  });
}

export function useDeleteProforma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("proforma_invoices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proforma-invoices"] });
      toast.success("Facture supprimée");
    },
  });
}
