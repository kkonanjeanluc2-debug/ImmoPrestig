import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MemberPermissions {
  id: string;
  member_id: string;
  // Property management
  can_view_properties: boolean;
  can_create_properties: boolean;
  can_edit_properties: boolean;
  can_delete_properties: boolean;
  // Tenant management
  can_view_tenants: boolean;
  can_create_tenants: boolean;
  can_edit_tenants: boolean;
  can_delete_tenants: boolean;
  // Payment management
  can_view_payments: boolean;
  can_create_payments: boolean;
  can_edit_payments: boolean;
  can_delete_payments: boolean;
  // Owner management
  can_view_owners: boolean;
  can_create_owners: boolean;
  can_edit_owners: boolean;
  can_delete_owners: boolean;
  // Contract management
  can_view_contracts: boolean;
  can_create_contracts: boolean;
  can_edit_contracts: boolean;
  can_delete_contracts: boolean;
  // Lotissement management
  can_view_lotissements: boolean;
  can_create_lotissements: boolean;
  can_edit_lotissements: boolean;
  can_delete_lotissements: boolean;
  // Lotissement sub-entities
  can_create_parcelles: boolean;
  can_create_ilots: boolean;
  can_create_lotissement_documents: boolean;
  can_create_demarches: boolean;
  can_create_lotissement_prospects: boolean;
  // Ventes management
  can_view_ventes: boolean;
  can_create_ventes: boolean;
  can_edit_ventes: boolean;
  can_delete_ventes: boolean;
  // Biens vente sub-entities
  can_create_biens_vente: boolean;
  can_edit_biens_vente: boolean;
  can_create_vente_prospects: boolean;
  // Documents
  can_view_documents: boolean;
  can_create_documents: boolean;
  can_delete_documents: boolean;
  // Reports & settings
  can_view_reports: boolean;
  can_export_data: boolean;
  can_send_reminders: boolean;
  // Settings management
  can_access_settings: boolean;
  can_manage_team: boolean;
  can_manage_automations: boolean;
  can_manage_branding: boolean;
  can_manage_templates: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export type PermissionKey = keyof Omit<MemberPermissions, 'id' | 'member_id' | 'created_at' | 'updated_at'>;

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_view_properties: "Voir les biens",
  can_create_properties: "Créer des biens",
  can_edit_properties: "Modifier les biens",
  can_delete_properties: "Supprimer les biens",
  can_view_tenants: "Voir les locataires",
  can_create_tenants: "Créer des locataires",
  can_edit_tenants: "Modifier les locataires",
  can_delete_tenants: "Supprimer les locataires",
  can_view_payments: "Voir les paiements",
  can_create_payments: "Enregistrer des paiements",
  can_edit_payments: "Modifier les paiements",
  can_delete_payments: "Supprimer les paiements",
  can_view_owners: "Voir les propriétaires",
  can_create_owners: "Créer des propriétaires",
  can_edit_owners: "Modifier les propriétaires",
  can_delete_owners: "Supprimer les propriétaires",
  can_view_contracts: "Voir les contrats",
  can_create_contracts: "Créer des contrats",
  can_edit_contracts: "Modifier les contrats",
  can_delete_contracts: "Supprimer les contrats",
  can_view_lotissements: "Voir les lotissements",
  can_create_lotissements: "Créer des lotissements",
  can_edit_lotissements: "Modifier les lotissements",
  can_delete_lotissements: "Supprimer les lotissements",
  can_create_parcelles: "Ajouter des parcelles",
  can_create_ilots: "Ajouter des îlots",
  can_create_lotissement_documents: "Ajouter des documents",
  can_create_demarches: "Ajouter des démarches",
  can_create_lotissement_prospects: "Ajouter des prospects",
  can_view_ventes: "Voir les ventes immobilières",
  can_create_ventes: "Créer des ventes immobilières",
  can_edit_ventes: "Modifier les ventes immobilières",
  can_delete_ventes: "Supprimer les ventes immobilières",
  can_create_biens_vente: "Ajouter des biens à vendre",
  can_edit_biens_vente: "Modifier des biens à vendre",
  can_create_vente_prospects: "Ajouter des prospects vente",
  can_view_documents: "Voir les documents",
  can_create_documents: "Créer des documents",
  can_delete_documents: "Supprimer les documents",
  can_view_reports: "Voir les rapports",
  can_export_data: "Exporter les données",
  can_send_reminders: "Envoyer des rappels",
  can_access_settings: "Accéder aux paramètres",
  can_manage_team: "Gérer l'équipe",
  can_manage_automations: "Gérer les automatisations",
  can_manage_branding: "Gérer le branding",
  can_manage_templates: "Gérer les modèles",
};

