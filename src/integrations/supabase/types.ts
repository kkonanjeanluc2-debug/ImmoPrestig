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
      achat_contract_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          template_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          template_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          template_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      achat_signatures: {
        Row: {
          achat_id: string
          created_at: string
          document_type: string
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
          achat_id: string
          created_at?: string
          document_type: string
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
          achat_id?: string
          created_at?: string
          document_type?: string
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
            foreignKeyName: "achat_signatures_achat_id_fkey"
            columns: ["achat_id"]
            isOneToOne: false
            referencedRelation: "achats_immobiliers"
            referencedColumns: ["id"]
          },
        ]
      }
      achats_immobiliers: {
        Row: {
          acquereur_id: string | null
          agency_fees: number | null
          bien_id: string
          commission_amount: number | null
          commission_percentage: number | null
          created_at: string
          down_payment: number | null
          id: string
          is_agency_purchase: boolean
          notary_fees: number | null
          notes: string | null
          payment_type: string
          post_purchase_action: string | null
          sale_date: string
          sale_price: number
          total_installments: number | null
          updated_at: string
          user_id: string
          vendeur_id: string | null
        }
        Insert: {
          acquereur_id?: string | null
          agency_fees?: number | null
          bien_id: string
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          down_payment?: number | null
          id?: string
          is_agency_purchase?: boolean
          notary_fees?: number | null
          notes?: string | null
          payment_type?: string
          post_purchase_action?: string | null
          sale_date?: string
          sale_price: number
          total_installments?: number | null
          updated_at?: string
          user_id: string
          vendeur_id?: string | null
        }
        Update: {
          acquereur_id?: string | null
          agency_fees?: number | null
          bien_id?: string
          commission_amount?: number | null
          commission_percentage?: number | null
          created_at?: string
          down_payment?: number | null
          id?: string
          is_agency_purchase?: boolean
          notary_fees?: number | null
          notes?: string | null
          payment_type?: string
          post_purchase_action?: string | null
          sale_date?: string
          sale_price?: number
          total_installments?: number | null
          updated_at?: string
          user_id?: string
          vendeur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achats_immobiliers_acquereur_id_fkey"
            columns: ["acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achats_immobiliers_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_achat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achats_immobiliers_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "vendeurs"
            referencedColumns: ["id"]
          },
        ]
      }
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
      acquisitions: {
        Row: {
          acte_notarie: boolean | null
          attestation_fiscale: boolean | null
          beneficiaire_address: string | null
          beneficiaire_cni: string | null
          beneficiaire_email: string | null
          beneficiaire_name: string | null
          beneficiaire_phone: string | null
          beneficiaire_rccm: string | null
          beneficiaire_representant: string | null
          beneficiaire_type: string | null
          bien_echange_description: string | null
          bien_id: string
          certificat_localisation: boolean | null
          counterpart_address: string | null
          counterpart_email: string | null
          counterpart_name: string | null
          counterpart_phone: string | null
          created_at: string
          date_acquisition: string
          date_acte_signe: string | null
          date_deces: string | null
          date_enregistrement: string | null
          id: string
          lien_parente: string | null
          notaire_address: string | null
          notaire_email: string | null
          notaire_name: string | null
          notaire_phone: string | null
          notes: string | null
          numero_succession: string | null
          pieces_identite: boolean | null
          societe_name: string | null
          societe_siret: string | null
          status: string
          titre_propriete: boolean | null
          type_acquisition: string
          type_apport: string | null
          type_donation: string | null
          updated_at: string
          user_id: string
          valeur_bien_echange: number | null
          valeur_estimee: number | null
        }
        Insert: {
          acte_notarie?: boolean | null
          attestation_fiscale?: boolean | null
          beneficiaire_address?: string | null
          beneficiaire_cni?: string | null
          beneficiaire_email?: string | null
          beneficiaire_name?: string | null
          beneficiaire_phone?: string | null
          beneficiaire_rccm?: string | null
          beneficiaire_representant?: string | null
          beneficiaire_type?: string | null
          bien_echange_description?: string | null
          bien_id: string
          certificat_localisation?: boolean | null
          counterpart_address?: string | null
          counterpart_email?: string | null
          counterpart_name?: string | null
          counterpart_phone?: string | null
          created_at?: string
          date_acquisition?: string
          date_acte_signe?: string | null
          date_deces?: string | null
          date_enregistrement?: string | null
          id?: string
          lien_parente?: string | null
          notaire_address?: string | null
          notaire_email?: string | null
          notaire_name?: string | null
          notaire_phone?: string | null
          notes?: string | null
          numero_succession?: string | null
          pieces_identite?: boolean | null
          societe_name?: string | null
          societe_siret?: string | null
          status?: string
          titre_propriete?: boolean | null
          type_acquisition?: string
          type_apport?: string | null
          type_donation?: string | null
          updated_at?: string
          user_id: string
          valeur_bien_echange?: number | null
          valeur_estimee?: number | null
        }
        Update: {
          acte_notarie?: boolean | null
          attestation_fiscale?: boolean | null
          beneficiaire_address?: string | null
          beneficiaire_cni?: string | null
          beneficiaire_email?: string | null
          beneficiaire_name?: string | null
          beneficiaire_phone?: string | null
          beneficiaire_rccm?: string | null
          beneficiaire_representant?: string | null
          beneficiaire_type?: string | null
          bien_echange_description?: string | null
          bien_id?: string
          certificat_localisation?: boolean | null
          counterpart_address?: string | null
          counterpart_email?: string | null
          counterpart_name?: string | null
          counterpart_phone?: string | null
          created_at?: string
          date_acquisition?: string
          date_acte_signe?: string | null
          date_deces?: string | null
          date_enregistrement?: string | null
          id?: string
          lien_parente?: string | null
          notaire_address?: string | null
          notaire_email?: string | null
          notaire_name?: string | null
          notaire_phone?: string | null
          notes?: string | null
          numero_succession?: string | null
          pieces_identite?: boolean | null
          societe_name?: string | null
          societe_siret?: string | null
          status?: string
          titre_propriete?: boolean | null
          type_acquisition?: string
          type_apport?: string | null
          type_donation?: string | null
          updated_at?: string
          user_id?: string
          valeur_bien_echange?: number | null
          valeur_estimee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acquisitions_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_achat"
            referencedColumns: ["id"]
          },
        ]
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
          geniuspay_public_key: string | null
          geniuspay_sandbox: boolean | null
          geniuspay_secret_key: string | null
          id: string
          invoice_counter: number
          is_active: boolean
          kkiapay_private_key: string | null
          kkiapay_public_key: string | null
          kkiapay_sandbox: boolean | null
          kkiapay_secret: string | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          name: string
          notification_email: string | null
          notification_whatsapp: string | null
          online_rent_enabled: boolean
          pdf_header_text: string | null
          pdf_primary_color: string | null
          pdf_secondary_color: string | null
          pdf_text_color: string | null
          phone: string | null
          primary_color: string | null
          proforma_counter: number
          receipt_counter: number
          rent_due_day: number
          reservation_deposit_percentage: number
          sale_commission_percentage: number | null
          sidebar_color: string | null
          siret: string | null
          updated_at: string
          user_id: string
          wave_api_key: string | null
          wave_sandbox: boolean | null
          wave_webhook_secret: string | null
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
          geniuspay_public_key?: string | null
          geniuspay_sandbox?: boolean | null
          geniuspay_secret_key?: string | null
          id?: string
          invoice_counter?: number
          is_active?: boolean
          kkiapay_private_key?: string | null
          kkiapay_public_key?: string | null
          kkiapay_sandbox?: boolean | null
          kkiapay_secret?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          name: string
          notification_email?: string | null
          notification_whatsapp?: string | null
          online_rent_enabled?: boolean
          pdf_header_text?: string | null
          pdf_primary_color?: string | null
          pdf_secondary_color?: string | null
          pdf_text_color?: string | null
          phone?: string | null
          primary_color?: string | null
          proforma_counter?: number
          receipt_counter?: number
          rent_due_day?: number
          reservation_deposit_percentage?: number
          sale_commission_percentage?: number | null
          sidebar_color?: string | null
          siret?: string | null
          updated_at?: string
          user_id: string
          wave_api_key?: string | null
          wave_sandbox?: boolean | null
          wave_webhook_secret?: string | null
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
          geniuspay_public_key?: string | null
          geniuspay_sandbox?: boolean | null
          geniuspay_secret_key?: string | null
          id?: string
          invoice_counter?: number
          is_active?: boolean
          kkiapay_private_key?: string | null
          kkiapay_public_key?: string | null
          kkiapay_sandbox?: boolean | null
          kkiapay_secret?: string | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          name?: string
          notification_email?: string | null
          notification_whatsapp?: string | null
          online_rent_enabled?: boolean
          pdf_header_text?: string | null
          pdf_primary_color?: string | null
          pdf_secondary_color?: string | null
          pdf_text_color?: string | null
          phone?: string | null
          primary_color?: string | null
          proforma_counter?: number
          receipt_counter?: number
          rent_due_day?: number
          reservation_deposit_percentage?: number
          sale_commission_percentage?: number | null
          sidebar_color?: string | null
          siret?: string | null
          updated_at?: string
          user_id?: string
          wave_api_key?: string | null
          wave_sandbox?: boolean | null
          wave_webhook_secret?: string | null
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
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
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
            foreignKeyName: "agency_subscriptions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: true
            referencedRelation: "agencies_public"
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
      apporteurs_affaires: {
        Row: {
          address: string | null
          cni_number: string | null
          commission_percentage: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          cni_number?: string | null
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          cni_number?: string | null
          commission_percentage?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apports: {
        Row: {
          apport_date: string
          apporteur_id: string
          commission_amount: number | null
          commission_percentage: number
          commission_type: string
          created_at: string
          description: string | null
          id: string
          paid_at: string | null
          property_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apport_date?: string
          apporteur_id: string
          commission_amount?: number | null
          commission_percentage: number
          commission_type?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          property_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apport_date?: string
          apporteur_id?: string
          commission_amount?: number | null
          commission_percentage?: number
          commission_type?: string
          created_at?: string
          description?: string | null
          id?: string
          paid_at?: string | null
          property_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apports_apporteur_id_fkey"
            columns: ["apporteur_id"]
            isOneToOne: false
            referencedRelation: "apporteurs_affaires"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attestation_templates: {
        Row: {
          arrete_approbation: string | null
          arrete_date: string | null
          arrete_numero: string | null
          banner_color_1: string | null
          banner_color_2: string | null
          banner_gradient: boolean | null
          commune: string | null
          content: string
          created_at: string
          district: string | null
          doc_bg_color_1: string | null
          doc_bg_color_2: string | null
          doc_bg_gradient: boolean | null
          header_departement: string | null
          header_devise: string | null
          header_line_color: string | null
          header_ministere: string | null
          header_region: string | null
          header_republique: string | null
          id: string
          is_default: boolean
          lotissement_origin_name: string | null
          name: string
          page_border_color: string | null
          page_border_enabled: boolean | null
          page_border_style: string | null
          right_logo_url: string | null
          template_type: string
          title_bg_color: string | null
          title_border_color: string | null
          updated_at: string
          user_id: string
          village: string | null
          village_logo_url: string | null
          watermark_angle: string | null
          watermark_image_url: string | null
          watermark_opacity: number | null
          watermark_position_x: number | null
          watermark_position_y: number | null
          watermark_repeat: boolean | null
          watermark_rotation: number | null
          watermark_text: string | null
          watermark_type: string | null
        }
        Insert: {
          arrete_approbation?: string | null
          arrete_date?: string | null
          arrete_numero?: string | null
          banner_color_1?: string | null
          banner_color_2?: string | null
          banner_gradient?: boolean | null
          commune?: string | null
          content?: string
          created_at?: string
          district?: string | null
          doc_bg_color_1?: string | null
          doc_bg_color_2?: string | null
          doc_bg_gradient?: boolean | null
          header_departement?: string | null
          header_devise?: string | null
          header_line_color?: string | null
          header_ministere?: string | null
          header_region?: string | null
          header_republique?: string | null
          id?: string
          is_default?: boolean
          lotissement_origin_name?: string | null
          name: string
          page_border_color?: string | null
          page_border_enabled?: boolean | null
          page_border_style?: string | null
          right_logo_url?: string | null
          template_type?: string
          title_bg_color?: string | null
          title_border_color?: string | null
          updated_at?: string
          user_id: string
          village?: string | null
          village_logo_url?: string | null
          watermark_angle?: string | null
          watermark_image_url?: string | null
          watermark_opacity?: number | null
          watermark_position_x?: number | null
          watermark_position_y?: number | null
          watermark_repeat?: boolean | null
          watermark_rotation?: number | null
          watermark_text?: string | null
          watermark_type?: string | null
        }
        Update: {
          arrete_approbation?: string | null
          arrete_date?: string | null
          arrete_numero?: string | null
          banner_color_1?: string | null
          banner_color_2?: string | null
          banner_gradient?: boolean | null
          commune?: string | null
          content?: string
          created_at?: string
          district?: string | null
          doc_bg_color_1?: string | null
          doc_bg_color_2?: string | null
          doc_bg_gradient?: boolean | null
          header_departement?: string | null
          header_devise?: string | null
          header_line_color?: string | null
          header_ministere?: string | null
          header_region?: string | null
          header_republique?: string | null
          id?: string
          is_default?: boolean
          lotissement_origin_name?: string | null
          name?: string
          page_border_color?: string | null
          page_border_enabled?: boolean | null
          page_border_style?: string | null
          right_logo_url?: string | null
          template_type?: string
          title_bg_color?: string | null
          title_border_color?: string | null
          updated_at?: string
          user_id?: string
          village?: string | null
          village_logo_url?: string | null
          watermark_angle?: string | null
          watermark_image_url?: string | null
          watermark_opacity?: number | null
          watermark_position_x?: number | null
          watermark_position_y?: number | null
          watermark_repeat?: boolean | null
          watermark_rotation?: number | null
          watermark_text?: string | null
          watermark_type?: string | null
        }
        Relationships: []
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
          commission_report_day: number
          commission_report_time: string
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
          commission_report_day?: number
          commission_report_time?: string
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
          commission_report_day?: number
          commission_report_time?: string
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
      beneficiaires_lots: {
        Row: {
          cni_number: string | null
          created_at: string
          email: string | null
          id: string
          lien_role: string | null
          lotissement_id: string
          member_user_id: string | null
          nom: string
          partie: string
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cni_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lien_role?: string | null
          lotissement_id: string
          member_user_id?: string | null
          nom: string
          partie: string
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cni_number?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lien_role?: string | null
          lotissement_id?: string
          member_user_id?: string | null
          nom?: string
          partie?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaires_lots_lotissement_id_fkey"
            columns: ["lotissement_id"]
            isOneToOne: false
            referencedRelation: "lotissements"
            referencedColumns: ["id"]
          },
        ]
      }
      biens_achat: {
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
          status: string
          title: string
          updated_at: string
          user_id: string
          vendeur_id: string | null
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
          status?: string
          title: string
          updated_at?: string
          user_id: string
          vendeur_id?: string | null
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
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          vendeur_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biens_achat_vendeur_id_fkey"
            columns: ["vendeur_id"]
            isOneToOne: false
            referencedRelation: "vendeurs"
            referencedColumns: ["id"]
          },
        ]
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
      colocation_contract_templates: {
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
      colocation_tenants: {
        Row: {
          contract_id: string
          created_at: string
          end_date: string | null
          id: string
          is_principal: boolean
          rent_share: number | null
          start_date: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_principal?: boolean
          rent_share?: number | null
          start_date: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_principal?: boolean
          rent_share?: number | null
          start_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colocation_tenants_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colocation_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          deleted_at: string | null
          deposit: number | null
          end_date: string
          id: string
          is_colocation: boolean
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
          deleted_at?: string | null
          deposit?: number | null
          end_date: string
          id?: string
          is_colocation?: boolean
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
          deleted_at?: string | null
          deposit?: number | null
          end_date?: string
          id?: string
          is_colocation?: boolean
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
      documents_achats: {
        Row: {
          bien_id: string
          created_at: string
          file_size: string | null
          file_url: string | null
          id: string
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bien_id: string
          created_at?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          name: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bien_id?: string
          created_at?: string
          file_size?: string | null
          file_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_achats_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_achat"
            referencedColumns: ["id"]
          },
        ]
      }
      echeances_achats: {
        Row: {
          achat_id: string
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
        }
        Insert: {
          achat_id: string
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
        }
        Update: {
          achat_id?: string
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
        }
        Relationships: [
          {
            foreignKeyName: "echeances_achats_achat_id_fkey"
            columns: ["achat_id"]
            isOneToOne: false
            referencedRelation: "achats_immobiliers"
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      guide_templates: {
        Row: {
          bg_color: string | null
          border_color: string | null
          commune: string | null
          created_at: string
          district: string | null
          id: string
          is_default: boolean | null
          name: string
          subtitle_color: string | null
          title_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bg_color?: string | null
          border_color?: string | null
          commune?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          subtitle_color?: string | null
          title_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bg_color?: string | null
          border_color?: string | null
          commune?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          subtitle_color?: string | null
          title_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      inventory_items: {
        Row: {
          brand: string | null
          condition: string
          created_at: string
          id: string
          inventory_id: string
          item_name: string
          model: string | null
          observations: string | null
          quantity: number
          room: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          condition?: string
          created_at?: string
          id?: string
          inventory_id: string
          item_name: string
          model?: string | null
          observations?: string | null
          quantity?: number
          room: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          condition?: string
          created_at?: string
          id?: string
          inventory_id?: string
          item_name?: string
          model?: string | null
          observations?: string | null
          quantity?: number
          room?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "property_inventories"
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
          attestation_template_id: string | null
          cession_template_id: string | null
          chef_signature_url: string | null
          chef_stamp_url: string | null
          chef_village_name: string | null
          chef_village_titre: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          guide_template_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          location: string
          longitude: number | null
          lotisseur_name: string | null
          name: string
          proprietaire_name: string | null
          repartition_lotisseur: number | null
          repartition_proprietaire: number | null
          total_area: number | null
          total_plots: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attestation_template_id?: string | null
          cession_template_id?: string | null
          chef_signature_url?: string | null
          chef_stamp_url?: string | null
          chef_village_name?: string | null
          chef_village_titre?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          guide_template_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location: string
          longitude?: number | null
          lotisseur_name?: string | null
          name: string
          proprietaire_name?: string | null
          repartition_lotisseur?: number | null
          repartition_proprietaire?: number | null
          total_area?: number | null
          total_plots?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attestation_template_id?: string | null
          cession_template_id?: string | null
          chef_signature_url?: string | null
          chef_stamp_url?: string | null
          chef_village_name?: string | null
          chef_village_titre?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          guide_template_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          lotisseur_name?: string | null
          name?: string
          proprietaire_name?: string | null
          repartition_lotisseur?: number | null
          repartition_proprietaire?: number | null
          total_area?: number | null
          total_plots?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotissements_attestation_template_id_fkey"
            columns: ["attestation_template_id"]
            isOneToOne: false
            referencedRelation: "attestation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotissements_cession_template_id_fkey"
            columns: ["cession_template_id"]
            isOneToOne: false
            referencedRelation: "attestation_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotissements_guide_template_id_fkey"
            columns: ["guide_template_id"]
            isOneToOne: false
            referencedRelation: "guide_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      management_contract_templates: {
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
          can_access_achat_contracts_tab: boolean
          can_access_agency_tab: boolean
          can_access_crm_immobilier: boolean
          can_access_gestion_locative: boolean
          can_access_guide: boolean
          can_access_management_tab: boolean
          can_access_notifications_tab: boolean
          can_access_promesse_vente_tab: boolean
          can_access_repartition: boolean
          can_access_reservation_forms_tab: boolean
          can_access_sale_contracts_tab: boolean
          can_access_settings: boolean
          can_access_subscription_tab: boolean
          can_access_whatsapp_tab: boolean
          can_cancel_vente_parcelle: boolean
          can_collect_echeances_achats: boolean
          can_collect_echeances_lotissements: boolean
          can_collect_echeances_ventes: boolean
          can_create_achats: boolean
          can_create_achats_documents: boolean
          can_create_apporteurs: boolean
          can_create_biens_vente: boolean | null
          can_create_contracts: boolean
          can_create_demarches: boolean | null
          can_create_documents: boolean
          can_create_expenses: boolean
          can_create_ilots: boolean | null
          can_create_impayes: boolean
          can_create_impayes_actions: boolean
          can_create_invoices: boolean
          can_create_lotissement_documents: boolean | null
          can_create_lotissement_prospects: boolean | null
          can_create_lotissements: boolean
          can_create_offres_achat: boolean
          can_create_owner_payouts: boolean
          can_create_owners: boolean
          can_create_parcelles: boolean | null
          can_create_payments: boolean
          can_create_properties: boolean
          can_create_tenants: boolean
          can_create_vente_prospects: boolean | null
          can_create_ventes: boolean
          can_delete_achats: boolean
          can_delete_apporteurs: boolean
          can_delete_contracts: boolean
          can_delete_documents: boolean
          can_delete_impayes: boolean
          can_delete_lotissements: boolean
          can_delete_owners: boolean
          can_delete_payments: boolean
          can_delete_properties: boolean
          can_delete_tenants: boolean
          can_delete_ventes: boolean
          can_edit_achats: boolean
          can_edit_apporteurs: boolean
          can_edit_biens_vente: boolean | null
          can_edit_contracts: boolean
          can_edit_impayes: boolean
          can_edit_lotissements: boolean
          can_edit_owners: boolean
          can_edit_payments: boolean
          can_edit_properties: boolean
          can_edit_tenants: boolean
          can_edit_ventes: boolean
          can_export_comptabilite: boolean
          can_export_data: boolean
          can_export_guide: boolean
          can_import_geometre: boolean
          can_manage_automations: boolean
          can_manage_branding: boolean
          can_manage_mutations: boolean
          can_manage_mutations_parcelle: boolean
          can_manage_team: boolean
          can_manage_templates: boolean
          can_send_reminders: boolean
          can_view_achats: boolean
          can_view_apporteurs: boolean
          can_view_comptabilite: boolean
          can_view_contracts: boolean
          can_view_documents: boolean
          can_view_echeances_achats: boolean
          can_view_echeances_lotissements: boolean
          can_view_echeances_ventes: boolean
          can_view_impayes: boolean
          can_view_invoices: boolean
          can_view_lotissements: boolean
          can_view_owner_payouts: boolean
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
          can_access_achat_contracts_tab?: boolean
          can_access_agency_tab?: boolean
          can_access_crm_immobilier?: boolean
          can_access_gestion_locative?: boolean
          can_access_guide?: boolean
          can_access_management_tab?: boolean
          can_access_notifications_tab?: boolean
          can_access_promesse_vente_tab?: boolean
          can_access_repartition?: boolean
          can_access_reservation_forms_tab?: boolean
          can_access_sale_contracts_tab?: boolean
          can_access_settings?: boolean
          can_access_subscription_tab?: boolean
          can_access_whatsapp_tab?: boolean
          can_cancel_vente_parcelle?: boolean
          can_collect_echeances_achats?: boolean
          can_collect_echeances_lotissements?: boolean
          can_collect_echeances_ventes?: boolean
          can_create_achats?: boolean
          can_create_achats_documents?: boolean
          can_create_apporteurs?: boolean
          can_create_biens_vente?: boolean | null
          can_create_contracts?: boolean
          can_create_demarches?: boolean | null
          can_create_documents?: boolean
          can_create_expenses?: boolean
          can_create_ilots?: boolean | null
          can_create_impayes?: boolean
          can_create_impayes_actions?: boolean
          can_create_invoices?: boolean
          can_create_lotissement_documents?: boolean | null
          can_create_lotissement_prospects?: boolean | null
          can_create_lotissements?: boolean
          can_create_offres_achat?: boolean
          can_create_owner_payouts?: boolean
          can_create_owners?: boolean
          can_create_parcelles?: boolean | null
          can_create_payments?: boolean
          can_create_properties?: boolean
          can_create_tenants?: boolean
          can_create_vente_prospects?: boolean | null
          can_create_ventes?: boolean
          can_delete_achats?: boolean
          can_delete_apporteurs?: boolean
          can_delete_contracts?: boolean
          can_delete_documents?: boolean
          can_delete_impayes?: boolean
          can_delete_lotissements?: boolean
          can_delete_owners?: boolean
          can_delete_payments?: boolean
          can_delete_properties?: boolean
          can_delete_tenants?: boolean
          can_delete_ventes?: boolean
          can_edit_achats?: boolean
          can_edit_apporteurs?: boolean
          can_edit_biens_vente?: boolean | null
          can_edit_contracts?: boolean
          can_edit_impayes?: boolean
          can_edit_lotissements?: boolean
          can_edit_owners?: boolean
          can_edit_payments?: boolean
          can_edit_properties?: boolean
          can_edit_tenants?: boolean
          can_edit_ventes?: boolean
          can_export_comptabilite?: boolean
          can_export_data?: boolean
          can_export_guide?: boolean
          can_import_geometre?: boolean
          can_manage_automations?: boolean
          can_manage_branding?: boolean
          can_manage_mutations?: boolean
          can_manage_mutations_parcelle?: boolean
          can_manage_team?: boolean
          can_manage_templates?: boolean
          can_send_reminders?: boolean
          can_view_achats?: boolean
          can_view_apporteurs?: boolean
          can_view_comptabilite?: boolean
          can_view_contracts?: boolean
          can_view_documents?: boolean
          can_view_echeances_achats?: boolean
          can_view_echeances_lotissements?: boolean
          can_view_echeances_ventes?: boolean
          can_view_impayes?: boolean
          can_view_invoices?: boolean
          can_view_lotissements?: boolean
          can_view_owner_payouts?: boolean
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
          can_access_achat_contracts_tab?: boolean
          can_access_agency_tab?: boolean
          can_access_crm_immobilier?: boolean
          can_access_gestion_locative?: boolean
          can_access_guide?: boolean
          can_access_management_tab?: boolean
          can_access_notifications_tab?: boolean
          can_access_promesse_vente_tab?: boolean
          can_access_repartition?: boolean
          can_access_reservation_forms_tab?: boolean
          can_access_sale_contracts_tab?: boolean
          can_access_settings?: boolean
          can_access_subscription_tab?: boolean
          can_access_whatsapp_tab?: boolean
          can_cancel_vente_parcelle?: boolean
          can_collect_echeances_achats?: boolean
          can_collect_echeances_lotissements?: boolean
          can_collect_echeances_ventes?: boolean
          can_create_achats?: boolean
          can_create_achats_documents?: boolean
          can_create_apporteurs?: boolean
          can_create_biens_vente?: boolean | null
          can_create_contracts?: boolean
          can_create_demarches?: boolean | null
          can_create_documents?: boolean
          can_create_expenses?: boolean
          can_create_ilots?: boolean | null
          can_create_impayes?: boolean
          can_create_impayes_actions?: boolean
          can_create_invoices?: boolean
          can_create_lotissement_documents?: boolean | null
          can_create_lotissement_prospects?: boolean | null
          can_create_lotissements?: boolean
          can_create_offres_achat?: boolean
          can_create_owner_payouts?: boolean
          can_create_owners?: boolean
          can_create_parcelles?: boolean | null
          can_create_payments?: boolean
          can_create_properties?: boolean
          can_create_tenants?: boolean
          can_create_vente_prospects?: boolean | null
          can_create_ventes?: boolean
          can_delete_achats?: boolean
          can_delete_apporteurs?: boolean
          can_delete_contracts?: boolean
          can_delete_documents?: boolean
          can_delete_impayes?: boolean
          can_delete_lotissements?: boolean
          can_delete_owners?: boolean
          can_delete_payments?: boolean
          can_delete_properties?: boolean
          can_delete_tenants?: boolean
          can_delete_ventes?: boolean
          can_edit_achats?: boolean
          can_edit_apporteurs?: boolean
          can_edit_biens_vente?: boolean | null
          can_edit_contracts?: boolean
          can_edit_impayes?: boolean
          can_edit_lotissements?: boolean
          can_edit_owners?: boolean
          can_edit_payments?: boolean
          can_edit_properties?: boolean
          can_edit_tenants?: boolean
          can_edit_ventes?: boolean
          can_export_comptabilite?: boolean
          can_export_data?: boolean
          can_export_guide?: boolean
          can_import_geometre?: boolean
          can_manage_automations?: boolean
          can_manage_branding?: boolean
          can_manage_mutations?: boolean
          can_manage_mutations_parcelle?: boolean
          can_manage_team?: boolean
          can_manage_templates?: boolean
          can_send_reminders?: boolean
          can_view_achats?: boolean
          can_view_apporteurs?: boolean
          can_view_comptabilite?: boolean
          can_view_contracts?: boolean
          can_view_documents?: boolean
          can_view_echeances_achats?: boolean
          can_view_echeances_lotissements?: boolean
          can_view_echeances_ventes?: boolean
          can_view_impayes?: boolean
          can_view_invoices?: boolean
          can_view_lotissements?: boolean
          can_view_owner_payouts?: boolean
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
      mutations_achats: {
        Row: {
          achat_id: string
          bien_id: string
          certificat_localisation: boolean | null
          created_at: string
          date_acte_signe: string | null
          date_depot_notaire: string | null
          date_mutation_enregistree: string | null
          documents_transmis: Json | null
          droits_enregistrement: number | null
          etat_foncier: boolean | null
          frais_fixes: number | null
          frais_notariaux: number | null
          id: string
          notaire_address: string | null
          notaire_email: string | null
          notaire_name: string | null
          notaire_phone: string | null
          notes: string | null
          pieces_identite: boolean | null
          quittances_paiement: boolean | null
          situation_fiscale: boolean | null
          status: string
          taxe_publicite: number | null
          titre_propriete: boolean | null
          type_mutation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          achat_id: string
          bien_id: string
          certificat_localisation?: boolean | null
          created_at?: string
          date_acte_signe?: string | null
          date_depot_notaire?: string | null
          date_mutation_enregistree?: string | null
          documents_transmis?: Json | null
          droits_enregistrement?: number | null
          etat_foncier?: boolean | null
          frais_fixes?: number | null
          frais_notariaux?: number | null
          id?: string
          notaire_address?: string | null
          notaire_email?: string | null
          notaire_name?: string | null
          notaire_phone?: string | null
          notes?: string | null
          pieces_identite?: boolean | null
          quittances_paiement?: boolean | null
          situation_fiscale?: boolean | null
          status?: string
          taxe_publicite?: number | null
          titre_propriete?: boolean | null
          type_mutation?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          achat_id?: string
          bien_id?: string
          certificat_localisation?: boolean | null
          created_at?: string
          date_acte_signe?: string | null
          date_depot_notaire?: string | null
          date_mutation_enregistree?: string | null
          documents_transmis?: Json | null
          droits_enregistrement?: number | null
          etat_foncier?: boolean | null
          frais_fixes?: number | null
          frais_notariaux?: number | null
          id?: string
          notaire_address?: string | null
          notaire_email?: string | null
          notaire_name?: string | null
          notaire_phone?: string | null
          notes?: string | null
          pieces_identite?: boolean | null
          quittances_paiement?: boolean | null
          situation_fiscale?: boolean | null
          status?: string
          taxe_publicite?: number | null
          titre_propriete?: boolean | null
          type_mutation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutations_achats_achat_id_fkey"
            columns: ["achat_id"]
            isOneToOne: true
            referencedRelation: "achats_immobiliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_achats_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_achat"
            referencedColumns: ["id"]
          },
        ]
      }
      mutations_parcelles: {
        Row: {
          ancien_acquereur_id: string
          created_at: string
          id: string
          mutation_date: string
          mutation_price: number | null
          notes: string | null
          nouvel_acquereur_id: string
          parcelle_id: string
          updated_at: string
          user_id: string
          vente_id: string
        }
        Insert: {
          ancien_acquereur_id: string
          created_at?: string
          id?: string
          mutation_date?: string
          mutation_price?: number | null
          notes?: string | null
          nouvel_acquereur_id: string
          parcelle_id: string
          updated_at?: string
          user_id: string
          vente_id: string
        }
        Update: {
          ancien_acquereur_id?: string
          created_at?: string
          id?: string
          mutation_date?: string
          mutation_price?: number | null
          notes?: string | null
          nouvel_acquereur_id?: string
          parcelle_id?: string
          updated_at?: string
          user_id?: string
          vente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mutations_parcelles_ancien_acquereur_id_fkey"
            columns: ["ancien_acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_parcelles_nouvel_acquereur_id_fkey"
            columns: ["nouvel_acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_parcelles_parcelle_id_fkey"
            columns: ["parcelle_id"]
            isOneToOne: false
            referencedRelation: "parcelles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mutations_parcelles_vente_id_fkey"
            columns: ["vente_id"]
            isOneToOne: false
            referencedRelation: "ventes_parcelles"
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
      offres_achat: {
        Row: {
          acquereur_id: string | null
          bien_id: string
          conditions: string | null
          counter_amount: number | null
          created_at: string
          expiry_date: string | null
          id: string
          notes: string | null
          offer_amount: number
          offer_date: string
          status: string
          updated_at: string
          user_id: string
          vendor_responded_at: string | null
          vendor_response_notes: string | null
          vendor_token: string | null
          vendor_token_expires_at: string | null
        }
        Insert: {
          acquereur_id?: string | null
          bien_id: string
          conditions?: string | null
          counter_amount?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          offer_amount: number
          offer_date?: string
          status?: string
          updated_at?: string
          user_id: string
          vendor_responded_at?: string | null
          vendor_response_notes?: string | null
          vendor_token?: string | null
          vendor_token_expires_at?: string | null
        }
        Update: {
          acquereur_id?: string | null
          bien_id?: string
          conditions?: string | null
          counter_amount?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          notes?: string | null
          offer_amount?: number
          offer_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          vendor_responded_at?: string | null
          vendor_response_notes?: string | null
          vendor_token?: string | null
          vendor_token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offres_achat_acquereur_id_fkey"
            columns: ["acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offres_achat_bien_id_fkey"
            columns: ["bien_id"]
            isOneToOne: false
            referencedRelation: "biens_achat"
            referencedColumns: ["id"]
          },
        ]
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
      owner_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          owner_id: string
          payment_method: string | null
          payment_proof_url: string | null
          payout_date: string
          payout_month: number
          payout_year: number
          recipient_phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id: string
          payment_method?: string | null
          payment_proof_url?: string | null
          payout_date?: string
          payout_month: number
          payout_year: number
          recipient_phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          owner_id?: string
          payment_method?: string | null
          payment_proof_url?: string | null
          payout_date?: string
          payout_month?: number
          payout_year?: number
          recipient_phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
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
          email: string | null
          id: string
          management_contract_template_id: string | null
          management_type_id: string | null
          name: string
          phone: string | null
          profession: string | null
          receipt_template_id: string | null
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
          email?: string | null
          id?: string
          management_contract_template_id?: string | null
          management_type_id?: string | null
          name: string
          phone?: string | null
          profession?: string | null
          receipt_template_id?: string | null
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
          email?: string | null
          id?: string
          management_contract_template_id?: string | null
          management_type_id?: string | null
          name?: string
          phone?: string | null
          profession?: string | null
          receipt_template_id?: string | null
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
            foreignKeyName: "owners_management_contract_template_id_fkey"
            columns: ["management_contract_template_id"]
            isOneToOne: false
            referencedRelation: "management_contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_management_type_id_fkey"
            columns: ["management_type_id"]
            isOneToOne: false
            referencedRelation: "management_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_receipt_template_id_fkey"
            columns: ["receipt_template_id"]
            isOneToOne: false
            referencedRelation: "receipt_templates"
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
          attribution: string | null
          beneficiaire_id: string | null
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
          attribution?: string | null
          beneficiaire_id?: string | null
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
          attribution?: string | null
          beneficiaire_id?: string | null
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
            foreignKeyName: "parcelles_beneficiaire_id_fkey"
            columns: ["beneficiaire_id"]
            isOneToOne: false
            referencedRelation: "beneficiaires_lots"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "payment_transactions_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
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
          last_collected_amount: number | null
          method: string | null
          paid_amount: number | null
          paid_date: string | null
          payment_months: string[] | null
          receipt_number: string | null
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
          last_collected_amount?: number | null
          method?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_months?: string[] | null
          receipt_number?: string | null
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
          last_collected_amount?: number | null
          method?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          payment_months?: string[] | null
          receipt_number?: string | null
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
      payout_otp_codes: {
        Row: {
          amount: number | null
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          owner_email: string
          payout_month: string | null
          payout_year: number | null
          used: boolean
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          owner_email: string
          payout_month?: string | null
          payout_year?: number | null
          used?: boolean
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          owner_email?: string
          payout_month?: string | null
          payout_year?: number | null
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      payout_otps: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          user_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          user_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      payout_signatures: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          payout_id: string
          signature_data: string | null
          signature_text: string | null
          signature_token: string | null
          signature_type: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          status: string
          token_expires_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          payout_id: string
          signature_data?: string | null
          signature_text?: string | null
          signature_token?: string | null
          signature_type?: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          payout_id?: string
          signature_data?: string | null
          signature_text?: string | null
          signature_token?: string | null
          signature_type?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_signatures_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "owner_payouts"
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
          {
            foreignKeyName: "payouts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies_public"
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
      proforma_invoices: {
        Row: {
          converted_at: string | null
          converted_from_id: string | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          invoice_type: string
          items: Json
          notes: string | null
          property_name: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string
          tenant_phone: string | null
          total_amount: number
          unit_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          converted_at?: string | null
          converted_from_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string
          items?: Json
          notes?: string | null
          property_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name: string
          tenant_phone?: string | null
          total_amount?: number
          unit_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          converted_at?: string | null
          converted_from_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          items?: Json
          notes?: string | null
          property_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          tenant_email?: string | null
          tenant_id?: string | null
          tenant_name?: string
          tenant_phone?: string | null
          total_amount?: number
          unit_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proforma_invoices_converted_from_id_fkey"
            columns: ["converted_from_id"]
            isOneToOne: false
            referencedRelation: "proforma_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proforma_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      promesse_vente_templates: {
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
      properties: {
        Row: {
          address: string
          area: number | null
          assigned_to: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string
          daily_rent_days: number | null
          daily_rent_discount: number | null
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          owner_id: string | null
          price: number
          property_type: string
          rent_type: string
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
          city?: string | null
          created_at?: string
          daily_rent_days?: number | null
          daily_rent_discount?: number | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string | null
          price: number
          property_type: string
          rent_type?: string
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
          city?: string | null
          created_at?: string
          daily_rent_days?: number | null
          daily_rent_discount?: number | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          owner_id?: string | null
          price?: number
          property_type?: string
          rent_type?: string
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
      property_inventories: {
        Row: {
          contract_id: string | null
          created_at: string
          general_notes: string | null
          id: string
          inventory_date: string
          landlord_signature: string | null
          landlord_signed_at: string | null
          property_id: string
          status: string
          tenant_id: string | null
          tenant_signature: string | null
          tenant_signed_at: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_id?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          inventory_date?: string
          landlord_signature?: string | null
          landlord_signed_at?: string | null
          property_id: string
          status?: string
          tenant_id?: string | null
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_id?: string | null
          created_at?: string
          general_notes?: string | null
          id?: string
          inventory_date?: string
          landlord_signature?: string | null
          landlord_signed_at?: string | null
          property_id?: string
          status?: string
          tenant_id?: string | null
          tenant_signature?: string | null
          tenant_signed_at?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_inventories_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inventories_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inventories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          stamp_image_url: string | null
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
          stamp_image_url?: string | null
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
          stamp_image_url?: string | null
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
      reservation_form_templates: {
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
      reservations_parcelles: {
        Row: {
          acquereur_id: string
          converted_vente_id: string | null
          created_at: string
          deposit_amount: number
          expiry_date: string
          id: string
          notes: string | null
          parcelle_id: string
          payment_method: string | null
          reservation_date: string
          status: string
          updated_at: string
          user_id: string
          validity_days: number
        }
        Insert: {
          acquereur_id: string
          converted_vente_id?: string | null
          created_at?: string
          deposit_amount?: number
          expiry_date: string
          id?: string
          notes?: string | null
          parcelle_id: string
          payment_method?: string | null
          reservation_date?: string
          status?: string
          updated_at?: string
          user_id: string
          validity_days?: number
        }
        Update: {
          acquereur_id?: string
          converted_vente_id?: string | null
          created_at?: string
          deposit_amount?: number
          expiry_date?: string
          id?: string
          notes?: string | null
          parcelle_id?: string
          payment_method?: string | null
          reservation_date?: string
          status?: string
          updated_at?: string
          user_id?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "reservations_parcelles_acquereur_id_fkey"
            columns: ["acquereur_id"]
            isOneToOne: false
            referencedRelation: "acquereurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_parcelles_converted_vente_id_fkey"
            columns: ["converted_vente_id"]
            isOneToOne: false
            referencedRelation: "ventes_parcelles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_parcelles_parcelle_id_fkey"
            columns: ["parcelle_id"]
            isOneToOne: false
            referencedRelation: "parcelles"
            referencedColumns: ["id"]
          },
        ]
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
          price_quarterly: number
          price_semi_annual: number
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
          price_quarterly?: number
          price_semi_annual?: number
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
          price_quarterly?: number
          price_semi_annual?: number
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
      tenant_requests: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          priority: string
          property_id: string | null
          responded_at: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          property_id?: string | null
          responded_at?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          property_id?: string | null
          responded_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          agency_fees: number | null
          assigned_to: string | null
          avatar_url: string | null
          birth_date: string | null
          birth_place: string | null
          cni_document_url: string | null
          cni_number: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          has_portal_access: boolean
          id: string
          name: string
          phone: string | null
          portal_user_id: string | null
          profession: string | null
          property_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency_fees?: number | null
          assigned_to?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_document_url?: string | null
          cni_number?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_portal_access?: boolean
          id?: string
          name: string
          phone?: string | null
          portal_user_id?: string | null
          profession?: string | null
          property_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency_fees?: number | null
          assigned_to?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          birth_place?: string | null
          cni_document_url?: string | null
          cni_number?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          has_portal_access?: boolean
          id?: string
          name?: string
          phone?: string | null
          portal_user_id?: string | null
          profession?: string | null
          property_id?: string | null
          status?: string
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
      unpaid_case_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["unpaid_action_type"]
          case_id: string
          created_at: string
          description: string
          document_url: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["unpaid_action_type"]
          case_id: string
          created_at?: string
          description: string
          document_url?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["unpaid_action_type"]
          case_id?: string
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unpaid_case_actions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "unpaid_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      unpaid_cases: {
        Row: {
          amount_due: number
          court_reference: string | null
          created_at: string
          days_late: number
          due_date: string
          formal_notice_date: string | null
          id: string
          judgment_date: string | null
          lawyer_email: string | null
          lawyer_name: string | null
          lawyer_phone: string | null
          legal_transmission_date: string | null
          notes: string | null
          payment_id: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["unpaid_case_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_due?: number
          court_reference?: string | null
          created_at?: string
          days_late?: number
          due_date: string
          formal_notice_date?: string | null
          id?: string
          judgment_date?: string | null
          lawyer_email?: string | null
          lawyer_name?: string | null
          lawyer_phone?: string | null
          legal_transmission_date?: string | null
          notes?: string | null
          payment_id?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["unpaid_case_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_due?: number
          court_reference?: string | null
          created_at?: string
          days_late?: number
          due_date?: string
          formal_notice_date?: string | null
          id?: string
          judgment_date?: string | null
          lawyer_email?: string | null
          lawyer_name?: string | null
          lawyer_phone?: string | null
          legal_transmission_date?: string | null
          notes?: string | null
          payment_id?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["unpaid_case_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unpaid_cases_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unpaid_cases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unpaid_cases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      vendeurs: {
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
      vente_signatures: {
        Row: {
          created_at: string
          document_type: string
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
          vente_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
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
          vente_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
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
          vente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vente_signatures_vente_id_fkey"
            columns: ["vente_id"]
            isOneToOne: false
            referencedRelation: "ventes_immobilieres"
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
          signature_status: string | null
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
          signature_status?: string | null
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
          signature_status?: string | null
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
      agencies_public: {
        Row: {
          accent_color: string | null
          account_type: Database["public"]["Enums"]["account_type"] | null
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          geniuspay_public_key: string | null
          geniuspay_sandbox: boolean | null
          id: string | null
          invoice_counter: number | null
          is_active: boolean | null
          kkiapay_public_key: string | null
          kkiapay_sandbox: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          name: string | null
          notification_email: string | null
          notification_whatsapp: string | null
          online_rent_enabled: boolean | null
          pdf_header_text: string | null
          pdf_primary_color: string | null
          pdf_secondary_color: string | null
          pdf_text_color: string | null
          phone: string | null
          primary_color: string | null
          proforma_counter: number | null
          receipt_counter: number | null
          rent_due_day: number | null
          reservation_deposit_percentage: number | null
          sale_commission_percentage: number | null
          sidebar_color: string | null
          siret: string | null
          updated_at: string | null
          user_id: string | null
          wave_sandbox: boolean | null
          whatsapp_property_template: string | null
        }
        Insert: {
          accent_color?: string | null
          account_type?: Database["public"]["Enums"]["account_type"] | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          geniuspay_public_key?: string | null
          geniuspay_sandbox?: boolean | null
          id?: string | null
          invoice_counter?: number | null
          is_active?: boolean | null
          kkiapay_public_key?: string | null
          kkiapay_sandbox?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          name?: string | null
          notification_email?: string | null
          notification_whatsapp?: string | null
          online_rent_enabled?: boolean | null
          pdf_header_text?: string | null
          pdf_primary_color?: string | null
          pdf_secondary_color?: string | null
          pdf_text_color?: string | null
          phone?: string | null
          primary_color?: string | null
          proforma_counter?: number | null
          receipt_counter?: number | null
          rent_due_day?: number | null
          reservation_deposit_percentage?: number | null
          sale_commission_percentage?: number | null
          sidebar_color?: string | null
          siret?: string | null
          updated_at?: string | null
          user_id?: string | null
          wave_sandbox?: boolean | null
          whatsapp_property_template?: string | null
        }
        Update: {
          accent_color?: string | null
          account_type?: Database["public"]["Enums"]["account_type"] | null
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          geniuspay_public_key?: string | null
          geniuspay_sandbox?: boolean | null
          id?: string | null
          invoice_counter?: number | null
          is_active?: boolean | null
          kkiapay_public_key?: string | null
          kkiapay_sandbox?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          name?: string | null
          notification_email?: string | null
          notification_whatsapp?: string | null
          online_rent_enabled?: boolean | null
          pdf_header_text?: string | null
          pdf_primary_color?: string | null
          pdf_secondary_color?: string | null
          pdf_text_color?: string | null
          phone?: string | null
          primary_color?: string | null
          proforma_counter?: number | null
          receipt_counter?: number | null
          rent_due_day?: number | null
          reservation_deposit_percentage?: number | null
          sale_commission_percentage?: number | null
          sidebar_color?: string | null
          siret?: string | null
          updated_at?: string | null
          user_id?: string | null
          wave_sandbox?: boolean | null
          whatsapp_property_template?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_contract_via_property: {
        Args: { _property_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_owner: {
        Args: { _owner_user_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_parcelle:
        | {
            Args: {
              _assigned_to: string
              _parcelle_user_id: string
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _assigned_to: string
              _beneficiaire_id: string
              _parcelle_user_id: string
              _user_id: string
            }
            Returns: boolean
          }
      can_access_payment_via_tenant: {
        Args: { _tenant_id: string; _user_id: string }
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
      can_gestionnaire_access_bien_achat: {
        Args: { _assigned_to: string; _bien_user_id: string; _user_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_bien_vente: {
        Args: { _assigned_to: string; _bien_user_id: string; _user_id: string }
        Returns: boolean
      }
      can_gestionnaire_access_echeance_achat: {
        Args: { _achat_id: string; _echeance_user_id: string; _user_id: string }
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
      can_view_team_profile: {
        Args: { _target_user_id: string; _viewer_id: string }
        Returns: boolean
      }
      get_agency_member_count: {
        Args: { p_agency_id: string }
        Returns: number
      }
      get_agency_payment_config: {
        Args: { _agency_user_id: string }
        Returns: {
          kkiapay_public_key: string
          online_rent_enabled: boolean
        }[]
      }
      get_agency_tenant_portal_count: {
        Args: { p_agency_id: string }
        Returns: number
      }
      get_next_invoice_number: { Args: { _agency_id: string }; Returns: string }
      get_next_proforma_number: {
        Args: { _agency_id: string }
        Returns: string
      }
      get_next_receipt_number: { Args: { _agency_id: string }; Returns: string }
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
      is_agency_owner: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_owner_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_member_of_owned_agency: {
        Args: { _owner_user_id: string; _target_user_id: string }
        Returns: boolean
      }
      tenant_belongs_to_agency: {
        Args: { _agency_id: string; _portal_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      account_type: "agence" | "proprietaire"
      app_role:
        | "admin"
        | "gestionnaire"
        | "lecture_seule"
        | "super_admin"
        | "locataire"
        | "comptable"
        | "caissiere"
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
      unpaid_action_type:
        | "detection"
        | "email_reminder"
        | "whatsapp_reminder"
        | "sms_reminder"
        | "formal_notice"
        | "legal_transmission"
        | "status_update"
        | "note"
      unpaid_case_status:
        | "detected"
        | "reminded"
        | "formal_notice"
        | "legal_proceedings"
        | "awaiting_judgment"
        | "eviction_validated"
        | "eviction_executed"
        | "eviction_cancelled"
        | "resolved"
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
        "comptable",
        "caissiere",
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
      unpaid_action_type: [
        "detection",
        "email_reminder",
        "whatsapp_reminder",
        "sms_reminder",
        "formal_notice",
        "legal_transmission",
        "status_update",
        "note",
      ],
      unpaid_case_status: [
        "detected",
        "reminded",
        "formal_notice",
        "legal_proceedings",
        "awaiting_judgment",
        "eviction_validated",
        "eviction_executed",
        "eviction_cancelled",
        "resolved",
      ],
    },
  },
} as const
