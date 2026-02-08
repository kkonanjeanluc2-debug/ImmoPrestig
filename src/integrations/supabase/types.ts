export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acquereurs: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          cni_number: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          profession: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profession?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profession?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      agencies: {
        Row: {
          accent_color: string | null
          account_type: Database["public"]["Enums"]["account_type"]
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          name: string
          phone: string | null
          primary_color: string | null
          reservation_deposit_percentage: number
          sale_commission_percentage: number | null
          sidebar_color: string | null
          siret: string | null
          updated_at: string
          user_id: string
          whatsapp_property_template: string | null
        }
        Insert: {
          accent_color?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          name: string
          phone?: string | null
          primary_color?: string | null
          reservation_deposit_percentage?: number
          sale_commission_percentage?: number | null
          sidebar_color?: string | null
          siret?: string | null
          updated_at?: string
          user_id: string
          whatsapp_property_template?: string | null
        }
        Update: {
          accent_color?: string | null
          account_type?: Database["public"]["Enums"]["account_type"]
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          name?: string
          phone?: string | null
          primary_color?: string | null
          reservation_deposit_percentage?: number
          sale_commission_percentage?: number | null
          sidebar_color?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
          whatsapp_property_template?: string | null
        }
        Relationships: []
      }
      agency_members: {
        Row: {
          agency_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          joined_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_subscriptions: {
        Row: {
          agency_id: string
          billing_cycle: string
          created_at: string
          ends_at: string | null
          id: string
          plan_id: string
          starts_at: string
          status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          billing_cycle?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          plan_id: string
          starts_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          billing_cycle?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          plan_id?: string
          starts_at?: string
          status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          items_failed: number
          items_processed: number
          items_success: number
          started_at: string
          status: string
          task_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          items_success?: number
          started_at?: string
          status?: string
          task_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          items_failed?: number
          items_processed?: number
          items_success?: number
          started_at?: string
          status?: string
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_schedules: {
        Row: {
          created_at: string
          id: string
          late_payment_days_after: number
          late_payment_enabled: boolean
          late_payment_time: string
          monthly_receipt_day: number
          monthly_receipt_enabled: boolean
          monthly_receipt_time: string
          payment_reminder_days_before: number
          payment_reminder_enabled: boolean
          payment_reminder_time: string
          sms_reminder_enabled: boolean
          sms_reminder_time: string
          sms_reminder_weekdays: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          late_payment_days_after?: number
          late_payment_enabled?: boolean
          late_payment_time?: string
          monthly_receipt_day?: number
          monthly_receipt_enabled?: boolean
          monthly_receipt_time?: string
          payment_reminder_days_before?: number
          payment_reminder_enabled?: boolean
          payment_reminder_time?: string
          sms_reminder_enabled?: boolean
          sms_reminder_time?: string
          sms_reminder_weekdays?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          late_payment_days_after?: number
          late_payment_enabled?: boolean
          late_payment_time?: string
          monthly_receipt_day?: number
          monthly_receipt_enabled?: boolean
          monthly_receipt_time?: string
          payment_reminder_days_before?: number
          payment_reminder_enabled?: boolean
          payment_reminder_time?: string
          sms_reminder_enabled?: boolean
          sms_reminder_time?: string
          sms_reminder_weekdays?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biens_vente: {
        Row: {
          address: string
          area: number | null
          assigned_to: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          features: Json | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          price: number
          property_type: string
          status: Database["public"]["Enums"]["property_sale_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          area?: number | null
          assigned_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          price: number
          property_type: string
          status?: Database["public"]["Enums"]["property_sale_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: number | null
          assigned_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          price?: number
          property_type?: string
          status?: Database["public"]["Enums"]["property_sale_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      biens_vente_images: {
        Row: {
          bien_id: string
          created_at: string
          display_order: number
          id: string
          image_url: string
          user_id: string
        }
        Insert: {
          bien_id: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          user_id: string
        }
        Update: {
          bien_id?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biens_vente_images_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_vente"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_id: string
          created_at: string
          id: string
          ip_address: string | null
          signature_data: string | null
          signature_text: string | null
          signature_token: string | null
          signature_type: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          signer_type: string
          token_expires_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signature_text?: string | null
          signature_token?: string | null
          signature_type: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          signer_type: string
          token_expires_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signature_text?: string | null
          signature_token?: string | null
          signature_type?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          signer_type?: string
          token_expires_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          created_at: string
          deposit: number | null
          end_date: string
          id: string
          property_id: string
          rent_amount: number
          signature_status: string | null
          start_date: string
          status: string
          tenant_id: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deposit?: number | null
          end_date: string
          id?: string
          property_id: string
          rent_amount: number
          signature_status?: string | null
          start_date: string
          status?: string
          tenant_id: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deposit?: number | null
          end_date?: string
          id?: string
          property_id?: string
          rent_amount?: number
          signature_status?: string | null
          start_date?: string
          status?: string
          tenant_id?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      demarches_administratives: {
        Row: {
          authority: string | null
          contact_person: string | null
          contact_phone: string | null
          cost: number | null
          created_at: string
          description: string | null
          documents_required: string[] | null
          documents_submitted: string[] | null
          end_date: string | null
          id: string
          lotissement_id: string
          next_steps: string | null
          parcelle_id: string | null
          result: string | null
          start_date: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authority?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          documents_required?: string[] | null
          documents_submitted?: string[] | null
          end_date?: string | null
          id?: string
          lotissement_id: string
          next_steps?: string | null
          parcelle_id?: string | null
          result?: string | null
          start_date?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authority?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          documents_required?: string[] | null
          documents_submitted?: string[] | null
          end_date?: string | null
          id?: string
          lotissement_id?: string
          next_steps?: string | null
          parcelle_id?: string | null
          result?: string | null
          start_date?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demarches_administratives_lotissement_id_fkey"
            columns: ["lotissement_id"]
            isOneToOne: false
            referencedRelation: "lotissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demarches_administratives_parcelle_id_fkey"
            columns: ["parcelle_id"]
            isOneToOne: false
            referencedRelation: "parcelles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          file_size: string | null
          file_url: string | null
          id: string
          name: string
          property_id: string | null
          status: string
          tenant_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          name: string
          property_id?: string | null
          status?: string
          tenant_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          name?: string
          property_id?: string | null
          status?: string
          tenant_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      echeances_parcelles: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          receipt_number: string | null
          status: string
          updated_at: string
          user_id: string
          vente_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vente_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echeances_parcelles_vente_id_fkey"
            columns: ["vente_id"]
            isOneToOne: false
            referencedRelation: "ventes_parcelles"
            referencedColumns: ["id"]
          },
        ]
      }
      echeances_ventes: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          receipt_number: string | null
          status: string
          updated_at: string
          user_id: string
          vente_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vente_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "echeances_ventes_vente_id_fkey"
            columns: ["vente_id"]
            isOneToOne: false
            referencedRelation: "ventes_immobilieres"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          email_type: string
          id: string
          payment_id: string | null
          recipient_email: string
          status: string
          subject: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_type: string
          id?: string
          payment_id?: string | null
          recipient_email: string
          status?: string
          subject: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          id?: string
          payment_id?: string | null
          recipient_email?: string
          status?: string
          subject?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      etats_des_lieux: {
        Row: {
          contract_id: string | null
          created_at: string
          electricity_meter: number | null
          gas_meter: number | null
          general_comments: string | null
          general_condition: string | null
          id: string
          inspection_date: string
          keys_delivered: Json | null
          landlord_signature: string | null
          landlord_signed_at: string | null
          photos: string[] | null
          property_id: string | null
          rooms: Json | null
          status: string
          tenant_id: string
          tenant_signature: string | null
          tenant_signed_at: string | null
          type: string
          unit_id: string | null
          updated_at: string
          user_id: string
          water_meter: number | null
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          electricity_meter?: number | null
          gas_meter?: number | null
          general_comments?: string | null
          general_condition?: string | null
          id?: string
          inspection_date?: string
          keys_delivered?: Json | null
          landlord_signature?: string | null
          landlord_signed_at?: string | null
          photos?: string[] | null
          property_id?: string | null
          rooms?: Json | null
          status?: string
          tenant_id: string
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          type: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
          water_meter?: number | null
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          electricity_meter?: number | null
          gas_meter?: number | null
          general_comments?: string | null
          general_condition?: string | null
          id?: string
          inspection_date?: string
          keys_delivered?: Json | null
          landlord_signature?: string | null
          landlord_signed_at?: string | null
          photos?: string[] | null
          property_id?: string | null
          rooms?: Json | null
          status?: string
          tenant_id?: string
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          type?: string
          unit_id?: string | null
          updated_at?: string
          user_id?: string
          water_meter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "etats_des_lieux_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etats_des_lieux_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etats_des_lieux_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etats_des_lieux_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      ilots: {
        Row: {
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          lotissement_id: string
          name: string
          plots_count: number | null
          total_area: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lotissement_id: string
          name: string
          plots_count?: number | null
          total_area?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          lotissement_id?: string
          name?: string
          plots_count?: number | null
          total_area?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ilots_lotissement_id_fkey"
            columns: ["lotissement_id"]
            isOneToOne: false
            referencedRelation: "lotissements"
            referencedColumns: ["id"]
          },
        ]
      }
      lotissement_documents: {
        Row: {
          created_at: string
          expiry_date: string | null
          file_size: string | null
          file_url: string | null
          id: string
          issued_by: string | null
          issued_date: string | null
          lotissement_id: string
          name: string
          notes: string | null
          reference_number: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          lotissement_id: string
          name: string
          notes?: string | null
          reference_number?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          file_size?: string | null
          file_url?: string | null
          id?: string
          issued_by?: string | null
          issued_date?: string | null
          lotissement_id?: string
          name?: string
          notes?: string | null
          reference_number?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotissement_documents_lotissement_id_fkey"
            columns: ["lotissement_id"]
            isOneToOne: false
            referencedRelation: "lotissements"
            referencedColumns: ["id"]
          },
        ]
      }
      lotissements: {
        Row: {
          city: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          total_area: number | null
          total_plots: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          total_area?: number | null
          total_plots?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          total_area?: number | null
          total_plots?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      management_types: {
        Row: {
          contract_template_id: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          percentage: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_template_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          percentage?: number
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_template_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          percentage?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_types_contract_template_id_fkey"
            columns: ["contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      member_permissions: {
        Row: {
          can_access_settings: boolean
          can_create_biens_vente: boolean | null
          can_create_contracts: boolean
          can_create_demarches: boolean | null
          can_create_documents: boolean
          can_create_ilots: boolean | null
          can_create_lotissement_documents: boolean | null
          can_create_lotissement_prospects: boolean | null
          can_create_lotissements: boolean
          can_create_owners: boolean
          can_create_parcelles: boolean | null
          can_create_payments: boolean
          can_create_properties: boolean
          can_create_tenants: boolean
          can_create_vente_prospects: boolean | null
          can_create_ventes: boolean
          can_delete_contracts: boolean
          can_delete_documents: boolean
          can_delete_lotissements: boolean
          can_delete_owners: boolean
          can_delete_payments: boolean
          can_delete_properties: boolean
          can_delete_tenants: boolean
          can_delete_ventes: boolean
          can_edit_biens_vente: boolean | null
          can_edit_contracts: boolean
          can_edit_lotissements: boolean
          can_edit_owners: boolean
          can_edit_payments: boolean
          can_edit_properties: boolean
          can_edit_tenants: boolean
          can_edit_ventes: boolean
          can_export_data: boolean
          can_manage_automations: boolean
          can_manage_branding: boolean
          can_manage_team: boolean
          can_manage_templates: boolean
          can_send_reminders: boolean
          can_view_contracts: boolean
          can_view_documents: boolean
          can_view_lotissements: boolean
          can_view_owners: boolean
          can_view_payments: boolean
          can_view_properties: boolean
          can_view_reports: boolean
          can_view_tenants: boolean
          can_view_ventes: boolean
          created_at: string
          id: string
          member_id: string
          updated_at: string
        }
        Insert: {
          can_access_settings?: boolean
          can_create_biens_vente?: boolean | null
          can_create_contracts?: boolean
          can_create_demarches?: boolean | null
          can_create_documents?: boolean
          can_create_ilots?: boolean | null
          can_create_lotissement_documents?: boolean | null
          can_create_lotissement_prospects?: boolean | null
          can_create_lotissements?: boolean
          can_create_owners?: boolean
          can_create_parcelles?: boolean | null
          can_create_payments?: boolean
          can_create_properties?: boolean
          can_create_tenants?: boolean
          can_create_vente_prospects?: boolean | null
          can_create_ventes?: boolean
          can_delete_contracts?: boolean
          can_delete_documents?: boolean
          can_delete_lotissements?: boolean
          can_delete_owners?: boolean
          can_delete_payments?: boolean
          can_delete_properties?: boolean
          can_delete_tenants?: boolean
          can_delete_ventes?: boolean
          can_edit_biens_vente?: boolean | null
          can_edit_contracts?: boolean
          can_edit_lotissements?: boolean
          can_edit_owners?: boolean
          can_edit_payments?: boolean
          can_edit_properties?: boolean
          can_edit_tenants?: boolean
          can_edit_ventes?: boolean
          can_export_data?: boolean
          can_manage_automations?: boolean
          can_manage_branding?: boolean
          can_manage_team?: boolean
          can_manage_templates?: boolean
          can_send_reminders?: boolean
          can_view_contracts?: boolean
          can_view_documents?: boolean
          can_view_lotissements?: boolean
          can_view_owners?: boolean
          can_view_payments?: boolean
          can_view_properties?: boolean
          can_view_reports?: boolean
          can_view_tenants?: boolean
          can_view_ventes?: boolean
          created_at?: string
          id?: string
          member_id: string
          updated_at?: string
        }
        Update: {
          can_access_settings?: boolean
          can_create_biens_vente?: boolean | null
          can_create_contracts?: boolean
          can_create_demarches?: boolean | null
          can_create_documents?: boolean
          can_create_ilots?: boolean | null
          can_create_lotissement_documents?: boolean | null
          can_create_lotissement_prospects?: boolean | null
          can_create_lotissements?: boolean
          can_create_owners?: boolean
          can_create_parcelles?: boolean | null
          can_create_payments?: boolean
          can_create_properties?: boolean
          can_create_tenants?: boolean
          can_create_vente_prospects?: boolean | null
          can_create_ventes?: boolean
          can_delete_contracts?: boolean
          can_delete_documents?: boolean
          can_delete_lotissements?: boolean
          can_delete_owners?: boolean
          can_delete_payments?: boolean
          can_delete_properties?: boolean
          can_delete_tenants?: boolean
          can_delete_ventes?: boolean
          can_edit_biens_vente?: boolean | null
          can_edit_contracts?: boolean
          can_edit_lotissements?: boolean
          can_edit_owners?: boolean
          can_edit_payments?: boolean
          can_edit_properties?: boolean
          can_edit_tenants?: boolean
          can_edit_ventes?: boolean
          can_export_data?: boolean
          can_manage_automations?: boolean
          can_manage_branding?: boolean
          can_manage_team?: boolean
          can_manage_templates?: boolean
          can_send_reminders?: boolean
          can_view_contracts?: boolean
          can_view_documents?: boolean
          can_view_lotissements?: boolean
          can_view_owners?: boolean
          can_view_payments?: boolean
          can_view_properties?: boolean
          can_view_reports?: boolean
          can_view_tenants?: boolean
          can_view_ventes?: boolean
          created_at?: string
          id?: string
          member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_permissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "agency_members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      online_rent_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          kkiapay_transaction_id: string | null
          paid_at: string
          payment_id: string | null
          payment_method: string | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kkiapay_transaction_id?: string | null
          paid_at?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kkiapay_transaction_id?: string | null
          paid_at?: string
          payment_id?: string | null
          payment_method?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_rent_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_rent_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string | null
          birth_date: string | null
          birth_place: string | null
          cni_number: string | null
          created_at: string
          default_contract_template_id: string | null
          deleted_at: string | null
          email: string
          id: string
          management_type_id: string | null
          name: string
          phone: string | null
          profession: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_number?: string | null
          created_at?: string
          default_contract_template_id?: string | null
          deleted_at?: string | null
          email: string
          id?: string
          management_type_id?: string | null
          name: string
          phone?: string | null
          profession?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_number?: string | null
          created_at?: string
          default_contract_template_id?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          management_type_id?: string | null
          name?: string
          phone?: string | null
          profession?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owners_default_contract_template_id_fkey"
            columns: ["default_contract_template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_management_type_id_fkey"
            columns: ["management_type_id"]
            isOneToOne: false
            referencedRelation: "management_types"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelle_admin_status: {
        Row: {
          attestation_villageoise: boolean | null
          bornage_effectue: boolean | null
          certificat_propriete: boolean | null
          created_at: string
          id: string
          notes: string | null
          parcelle_id: string
          status: string
          titre_foncier_reference: string | null
          titre_foncier_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attestation_villageoise?: boolean | null
          bornage_effectue?: boolean | null
          certificat_propriete?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          parcelle_id: string
          status?: string
          titre_foncier_reference?: string | null
          titre_foncier_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attestation_villageoise?: boolean | null
          bornage_effectue?: boolean | null
          certificat_propriete?: boolean | null
          created_at?: string
          id?: string
          notes?: string | null
          parcelle_id?: string
          status?: string
          titre_foncier_reference?: string | null
          titre_foncier_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelle_admin_status_parcelle_id_fkey"
            columns: ["parcelle_id"]
            isOneToOne: true
            referencedRelation: "parcelles"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelle_prospects: {
        Row: {
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_contact_date: string | null
          id: string
          interest_level: Database["public"]["Enums"]["interest_level"]
          last_contact_date: string | null
          name: string
          next_followup_date: string | null
          notes: string | null
          parcelle_id: string
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["prospect_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"]
          last_contact_date?: string | null
          name: string
          next_followup_date?: string | null
          notes?: string | null
          parcelle_id: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          id?: string
          interest_level?: Database["public"]["Enums"]["interest_level"]
          last_contact_date?: string | null
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          parcelle_id?: string
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["prospect_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelle_prospects_parcelle_id_fkey"
            columns: ["parcelle_id"]
            isOneToOne: false
            referencedRelation: "parcelles"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelles: {
        Row: {
          area: number
          assigned_to: string | null
          created_at: string
          deleted_at: string | null
          height: number | null
          id: string
          ilot_id: string | null
          lotissement_id: string
          notes: string | null
          plot_number: string
          position_x: number | null
          position_y: number | null
          price: number
          status: Database["public"]["Enums"]["plot_status"]
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          area: number
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          height?: number | null
          id?: string
          ilot_id?: string | null
          lotissement_id: string
          notes?: string | null
          plot_number: string
          position_x?: number | null
          position_y?: number | null
          price: number
          status?: Database["public"]["Enums"]["plot_status"]
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          area?: number
          assigned_to?: string | null
          created_at?: string
          deleted_at?: string | null
          height?: number | null
          id?: string
          ilot_id?: string | null
          lotissement_id?: string
          notes?: string | null
          plot_number?: string
          position_x?: number | null
          position_y?: number | null
          price?: number
          status?: Database["public"]["Enums"]["plot_status"]
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelles_ilot_id_fkey"
            columns: ["ilot_id"]
            isOneToOne: false
            referencedRelation: "ilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelles_lotissement_id_fkey"
            columns: ["lotissement_id"]
            isOneToOne: false
            referencedRelation: "lotissements"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_configs: {
        Row: {
          api_key_configured: boolean
          created_at: string
          display_name: string
          id: string
          is_enabled: boolean
          is_sandbox: boolean
          provider_name: string
          settings: Json
          supported_methods: string[]
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          api_key_configured?: boolean
          created_at?: string
          display_name: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          provider_name: string
          settings?: Json
          supported_methods?: string[]
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          api_key_configured?: boolean
          created_at?: string
          display_name?: string
          id?: string
          is_enabled?: boolean
          is_sandbox?: boolean
          provider_name?: string
          settings?: Json
          supported_methods?: string[]
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          agency_id: string
          amount: number
          billing_cycle: string
          completed_at: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          error_message: string | null
          fedapay_reference: string | null
          fedapay_transaction_id: string | null
          id: string
          metadata: Json | null
          payment_method: string
          plan_id: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id: string
          amount: number
          billing_cycle?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          fedapay_reference?: string | null
          fedapay_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method: string
          plan_id: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string
          amount?: number
          billing_cycle?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          fedapay_reference?: string | null
          fedapay_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string
          plan_id?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "agency_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          contract_id: string | null
          created_at: string
          due_date: string
          id: string
          method: string | null
          paid_date: string | null
          payment_months: string[] | null
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contract_id?: string | null
          created_at?: string
          due_date: string
          id?: string
          method?: string | null
          paid_date?: string | null
          payment_months?: string[] | null
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          contract_id?: string | null
          created_at?: string
          due_date?: string
          id?: string
          method?: string | null
          paid_date?: string | null
          payment_months?: string[] | null
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          agency_id: string | null
          amount: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          kkiapay_response: Json | null
          kkiapay_transaction_id: string | null
          phone_number: string
          reason: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_id?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kkiapay_response?: Json | null
          kkiapay_transaction_id?: string | null
          phone_number: string
          reason: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_id?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          kkiapay_response?: Json | null
          kkiapay_transaction_id?: string | null
          phone_number?: string
          reason?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          area: number | null
          assigned_to: string | null
          bathrooms: number | null
          bedrooms: number | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          owner_id: string | null
          price: number
          property_type: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          area?: number | null
          assigned_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string | null
          price: number
          property_type: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: number | null
          assigned_to?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string | null
          price?: number
          property_type?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_interventions: {
        Row: {
          cost: number | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          priority: string
          property_id: string
          provider_name: string | null
          provider_phone: string | null
          start_date: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          property_id: string
          provider_name?: string | null
          provider_phone?: string | null
          start_date?: string
          status?: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          property_id?: string
          provider_name?: string | null
          provider_phone?: string | null
          start_date?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_interventions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_units: {
        Row: {
          area: number | null
          created_at: string
          description: string | null
          id: string
          property_id: string
          rent_amount: number
          rooms_count: number
          status: string
          unit_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area?: number | null
          created_at?: string
          description?: string | null
          id?: string
          property_id: string
          rent_amount?: number
          rooms_count?: number
          status?: string
          unit_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: number | null
          created_at?: string
          description?: string | null
          id?: string
          property_id?: string
          rent_amount?: number
          rooms_count?: number
          status?: string
          unit_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_templates: {
        Row: {
          created_at: string
          currency_symbol: string
          date_format: string
          declaration_text: string
          footer_text: string
          id: string
          is_default: boolean
          name: string
          show_amount_in_words: boolean
          show_contacts: boolean
          show_logo: boolean
          signature_text: string
          title: string
          updated_at: string
          user_id: string
          watermark_angle: number
          watermark_enabled: boolean
          watermark_image_url: string | null
          watermark_opacity: number
          watermark_position: string
          watermark_text: string | null
          watermark_type: string
        }
        Insert: {
          created_at?: string
          currency_symbol?: string
          date_format?: string
          declaration_text?: string
          footer_text?: string
          id?: string
          is_default?: boolean
          name: string
          show_amount_in_words?: boolean
          show_contacts?: boolean
          show_logo?: boolean
          signature_text?: string
          title?: string
          updated_at?: string
          user_id: string
          watermark_angle?: number
          watermark_enabled?: boolean
          watermark_image_url?: string | null
          watermark_opacity?: number
          watermark_position?: string
          watermark_text?: string | null
          watermark_type?: string
        }
        Update: {
          created_at?: string
          currency_symbol?: string
          date_format?: string
          declaration_text?: string
          footer_text?: string
          id?: string
          is_default?: boolean
          name?: string
          show_amount_in_words?: boolean
          show_contacts?: boolean
          show_logo?: boolean
          signature_text?: string
          title?: string
          updated_at?: string
          user_id?: string
          watermark_angle?: number
          watermark_enabled?: boolean
          watermark_image_url?: string | null
          watermark_opacity?: number
          watermark_position?: string
          watermark_text?: string | null
          watermark_type?: string
        }
        Relationships: []
      }
      reservations_vente: {
        Row: {
          acquereur_id: string
          bien_id: string
          converted_vente_id: string | null
          created_at: string
          deposit_amount: number
          expiry_date: string
          id: string
          notes: string | null
          payment_method: string | null
          reservation_date: string
          status: string
          updated_at: string
          user_id: string
          validity_days: number
        }
        Insert: {
          acquereur_id: string
          bien_id: string
          converted_vente_id?: string | null
          created_at?: string
          deposit_amount?: number
          expiry_date: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reservation_date?: string
          status?: string
          updated_at?: string
          user_id: string
          validity_days?: number
        }
        Update: {
          acquereur_id?: string
          bien_id?: string
          converted_vente_id?: string | null
          created_at?: string
          deposit_amount?: number
          expiry_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          reservation_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservations_vente_acquereur_id_fkey"
            columns: ["acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vente_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_vente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vente_converted_vente_id_fkey"
            columns: ["converted_vente_id"]
            isOneToOne: false
            referencedRelation: "ventes_immobilieres"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_contract_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          display_order: number
          features: Json
          id: string
          is_active: boolean
          is_popular: boolean
          max_properties: number | null
          max_tenants: number | null
          max_users: number | null
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_properties?: number | null
          max_tenants?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          is_active?: boolean
          is_popular?: boolean
          max_properties?: number | null
          max_tenants?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string
        }
        Relationships: []
      }
      super_admin_audit_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_agency_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_agency_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_agency_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          assigned_to: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_place: string | null
          cni_number: string | null
          created_at: string
          deleted_at: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          has_portal_access: boolean
          id: string
          name: string
          phone: string | null
          portal_user_id: string | null
          profession: string | null
          property_id: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_number?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_portal_access?: boolean
          id?: string
          name: string
          phone?: string | null
          portal_user_id?: string | null
          profession?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_number?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_portal_access?: boolean
          id?: string
          name?: string
          phone?: string | null
          portal_user_id?: string | null
          profession?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "property_units"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vente_prospects: {
        Row: {
          bien_id: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          deleted_at: string | null
          email: string | null
          first_contact_date: string | null
          id: string
          interest_level: string
          last_contact_date: string | null
          name: string
          next_followup_date: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bien_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          id?: string
          interest_level?: string
          last_contact_date?: string | null
          name: string
          next_followup_date?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bien_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          id?: string
          interest_level?: string
          last_contact_date?: string | null
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vente_prospects_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_vente"
            referencedColumns: ["id"]
          },
        ]
      }
      ventes_immobilieres: {
        Row: {
          acquereur_id: string
          bien_id: string
          created_at: string
          down_payment: number | null
          id: string
          monthly_payment: number | null
          notes: string | null
          paid_installments: number | null
          payment_method: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          sale_date: string
          sold_by: string | null
          status: Database["public"]["Enums"]["sale_payment_status"]
          total_installments: number | null
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acquereur_id: string
          bien_id: string
          created_at?: string
          down_payment?: number | null
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          paid_installments?: number | null
          payment_method?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_date?: string
          sold_by?: string | null
          status?: Database["public"]["Enums"]["sale_payment_status"]
          total_installments?: number | null
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acquereur_id?: string
          bien_id?: string
          created_at?: string
          down_payment?: number | null
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          paid_installments?: number | null
          payment_method?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_date?: string
          sold_by?: string | null
          status?: Database["public"]["Enums"]["sale_payment_status"]
          total_installments?: number | null
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventes_immobilieres_acquereur_id_fkey"
            columns: ["acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventes_immobilieres_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_vente"
            referencedColumns: ["id"]
          },
        ]
      }
      ventes_parcelles: {
        Row: {
          acquereur_id: string
          created_at: string
          down_payment: number | null
          id: string
          monthly_payment: number | null
          notes: string | null
          paid_installments: number | null
          parcelle_id: string
          payment_method: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          sale_date: string
          sold_by: string | null
          status: string
          total_installments: number | null
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acquereur_id: string
          created_at?: string
          down_payment?: number | null
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          paid_installments?: number | null
          parcelle_id: string
          payment_method?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_date?: string
          sold_by?: string | null
          status?: string
          total_installments?: number | null
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acquereur_id?: string
          created_at?: string
          down_payment?: number | null
          id?: string
          monthly_payment?: number | null
          notes?: string | null
          paid_installments?: number | null
          parcelle_id?: string
          payment_method?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          sale_date?: string
          sold_by?: string | null
          status?: string
          total_installments?: number | null
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ventes_parcelles_acquereur_id_fkey"
            columns: ["acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventes_parcelles_parcelle_id_fkey"
            columns: ["parcelle_id"]
            isOneToOne: false
            referencedRelation: "parcelles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          created_at: string
          document_id: string | null
          id: string
          message_preview: string
          message_type: string
          payment_id: string | null
          recipient_phone: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          id?: string
          message_preview: string
          message_type: string
          payment_id?: string | null
          recipient_phone: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          id?: string
          message_preview?: string
          message_type?: string
          payment_id?: string | null
          recipient_phone?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          kkiapay_payout_id: string | null
          notes: string | null
          payment_method: string
          processed_at: string | null
          recipient_name: string | null
          recipient_phone: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kkiapay_payout_id?: string | null
          notes?: string | null
          payment_method?: string
          processed_at?: string | null
          recipient_name?: string | null
          recipient_phone: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kkiapay_payout_id?: string | null
          notes?: string | null
          payment_method?: string
          processed_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_parcelle: {
        Args: {
          _assigned_to: string
          _parcelle_user_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_access_property: {
        Args: {
          _assigned_to: string
          _property_user_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_access_tenant: {
        Args: {
          _assigned_to: string
          _tenant_user_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_access_tenant_v2: {
        Args: {
          _assigned_to: string
          _property_id: string
          _tenant_user_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_access_vente_parcelle: {
        Args: { _sold_by: string; _user_id: string; _vente_user_id: string }
        Returns: boolean
      }
      can_agency_add_member: { Args: { p_agency_id: string }; Returns: boolean }
      can_agency_add_tenant_portal: {
        Args: { p_agency_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_bien_vente: {
        Args: { _assigned_to: string; _bien_user_id: string; _user_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_ilot: {
        Args: { _ilot_id: string; _owner_id: string; _user_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_lotissement: {
        Args: { _lotissement_id: string; _owner_id: string; _user_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_property: {
        Args: {
          _agency_owner_id: string
          _gestionnaire_id: string
          _property_id: string
        }
        Returns: boolean
      }
      can_gestionnaire_access_vente_immo: {
        Args: { _bien_id: string; _user_id: string; _vente_user_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_vente_parcelle: {
        Args: { _owner_id: string; _parcelle_id: string; _user_id: string }
        Returns: boolean
      }
      get_agency_member_count: {
        Args: { p_agency_id: string }
        Returns: number
      }
      get_agency_tenant_portal_count: {
        Args: { p_agency_id: string }
        Returns: number
      }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_admin: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_member: { Args: { agency_uuid: string }; Returns: boolean }
      is_agency_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "agence" | "proprietaire"
      app_role:
        | "admin"
        | "gestionnaire"
        | "lecture_seule"
        | "super_admin"
        | "locataire"
      interest_level: "faible" | "moyen" | "eleve"
      payment_type: "comptant" | "echelonne"
      plot_status: "disponible" | "reserve" | "vendu"
      property_sale_status: "disponible" | "reserve" | "vendu"
      prospect_status:
        | "nouveau"
        | "contacte"
        | "interesse"
        | "negociation"
        | "perdu"
        | "converti"
      sale_payment_status: "en_cours" | "complete" | "annule"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["agence", "proprietaire"],
      app_role: [
        "admin",
        "gestionnaire",
        "lecture_seule",
        "super_admin",
        "locataire",
      ],
      interest_level: ["faible", "moyen", "eleve"],
      payment_type: ["comptant", "echelonne"],
      plot_status: ["disponible", "reserve", "vendu"],
      property_sale_status: ["disponible", "reserve", "vendu"],
      prospect_status: [
        "nouveau",
        "contacte",
        "interesse",
        "negociation",
        "perdu",
        "converti",
      ],
      sale_payment_status: ["en_cours", "complete", "annule"],
    },
  },
} as const