export const PERMISSION_GROUPS = {
  properties: {
    label: "Biens immobiliers",
    permissions: ["can_view_properties", "can_create_properties", "can_edit_properties", "can_delete_properties"] as PermissionKey[],
  },
  tenants: {
    label: "Locataires",
    permissions: ["can_view_tenants", "can_create_tenants", "can_edit_tenants", "can_delete_tenants"] as PermissionKey[],
  },
  payments: {
    label: "Paiements",
    permissions: ["can_view_payments", "can_create_payments", "can_edit_payments", "can_delete_payments"] as PermissionKey[],
  },
  owners: {
    label: "Propriétaires",
    permissions: ["can_view_owners", "can_create_owners", "can_edit_owners", "can_delete_owners"] as PermissionKey[],
  },
  contracts: {
    label: "Contrats",
    permissions: ["can_view_contracts", "can_create_contracts", "can_edit_contracts", "can_delete_contracts"] as PermissionKey[],
  },
  lotissements: {
    label: "Lotissements",
    permissions: ["can_view_lotissements", "can_create_lotissements", "can_edit_lotissements", "can_delete_lotissements", "can_create_parcelles", "can_create_ilots", "can_create_lotissement_documents", "can_create_demarches", "can_create_lotissement_prospects"] as PermissionKey[],
  },
  ventes: {
    label: "Ventes immobilières",
    permissions: ["can_view_ventes", "can_create_ventes", "can_edit_ventes", "can_delete_ventes", "can_create_biens_vente", "can_edit_biens_vente", "can_create_vente_prospects"] as PermissionKey[],
  },
  documents: {
    label: "Documents",
    permissions: ["can_view_documents", "can_create_documents", "can_delete_documents"] as PermissionKey[],
  },
  settings: {
    label: "Paramètres",
    permissions: ["can_access_settings", "can_manage_team", "can_manage_automations", "can_manage_branding", "can_manage_templates"] as PermissionKey[],
  },
  other: {
    label: "Autres",
    permissions: ["can_view_reports", "can_export_data", "can_send_reminders"] as PermissionKey[],
  },
};

