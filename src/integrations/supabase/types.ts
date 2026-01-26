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
          name: string
          phone: string | null
          primary_color: string | null
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
          name: string
          phone?: string | null
          primary_color?: string | null
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
          name?: string
          phone?: string | null
          primary_color?: string | null
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
      contracts: {
        Row: {
          created_at: string
          deposit: number | null
          end_date: string
          id: string
          property_id: string
          rent_amount: number
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
      management_types: {
        Row: {
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
        Relationships: []
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
      owners: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          management_type_id: string | null
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          management_type_id?: string | null
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          management_type_id?: string | null
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owners_management_type_id_fkey"
            columns: ["management_type_id"]
            isOneToOne: false
            referencedRelation: "management_types"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          property_id: string | null
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          property_id?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      can_agency_add_member: { Args: { p_agency_id: string }; Returns: boolean }
      get_agency_member_count: {
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
      is_agency_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "agence" | "proprietaire"
      app_role: "admin" | "gestionnaire" | "lecture_seule" | "super_admin"
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
      app_role: ["admin", "gestionnaire", "lecture_seule", "super_admin"],
    },
  },
} as const