// Default permissions for each role
export const DEFAULT_PERMISSIONS: Record<string, Partial<MemberPermissions>> = {
  admin: {
    can_view_properties: true,
    can_create_properties: true,
    can_edit_properties: true,
    can_delete_properties: true,
    can_view_tenants: true,
    can_create_tenants: true,
    can_edit_tenants: true,
    can_delete_tenants: true,
    can_view_payments: true,
    can_create_payments: true,
    can_edit_payments: true,
    can_delete_payments: true,
    can_view_owners: true,
    can_create_owners: true,
    can_edit_owners: true,
    can_delete_owners: true,
    can_view_contracts: true,
    can_create_contracts: true,
    can_edit_contracts: true,
    can_delete_contracts: true,
    can_view_lotissements: true,
    can_create_lotissements: true,
    can_edit_lotissements: true,
    can_delete_lotissements: true,
    can_create_parcelles: true,
    can_create_ilots: true,
    can_create_lotissement_documents: true,
    can_create_demarches: true,
    can_create_lotissement_prospects: true,
    can_view_ventes: true,
    can_create_ventes: true,
    can_edit_ventes: true,
    can_delete_ventes: true,
    can_create_biens_vente: true,
    can_edit_biens_vente: true,
    can_create_vente_prospects: true,
    can_view_documents: true,
    can_create_documents: true,
    can_delete_documents: true,
    can_view_reports: true,
    can_export_data: true,
    can_send_reminders: true,
    can_access_settings: true,
    can_manage_team: true,
    can_manage_automations: true,
    can_manage_branding: true,
    can_manage_templates: true,
  },
  gestionnaire: {
    can_view_properties: true,
    can_create_properties: true,
    can_edit_properties: false,
    can_delete_properties: false,
    can_view_tenants: true,
    can_create_tenants: false,
    can_edit_tenants: false,
    can_delete_tenants: false,
    can_view_payments: true,
    can_create_payments: true,
    can_edit_payments: false,
    can_delete_payments: false,
    can_view_owners: true,
    can_create_owners: true,
    can_edit_owners: false,
    can_delete_owners: false,
    can_view_contracts: true,
    can_create_contracts: true,
    can_edit_contracts: false,
    can_delete_contracts: false,
    can_view_lotissements: true,
    can_create_lotissements: false,
    can_edit_lotissements: false,
    can_delete_lotissements: false,
    can_create_parcelles: false,
    can_create_ilots: false,
    can_create_lotissement_documents: false,
    can_create_demarches: false,
    can_create_lotissement_prospects: false,
    can_view_ventes: true,
    can_create_ventes: true,
    can_edit_ventes: false,
    can_delete_ventes: false,
    can_create_biens_vente: false,
    can_edit_biens_vente: false,
    can_create_vente_prospects: false,
    can_view_documents: true,
    can_create_documents: true,
    can_delete_documents: false,
    can_view_reports: false,
    can_export_data: false,
    can_send_reminders: true,
    can_access_settings: false,
    can_manage_team: false,
    can_manage_automations: false,
    can_manage_branding: false,
    can_manage_templates: false,
  },
  lecture_seule: {
    can_view_properties: true,
    can_create_properties: false,
    can_edit_properties: false,
    can_delete_properties: false,
    can_view_tenants: true,
    can_create_tenants: false,
    can_edit_tenants: false,
    can_delete_tenants: false,
    can_view_payments: true,
    can_create_payments: false,
    can_edit_payments: false,
    can_delete_payments: false,
    can_view_owners: true,
    can_create_owners: false,
    can_edit_owners: false,
    can_delete_owners: false,
    can_view_contracts: true,
    can_create_contracts: false,
    can_edit_contracts: false,
    can_delete_contracts: false,
    can_view_lotissements: true,
    can_create_lotissements: false,
    can_edit_lotissements: false,
    can_delete_lotissements: false,
    can_create_parcelles: false,
    can_create_ilots: false,
    can_create_lotissement_documents: false,
    can_create_demarches: false,
    can_create_lotissement_prospects: false,
    can_view_ventes: true,
    can_create_ventes: false,
    can_edit_ventes: false,
    can_delete_ventes: false,
    can_create_biens_vente: false,
    can_edit_biens_vente: false,
    can_create_vente_prospects: false,
    can_view_documents: true,
    can_create_documents: false,
    can_delete_documents: false,
    can_view_reports: false,
    can_export_data: false,
    can_send_reminders: false,
    can_access_settings: false,
    can_manage_team: false,
    can_manage_automations: false,
    can_manage_branding: false,
    can_manage_templates: false,
  },
};

// Get permissions for a specific member
export function useMemberPermissions(memberId: string | undefined) {
  return useQuery({
    queryKey: ["member-permissions", memberId],
    queryFn: async () => {
      if (!memberId) return null;

      const { data, error } = await supabase
        .from("member_permissions")
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle();

      if (error) throw error;

      // Defensive normalization: depending on PostgREST headers, data can be an object or an array.
      const normalized = Array.isArray(data) ? (data[0] ?? null) : data;
      return normalized as MemberPermissions | null;
    },
    enabled: !!memberId,
  });
}

// Get current user's permissions
export function useCurrentMemberPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current-member-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the user's agency membership
      const { data: membership, error: membershipError } = await supabase
        .from("agency_members")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) return null;

      // Then get their permissions
      const { data: permissions, error: permError } = await supabase
        .from("member_permissions")
        .select("*")
        .eq("member_id", membership.id)
        .maybeSingle();

      if (permError) throw permError;

      const normalizedPermissions = Array.isArray(permissions)
        ? (permissions[0] ?? null)
        : permissions;

      // If no custom permissions, return defaults based on role
      if (!normalizedPermissions) {
        return {
          ...DEFAULT_PERMISSIONS[membership.role] || DEFAULT_PERMISSIONS.lecture_seule,
          member_id: membership.id,
        } as Partial<MemberPermissions>;
      }

      return normalizedPermissions as MemberPermissions;
    },
    enabled: !!user?.id,
  });
}

// Create or update member permissions
export function useUpsertMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      permissions,
    }: {
      memberId: string;
      permissions: Partial<MemberPermissions>;
    }) => {
      // Check if permissions exist
      const { data: existing } = await supabase
        .from("member_permissions")
        .select("id")
        .eq("member_id", memberId)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("member_permissions")
          .update(permissions)
          .eq("member_id", memberId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("member_permissions")
          .insert({
            member_id: memberId,
            ...permissions,
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member-permissions", variables.memberId] });
      queryClient.invalidateQueries({ queryKey: ["current-member-permissions"] });
    },
  });
}

// Delete member permissions
export function useDeleteMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("member_permissions")
        .delete()
        .eq("member_id", memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-permissions"] });
    },
  });
}
