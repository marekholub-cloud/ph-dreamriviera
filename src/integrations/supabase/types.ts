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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      affiliate_clicks: {
        Row: {
          affiliate_code: string
          clicked_at: string
          id: string
          ip_address: string | null
          page_url: string | null
          referrer_id: string | null
          user_agent: string | null
          was_first_click: boolean | null
        }
        Insert: {
          affiliate_code: string
          clicked_at?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer_id?: string | null
          user_agent?: string | null
          was_first_click?: boolean | null
        }
        Update: {
          affiliate_code?: string
          clicked_at?: string
          id?: string
          ip_address?: string | null
          page_url?: string | null
          referrer_id?: string | null
          user_agent?: string | null
          was_first_click?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      areas: {
        Row: {
          city: string
          country: string
          created_at: string
          description: string | null
          hero_image_url: string | null
          hero_video_url: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          description?: string | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      brochure_requests: {
        Row: {
          assigned_obchodnik_id: string | null
          budget: string | null
          client_id: string | null
          created_at: string | null
          email: string
          id: string
          investment_type: string | null
          lead_id: string | null
          name: string
          phone: string
          request_type: string
          selected_brochures: Json | null
          timeline: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_obchodnik_id?: string | null
          budget?: string | null
          client_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          investment_type?: string | null
          lead_id?: string | null
          name: string
          phone: string
          request_type: string
          selected_brochures?: Json | null
          timeline?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_obchodnik_id?: string | null
          budget?: string | null
          client_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          investment_type?: string | null
          lead_id?: string | null
          name?: string
          phone?: string
          request_type?: string
          selected_brochures?: Json | null
          timeline?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brochure_requests_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brochure_requests_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "brochure_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brochure_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_downloads: {
        Row: {
          brochure_request_id: string
          client_id: string | null
          downloaded_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          brochure_request_id: string
          client_id?: string | null
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          brochure_request_id?: string
          client_id?: string | null
          downloaded_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_downloads_brochure_request_id_fkey"
            columns: ["brochure_request_id"]
            isOneToOne: false
            referencedRelation: "brochure_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_downloads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          branch: string | null
          completed: boolean | null
          created_at: string
          handoff_to_human: boolean | null
          id: string
          investor_data: Json | null
          lead_id: string | null
          messages: Json
          session_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          branch?: string | null
          completed?: boolean | null
          created_at?: string
          handoff_to_human?: boolean | null
          id?: string
          investor_data?: Json | null
          lead_id?: string | null
          messages?: Json
          session_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          branch?: string | null
          completed?: boolean | null
          created_at?: string
          handoff_to_human?: boolean | null
          id?: string
          investor_data?: Json | null
          lead_id?: string | null
          messages?: Json
          session_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          email: string
          financing_preference: string | null
          id: string
          investment_experience: string | null
          investment_horizon: string | null
          lead_id: string | null
          name: string | null
          notes: string | null
          phone: string | null
          preferred_property_types: string[] | null
          risk_tolerance: string | null
          source_lead_id: string | null
          target_markets: string[] | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email: string
          financing_preference?: string | null
          id?: string
          investment_experience?: string | null
          investment_horizon?: string | null
          lead_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_property_types?: string[] | null
          risk_tolerance?: string | null
          source_lead_id?: string | null
          target_markets?: string[] | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string
          financing_preference?: string | null
          id?: string
          investment_experience?: string | null
          investment_horizon?: string | null
          lead_id?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          preferred_property_types?: string[] | null
          risk_tolerance?: string | null
          source_lead_id?: string | null
          target_markets?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_source_lead_id_fkey"
            columns: ["source_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          deal_id: string
          id: string
          paid_at: string | null
          payment_reference: string | null
          percentage: number
          recipient_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id: string
          id?: string
          paid_at?: string | null
          payment_reference?: string | null
          percentage: number
          recipient_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          deal_id?: string
          id?: string
          paid_at?: string | null
          payment_reference?: string | null
          percentage?: number
          recipient_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "commission_payouts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_payouts_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      consultation_bookings: {
        Row: {
          assigned_obchodnik_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          ics_sent: boolean
          id: string
          investor_notes: string | null
          lead_id: string
          notes: string | null
          referrer_id: string | null
          requested_time: string | null
          slot_id: string | null
          status: Database["public"]["Enums"]["consultation_booking_status"]
          updated_at: string
        }
        Insert: {
          assigned_obchodnik_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          ics_sent?: boolean
          id?: string
          investor_notes?: string | null
          lead_id: string
          notes?: string | null
          referrer_id?: string | null
          requested_time?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["consultation_booking_status"]
          updated_at?: string
        }
        Update: {
          assigned_obchodnik_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          ics_sent?: boolean
          id?: string
          investor_notes?: string | null
          lead_id?: string
          notes?: string | null
          referrer_id?: string | null
          requested_time?: string | null
          slot_id?: string | null
          status?: Database["public"]["Enums"]["consultation_booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_bookings_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_bookings_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "consultation_bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_bookings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_bookings_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "consultation_bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "consultation_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      consultation_slots: {
        Row: {
          booked_count: number
          capacity: number
          created_at: string
          end_time: string
          id: string
          is_available: boolean
          notes: string | null
          obchodnik_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          booked_count?: number
          capacity?: number
          created_at?: string
          end_time: string
          id?: string
          is_available?: boolean
          notes?: string | null
          obchodnik_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          booked_count?: number
          capacity?: number
          created_at?: string
          end_time?: string
          id?: string
          is_available?: boolean
          notes?: string | null
          obchodnik_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_slots_obchodnik_id_fkey"
            columns: ["obchodnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultation_slots_obchodnik_id_fkey"
            columns: ["obchodnik_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          affiliate_code: string | null
          assigned_obchodnik_id: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          affiliate_code?: string | null
          assigned_obchodnik_id?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          affiliate_code?: string | null
          assigned_obchodnik_id?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_messages_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      coordinator_assignments: {
        Row: {
          coordinator_id: string
          created_at: string
          id: string
          tipar_id: string
          updated_at: string
        }
        Insert: {
          coordinator_id: string
          created_at?: string
          id?: string
          tipar_id: string
          updated_at?: string
        }
        Update: {
          coordinator_id?: string
          created_at?: string
          id?: string
          tipar_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_assignments_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_assignments_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "coordinator_assignments_tipar_id_fkey"
            columns: ["tipar_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_assignments_tipar_id_fkey"
            columns: ["tipar_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      deals: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          commission_total: number | null
          created_at: string | null
          currency: string | null
          deal_value: number
          id: string
          lead_id: string
          notes: string | null
          property_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          commission_total?: number | null
          created_at?: string | null
          currency?: string | null
          deal_value: number
          id?: string
          lead_id: string
          notes?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          commission_total?: number | null
          created_at?: string | null
          currency?: string | null
          deal_value?: number
          id?: string
          lead_id?: string
          notes?: string | null
          property_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          created_at: string
          description: string | null
          developer_code: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          developer_code?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          developer_code?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          category: Database["public"]["Enums"]["email_template_category"]
          created_at: string
          description: string | null
          event_id: string | null
          html_content: string
          id: string
          is_active: boolean
          name: string
          subject: string
          trigger: Database["public"]["Enums"]["email_template_trigger"]
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category: Database["public"]["Enums"]["email_template_category"]
          created_at?: string
          description?: string | null
          event_id?: string | null
          html_content: string
          id?: string
          is_active?: boolean
          name: string
          subject: string
          trigger: Database["public"]["Enums"]["email_template_trigger"]
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: Database["public"]["Enums"]["email_template_category"]
          created_at?: string
          description?: string | null
          event_id?: string | null
          html_content?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string
          trigger?: Database["public"]["Enums"]["email_template_trigger"]
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attended: boolean | null
          id: string
          lead_id: string
          referrer_id: string | null
          registered_at: string
          slot_id: string
          updated_at: string
        }
        Insert: {
          attended?: boolean | null
          id?: string
          lead_id: string
          referrer_id?: string | null
          registered_at?: string
          slot_id: string
          updated_at?: string
        }
        Update: {
          attended?: boolean | null
          id?: string
          lead_id?: string
          referrer_id?: string | null
          registered_at?: string
          slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "event_registrations_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "event_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      event_slots: {
        Row: {
          capacity: number
          created_at: string
          event_id: string
          id: string
          registered_count: number
          start_time: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          event_id: string
          id?: string
          registered_count?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          event_id?: string
          id?: string
          registered_count?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_slots_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          location_name: string | null
          maps_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location_name?: string | null
          maps_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          location_name?: string | null
          maps_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_questionnaires: {
        Row: {
          additional_notes: string | null
          budget_max: number | null
          budget_min: number | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          experience_level: string | null
          financing_type: string | null
          id: string
          investment_horizon: string | null
          lead_id: string
          preferred_property_types: string[] | null
          priority: string | null
          responses: Json | null
          risk_tolerance: string | null
          target_markets: string[] | null
          version: number
        }
        Insert: {
          additional_notes?: string | null
          budget_max?: number | null
          budget_min?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          experience_level?: string | null
          financing_type?: string | null
          id?: string
          investment_horizon?: string | null
          lead_id: string
          preferred_property_types?: string[] | null
          priority?: string | null
          responses?: Json | null
          risk_tolerance?: string | null
          target_markets?: string[] | null
          version?: number
        }
        Update: {
          additional_notes?: string | null
          budget_max?: number | null
          budget_min?: number | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          experience_level?: string | null
          financing_type?: string | null
          id?: string
          investment_horizon?: string | null
          lead_id?: string
          preferred_property_types?: string[] | null
          priority?: string | null
          responses?: Json | null
          risk_tolerance?: string | null
          target_markets?: string[] | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "investor_questionnaires_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          lead_id: string
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          lead_id: string
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          lead_id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_audit_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_commission_splits: {
        Row: {
          confirmed: boolean | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string | null
          id: string
          lead_id: string
          notes: string | null
          percentage: number
          recipient_id: string
          recipient_type: string
          updated_at: string | null
        }
        Insert: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          percentage: number
          recipient_id: string
          recipient_type: string
          updated_at?: string | null
        }
        Update: {
          confirmed?: boolean | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          percentage?: number
          recipient_id?: string
          recipient_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_commission_splits_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_commission_splits_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "lead_commission_splits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_commission_splits_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_commission_splits_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          lead_id: string
          message: string | null
          metadata: Json | null
          source_page: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          lead_id: string
          message?: string | null
          metadata?: Json | null
          source_page?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          lead_id?: string
          message?: string | null
          metadata?: Json | null
          source_page?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string
          author_role: string
          content: string
          created_at: string
          id: string
          is_internal: boolean
          lead_id: string
          note_type: string
        }
        Insert: {
          author_id: string
          author_role?: string
          content: string
          created_at?: string
          id?: string
          is_internal?: boolean
          lead_id: string
          note_type?: string
        }
        Update: {
          author_id?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          is_internal?: boolean
          lead_id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          affiliate_code: string | null
          assigned_obchodnik_id: string | null
          budget: string | null
          click_history: Json | null
          client_id: string | null
          commission_rate: number | null
          created_at: string
          current_event_id: string | null
          email: string | null
          id: string
          investment_goals: string | null
          investment_timeline: string | null
          lead_level: number | null
          lead_name: string
          lead_number: number
          lead_type: string
          merged_at: string | null
          merged_by: string | null
          merged_into_id: string | null
          notes: string | null
          phone: string | null
          preferred_communication_channel: string | null
          preferred_contact_time: string | null
          property_value: number | null
          questionnaire_completed_independently: boolean | null
          referred_by: string | null
          referrer_id: string | null
          seminar_accepted: boolean | null
          source_event_id: string | null
          source_form: string | null
          status: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          warmth_level: number
          webinar_registered: boolean | null
        }
        Insert: {
          affiliate_code?: string | null
          assigned_obchodnik_id?: string | null
          budget?: string | null
          click_history?: Json | null
          client_id?: string | null
          commission_rate?: number | null
          created_at?: string
          current_event_id?: string | null
          email?: string | null
          id?: string
          investment_goals?: string | null
          investment_timeline?: string | null
          lead_level?: number | null
          lead_name: string
          lead_number?: number
          lead_type?: string
          merged_at?: string | null
          merged_by?: string | null
          merged_into_id?: string | null
          notes?: string | null
          phone?: string | null
          preferred_communication_channel?: string | null
          preferred_contact_time?: string | null
          property_value?: number | null
          questionnaire_completed_independently?: boolean | null
          referred_by?: string | null
          referrer_id?: string | null
          seminar_accepted?: boolean | null
          source_event_id?: string | null
          source_form?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          warmth_level?: number
          webinar_registered?: boolean | null
        }
        Update: {
          affiliate_code?: string | null
          assigned_obchodnik_id?: string | null
          budget?: string | null
          click_history?: Json | null
          client_id?: string | null
          commission_rate?: number | null
          created_at?: string
          current_event_id?: string | null
          email?: string | null
          id?: string
          investment_goals?: string | null
          investment_timeline?: string | null
          lead_level?: number | null
          lead_name?: string
          lead_number?: number
          lead_type?: string
          merged_at?: string | null
          merged_by?: string | null
          merged_into_id?: string | null
          notes?: string | null
          phone?: string | null
          preferred_communication_channel?: string | null
          preferred_contact_time?: string | null
          property_value?: number | null
          questionnaire_completed_independently?: boolean | null
          referred_by?: string | null
          referrer_id?: string | null
          seminar_accepted?: boolean | null
          source_event_id?: string | null
          source_form?: string | null
          status?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          warmth_level?: number
          webinar_registered?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_current_event_id_fkey"
            columns: ["current_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "leads_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "leads_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "leads_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_notifications: {
        Row: {
          id: string
          milestone_type: string
          notified_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          milestone_type: string
          notified_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          milestone_type?: string
          notified_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          is_active: boolean
          name: string | null
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          id: string
          read_at: string
          source_id: string
          source_table: string
          user_id: string
        }
        Insert: {
          id?: string
          read_at?: string
          source_id: string
          source_table: string
          user_id: string
        }
        Update: {
          id?: string
          read_at?: string
          source_id?: string
          source_table?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payment_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          property_id: string | null
          schedule: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          property_id?: string | null
          schedule?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          property_id?: string | null
          schedule?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          affiliate_code: string | null
          assigned_obchodnik_id: string | null
          avatar_url: string | null
          bio: string | null
          closed_deals_count: number | null
          created_at: string
          email: string
          email_verified: boolean | null
          facebook_url: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          is_superhost: boolean
          last_known_affiliate_code: string | null
          lifecycle_status:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          linkedin_url: string | null
          phone: string | null
          phone_verified: boolean | null
          referrer_id: string | null
          role: string
          superhost_evaluated_at: string | null
          total_turnover_aed: number | null
          twitter_url: string | null
          updated_at: string
          verification_pending: boolean | null
          warmth_level: number | null
          website: string | null
        }
        Insert: {
          address?: string | null
          affiliate_code?: string | null
          assigned_obchodnik_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          closed_deals_count?: number | null
          created_at?: string
          email: string
          email_verified?: boolean | null
          facebook_url?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          is_superhost?: boolean
          last_known_affiliate_code?: string | null
          lifecycle_status?:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          linkedin_url?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          referrer_id?: string | null
          role?: string
          superhost_evaluated_at?: string | null
          total_turnover_aed?: number | null
          twitter_url?: string | null
          updated_at?: string
          verification_pending?: boolean | null
          warmth_level?: number | null
          website?: string | null
        }
        Update: {
          address?: string | null
          affiliate_code?: string | null
          assigned_obchodnik_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          closed_deals_count?: number | null
          created_at?: string
          email?: string
          email_verified?: boolean | null
          facebook_url?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          is_superhost?: boolean
          last_known_affiliate_code?: string | null
          lifecycle_status?:
            | Database["public"]["Enums"]["lifecycle_status"]
            | null
          linkedin_url?: string | null
          phone?: string | null
          phone_verified?: boolean | null
          referrer_id?: string | null
          role?: string
          superhost_evaluated_at?: string | null
          total_turnover_aed?: number | null
          twitter_url?: string | null
          updated_at?: string
          verification_pending?: boolean | null
          warmth_level?: number | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_assigned_obchodnik_id_fkey"
            columns: ["assigned_obchodnik_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "rental_host_stats"
            referencedColumns: ["host_id"]
          },
        ]
      }
      properties: {
        Row: {
          amenities: Json | null
          area_id: string | null
          area_sqm: string | null
          avg_dewa_monthly: number | null
          avg_monthly_rent: number | null
          avg_rent_per_night: number | null
          bedrooms: string | null
          brochure_url: string | null
          completion_date: string | null
          created_at: string
          description: string | null
          description_cs: string | null
          description_en: string | null
          description_es: string | null
          developer_id: string | null
          dropbox_folder_url: string | null
          features: Json | null
          hero_image_url: string | null
          hero_video_url: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          payment_plan: string | null
          price_formatted: string | null
          price_from: number | null
          project_code: string | null
          service_charge: number | null
          short_description: string | null
          short_description_cs: string | null
          short_description_en: string | null
          short_description_es: string | null
          slug: string
          status: string
          type: string
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          amenities?: Json | null
          area_id?: string | null
          area_sqm?: string | null
          avg_dewa_monthly?: number | null
          avg_monthly_rent?: number | null
          avg_rent_per_night?: number | null
          bedrooms?: string | null
          brochure_url?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          description_cs?: string | null
          description_en?: string | null
          description_es?: string | null
          developer_id?: string | null
          dropbox_folder_url?: string | null
          features?: Json | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          payment_plan?: string | null
          price_formatted?: string | null
          price_from?: number | null
          project_code?: string | null
          service_charge?: number | null
          short_description?: string | null
          short_description_cs?: string | null
          short_description_en?: string | null
          short_description_es?: string | null
          slug: string
          status?: string
          type?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          amenities?: Json | null
          area_id?: string | null
          area_sqm?: string | null
          avg_dewa_monthly?: number | null
          avg_monthly_rent?: number | null
          avg_rent_per_night?: number | null
          bedrooms?: string | null
          brochure_url?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          description_cs?: string | null
          description_en?: string | null
          description_es?: string | null
          developer_id?: string | null
          dropbox_folder_url?: string | null
          features?: Json | null
          hero_image_url?: string | null
          hero_video_url?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          payment_plan?: string | null
          price_formatted?: string | null
          price_from?: number | null
          project_code?: string | null
          service_charge?: number | null
          short_description?: string | null
          short_description_cs?: string | null
          short_description_en?: string | null
          short_description_es?: string | null
          slug?: string
          status?: string
          type?: string
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          property_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          property_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          property_id?: string
          sort_order?: number | null
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
      property_unit_prices: {
        Row: {
          area_sqm_from: string | null
          area_sqm_to: string | null
          created_at: string
          id: string
          price_formatted: string | null
          price_from: number | null
          property_id: string
          sort_order: number | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          area_sqm_from?: string | null
          area_sqm_to?: string | null
          created_at?: string
          id?: string
          price_formatted?: string | null
          price_from?: number | null
          property_id: string
          sort_order?: number | null
          unit_type: string
          updated_at?: string
        }
        Update: {
          area_sqm_from?: string | null
          area_sqm_to?: string | null
          created_at?: string
          id?: string
          price_formatted?: string | null
          price_from?: number | null
          property_id?: string
          sort_order?: number | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_unit_prices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_units: {
        Row: {
          area_sqm: number | null
          balcony_sqm: number | null
          bathrooms: number | null
          bedrooms: number | null
          building: string | null
          created_at: string
          developer_unit_id: string | null
          external_id: string | null
          floor: number | null
          floor_plan_url: string | null
          floor_plan_urls: Json | null
          furnishing: string | null
          has_burj_khalifa_view: boolean | null
          has_city_view: boolean | null
          has_garden_view: boolean | null
          has_lagoon_view: boolean | null
          has_pool_view: boolean | null
          has_sea_view: boolean | null
          id: string
          illustration_urls: Json | null
          internal_notes: string | null
          notes: string | null
          orientation: string | null
          parking_spots: number | null
          payment_plan_id: string | null
          price_aed: number | null
          price_per_sqm_aed: number | null
          property_id: string
          service_charge_rate: number | null
          status: string | null
          storage_included: boolean | null
          terrace_sqm: number | null
          total_area_sqm: number | null
          unit_number: string | null
          unit_type_price_id: string | null
          updated_at: string
          view_type: string | null
        }
        Insert: {
          area_sqm?: number | null
          balcony_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building?: string | null
          created_at?: string
          developer_unit_id?: string | null
          external_id?: string | null
          floor?: number | null
          floor_plan_url?: string | null
          floor_plan_urls?: Json | null
          furnishing?: string | null
          has_burj_khalifa_view?: boolean | null
          has_city_view?: boolean | null
          has_garden_view?: boolean | null
          has_lagoon_view?: boolean | null
          has_pool_view?: boolean | null
          has_sea_view?: boolean | null
          id?: string
          illustration_urls?: Json | null
          internal_notes?: string | null
          notes?: string | null
          orientation?: string | null
          parking_spots?: number | null
          payment_plan_id?: string | null
          price_aed?: number | null
          price_per_sqm_aed?: number | null
          property_id: string
          service_charge_rate?: number | null
          status?: string | null
          storage_included?: boolean | null
          terrace_sqm?: number | null
          total_area_sqm?: number | null
          unit_number?: string | null
          unit_type_price_id?: string | null
          updated_at?: string
          view_type?: string | null
        }
        Update: {
          area_sqm?: number | null
          balcony_sqm?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          building?: string | null
          created_at?: string
          developer_unit_id?: string | null
          external_id?: string | null
          floor?: number | null
          floor_plan_url?: string | null
          floor_plan_urls?: Json | null
          furnishing?: string | null
          has_burj_khalifa_view?: boolean | null
          has_city_view?: boolean | null
          has_garden_view?: boolean | null
          has_lagoon_view?: boolean | null
          has_pool_view?: boolean | null
          has_sea_view?: boolean | null
          id?: string
          illustration_urls?: Json | null
          internal_notes?: string | null
          notes?: string | null
          orientation?: string | null
          parking_spots?: number | null
          payment_plan_id?: string | null
          price_aed?: number | null
          price_per_sqm_aed?: number | null
          property_id?: string
          service_charge_rate?: number | null
          status?: string | null
          storage_included?: boolean | null
          terrace_sqm?: number | null
          total_area_sqm?: number | null
          unit_number?: string | null
          unit_type_price_id?: string | null
          updated_at?: string
          view_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_units_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_units_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_units_unit_type_price_id_fkey"
            columns: ["unit_type_price_id"]
            isOneToOne: false
            referencedRelation: "property_unit_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_changes: {
        Row: {
          change_reason: string | null
          changed_at: string
          changed_by: string
          field_name: string
          id: string
          new_value: Json | null
          old_value: Json | null
          questionnaire_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string
          changed_by: string
          field_name: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          questionnaire_id: string
        }
        Update: {
          change_reason?: string | null
          changed_at?: string
          changed_by?: string
          field_name?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          questionnaire_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_changes_questionnaire_id_fkey"
            columns: ["questionnaire_id"]
            isOneToOne: false
            referencedRelation: "investor_questionnaires"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_amenities: {
        Row: {
          category: string | null
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      rental_availability: {
        Row: {
          created_at: string
          date: string
          id: string
          min_stay_override: number | null
          notes: string | null
          price_override: number | null
          property_id: string
          reservation_id: string | null
          room_id: string | null
          status: Database["public"]["Enums"]["rental_calendar_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          min_stay_override?: number | null
          notes?: string | null
          price_override?: number | null
          property_id: string
          reservation_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["rental_calendar_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          min_stay_override?: number | null
          notes?: string | null
          price_override?: number | null
          property_id?: string
          reservation_id?: string | null
          room_id?: string | null
          status?: Database["public"]["Enums"]["rental_calendar_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_availability_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_availability_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "rental_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_availability_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rental_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_media: {
        Row: {
          caption: string | null
          created_at: string
          file_type: Database["public"]["Enums"]["rental_media_type"]
          file_url: string
          id: string
          is_cover: boolean
          property_id: string | null
          room_id: string | null
          sort_order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          file_type?: Database["public"]["Enums"]["rental_media_type"]
          file_url: string
          id?: string
          is_cover?: boolean
          property_id?: string | null
          room_id?: string | null
          sort_order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          file_type?: Database["public"]["Enums"]["rental_media_type"]
          file_url?: string
          id?: string
          is_cover?: boolean
          property_id?: string | null
          room_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "rental_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_media_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rental_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_message_threads: {
        Row: {
          created_at: string
          guest_id: string
          guest_unread_count: number
          host_id: string
          host_unread_count: number
          id: string
          last_message_at: string
          property_id: string
          reservation_id: string | null
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          guest_id: string
          guest_unread_count?: number
          host_id: string
          host_unread_count?: number
          id?: string
          last_message_at?: string
          property_id: string
          reservation_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          guest_id?: string
          guest_unread_count?: number
          host_id?: string
          host_unread_count?: number
          id?: string
          last_message_at?: string
          property_id?: string
          reservation_id?: string | null
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_message_threads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_message_threads_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "rental_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_messages: {
        Row: {
          attachment_url: string | null
          body: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
          thread_id: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
          thread_id: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "rental_message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_payouts: {
        Row: {
          created_at: string
          currency: string
          gross_amount: number
          host_id: string
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          payout_method: string | null
          payout_reference: string | null
          property_id: string
          reservation_id: string
          scheduled_at: string | null
          service_fee: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gross_amount?: number
          host_id: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          property_id: string
          reservation_id: string
          scheduled_at?: string | null
          service_fee?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          gross_amount?: number
          host_id?: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          payout_method?: string | null
          payout_reference?: string | null
          property_id?: string
          reservation_id?: string
          scheduled_at?: string | null
          service_fee?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_payouts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_payouts_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "rental_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_pricing_rules: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["rental_pricing_adjustment_type"]
          adjustment_value: number
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          max_nights: number | null
          min_nights: number | null
          name: string
          notes: string | null
          priority: number
          property_id: string
          room_id: string | null
          rule_type: Database["public"]["Enums"]["rental_pricing_rule_type"]
          start_date: string | null
          updated_at: string
          weekdays: number[] | null
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["rental_pricing_adjustment_type"]
          adjustment_value: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_nights?: number | null
          min_nights?: number | null
          name: string
          notes?: string | null
          priority?: number
          property_id: string
          room_id?: string | null
          rule_type: Database["public"]["Enums"]["rental_pricing_rule_type"]
          start_date?: string | null
          updated_at?: string
          weekdays?: number[] | null
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["rental_pricing_adjustment_type"]
          adjustment_value?: number
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          max_nights?: number | null
          min_nights?: number | null
          name?: string
          notes?: string | null
          priority?: number
          property_id?: string
          room_id?: string | null
          rule_type?: Database["public"]["Enums"]["rental_pricing_rule_type"]
          start_date?: string | null
          updated_at?: string
          weekdays?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_pricing_rules_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_pricing_rules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rental_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_properties: {
        Row: {
          address: string | null
          average_rating: number | null
          base_currency: string
          bathrooms: number
          bedrooms: number
          beds: number
          calendar_conflict_mode: Database["public"]["Enums"]["rental_calendar_conflict_mode"]
          cancellation_policy: Database["public"]["Enums"]["rental_cancellation_policy"]
          check_in_time: string | null
          check_out_time: string | null
          children_allowed: boolean
          city: string | null
          cleaning_fee: number
          country: string
          created_at: string
          description: string | null
          district: string | null
          furnished: boolean
          geo_lat: number | null
          geo_lng: number | null
          house_rules: string | null
          id: string
          instant_book_enabled: boolean
          is_featured: boolean
          latitude: number | null
          longitude: number | null
          max_guests: number
          maximum_stay: number | null
          minimum_stay: number
          owner_id: string
          pets_allowed: boolean
          price_per_month: number | null
          price_per_night: number | null
          property_manager_id: string | null
          property_type: Database["public"]["Enums"]["rental_property_type"]
          published_at: string | null
          rental_mode: Database["public"]["Enums"]["rental_mode"]
          reviews_count: number
          security_deposit: number
          service_fee_pct: number
          slug: string
          smoking_allowed: boolean
          square_meters: number | null
          status: Database["public"]["Enums"]["rental_property_status"]
          title: string
          updated_at: string
          weekend_price: number | null
        }
        Insert: {
          address?: string | null
          average_rating?: number | null
          base_currency?: string
          bathrooms?: number
          bedrooms?: number
          beds?: number
          calendar_conflict_mode?: Database["public"]["Enums"]["rental_calendar_conflict_mode"]
          cancellation_policy?: Database["public"]["Enums"]["rental_cancellation_policy"]
          check_in_time?: string | null
          check_out_time?: string | null
          children_allowed?: boolean
          city?: string | null
          cleaning_fee?: number
          country?: string
          created_at?: string
          description?: string | null
          district?: string | null
          furnished?: boolean
          geo_lat?: number | null
          geo_lng?: number | null
          house_rules?: string | null
          id?: string
          instant_book_enabled?: boolean
          is_featured?: boolean
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          maximum_stay?: number | null
          minimum_stay?: number
          owner_id: string
          pets_allowed?: boolean
          price_per_month?: number | null
          price_per_night?: number | null
          property_manager_id?: string | null
          property_type?: Database["public"]["Enums"]["rental_property_type"]
          published_at?: string | null
          rental_mode?: Database["public"]["Enums"]["rental_mode"]
          reviews_count?: number
          security_deposit?: number
          service_fee_pct?: number
          slug: string
          smoking_allowed?: boolean
          square_meters?: number | null
          status?: Database["public"]["Enums"]["rental_property_status"]
          title: string
          updated_at?: string
          weekend_price?: number | null
        }
        Update: {
          address?: string | null
          average_rating?: number | null
          base_currency?: string
          bathrooms?: number
          bedrooms?: number
          beds?: number
          calendar_conflict_mode?: Database["public"]["Enums"]["rental_calendar_conflict_mode"]
          cancellation_policy?: Database["public"]["Enums"]["rental_cancellation_policy"]
          check_in_time?: string | null
          check_out_time?: string | null
          children_allowed?: boolean
          city?: string | null
          cleaning_fee?: number
          country?: string
          created_at?: string
          description?: string | null
          district?: string | null
          furnished?: boolean
          geo_lat?: number | null
          geo_lng?: number | null
          house_rules?: string | null
          id?: string
          instant_book_enabled?: boolean
          is_featured?: boolean
          latitude?: number | null
          longitude?: number | null
          max_guests?: number
          maximum_stay?: number | null
          minimum_stay?: number
          owner_id?: string
          pets_allowed?: boolean
          price_per_month?: number | null
          price_per_night?: number | null
          property_manager_id?: string | null
          property_type?: Database["public"]["Enums"]["rental_property_type"]
          published_at?: string | null
          rental_mode?: Database["public"]["Enums"]["rental_mode"]
          reviews_count?: number
          security_deposit?: number
          service_fee_pct?: number
          slug?: string
          smoking_allowed?: boolean
          square_meters?: number | null
          status?: Database["public"]["Enums"]["rental_property_status"]
          title?: string
          updated_at?: string
          weekend_price?: number | null
        }
        Relationships: []
      }
      rental_property_amenities: {
        Row: {
          amenity_id: string
          property_id: string
        }
        Insert: {
          amenity_id: string
          property_id: string
        }
        Update: {
          amenity_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_property_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "rental_amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_property_amenities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_reservations: {
        Row: {
          adults: number
          booking_status: Database["public"]["Enums"]["rental_reservation_status"]
          booking_type: Database["public"]["Enums"]["rental_booking_type"]
          cancellation_policy_snapshot:
            | Database["public"]["Enums"]["rental_cancellation_policy"]
            | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          check_in_date: string
          check_out_date: string
          children: number
          cleaning_fee: number
          created_at: string
          currency: string
          deposit_amount: number
          discount_amount: number
          guest_id: string
          guests_count: number
          host_id: string
          id: string
          infants: number
          nights: number
          payment_status: Database["public"]["Enums"]["rental_payment_status"]
          payout_amount: number | null
          pets: number
          price_base: number
          property_id: string
          refund_amount: number | null
          reservation_code: string
          room_id: string | null
          service_fee: number
          special_requests: string | null
          taxes: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          adults?: number
          booking_status?: Database["public"]["Enums"]["rental_reservation_status"]
          booking_type?: Database["public"]["Enums"]["rental_booking_type"]
          cancellation_policy_snapshot?:
            | Database["public"]["Enums"]["rental_cancellation_policy"]
            | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in_date: string
          check_out_date: string
          children?: number
          cleaning_fee?: number
          created_at?: string
          currency?: string
          deposit_amount?: number
          discount_amount?: number
          guest_id: string
          guests_count?: number
          host_id: string
          id?: string
          infants?: number
          nights: number
          payment_status?: Database["public"]["Enums"]["rental_payment_status"]
          payout_amount?: number | null
          pets?: number
          price_base?: number
          property_id: string
          refund_amount?: number | null
          reservation_code?: string
          room_id?: string | null
          service_fee?: number
          special_requests?: string | null
          taxes?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          adults?: number
          booking_status?: Database["public"]["Enums"]["rental_reservation_status"]
          booking_type?: Database["public"]["Enums"]["rental_booking_type"]
          cancellation_policy_snapshot?:
            | Database["public"]["Enums"]["rental_cancellation_policy"]
            | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          check_in_date?: string
          check_out_date?: string
          children?: number
          cleaning_fee?: number
          created_at?: string
          currency?: string
          deposit_amount?: number
          discount_amount?: number
          guest_id?: string
          guests_count?: number
          host_id?: string
          id?: string
          infants?: number
          nights?: number
          payment_status?: Database["public"]["Enums"]["rental_payment_status"]
          payout_amount?: number | null
          pets?: number
          price_base?: number
          property_id?: string
          refund_amount?: number | null
          reservation_code?: string
          room_id?: string | null
          service_fee?: number
          special_requests?: string | null
          taxes?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_reservations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rental_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_reviews: {
        Row: {
          accuracy_rating: number | null
          checkin_rating: number | null
          cleanliness_rating: number | null
          communication_rating: number | null
          created_at: string
          guest_id: string
          host_id: string
          id: string
          is_published: boolean
          location_rating: number | null
          overall_rating: number
          private_feedback: string | null
          property_id: string
          public_comment: string | null
          reservation_id: string
          room_id: string | null
          value_rating: number | null
        }
        Insert: {
          accuracy_rating?: number | null
          checkin_rating?: number | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          created_at?: string
          guest_id: string
          host_id: string
          id?: string
          is_published?: boolean
          location_rating?: number | null
          overall_rating: number
          private_feedback?: string | null
          property_id: string
          public_comment?: string | null
          reservation_id: string
          room_id?: string | null
          value_rating?: number | null
        }
        Update: {
          accuracy_rating?: number | null
          checkin_rating?: number | null
          cleanliness_rating?: number | null
          communication_rating?: number | null
          created_at?: string
          guest_id?: string
          host_id?: string
          id?: string
          is_published?: boolean
          location_rating?: number | null
          overall_rating?: number
          private_feedback?: string | null
          property_id?: string
          public_comment?: string | null
          reservation_id?: string
          room_id?: string | null
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "rental_reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_reviews_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rental_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_rooms: {
        Row: {
          beds: number
          created_at: string
          description: string | null
          has_private_bathroom: boolean
          id: string
          max_guests: number
          name: string
          price_per_month: number | null
          price_per_night: number | null
          property_id: string
          room_type: Database["public"]["Enums"]["rental_room_type"]
          sort_order: number
          status: Database["public"]["Enums"]["rental_property_status"]
          updated_at: string
        }
        Insert: {
          beds?: number
          created_at?: string
          description?: string | null
          has_private_bathroom?: boolean
          id?: string
          max_guests?: number
          name: string
          price_per_month?: number | null
          price_per_night?: number | null
          property_id: string
          room_type?: Database["public"]["Enums"]["rental_room_type"]
          sort_order?: number
          status?: Database["public"]["Enums"]["rental_property_status"]
          updated_at?: string
        }
        Update: {
          beds?: number
          created_at?: string
          description?: string | null
          has_private_bathroom?: boolean
          id?: string
          max_guests?: number
          name?: string
          price_per_month?: number | null
          price_per_night?: number | null
          property_id?: string
          room_type?: Database["public"]["Enums"]["rental_room_type"]
          sort_order?: number
          status?: Database["public"]["Enums"]["rental_property_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_rooms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          guest_id: string
          host_id: string
          id: string
          notes: string | null
          occurred_at: string
          payment_method: string | null
          property_id: string
          reference: string | null
          reservation_id: string
          status: Database["public"]["Enums"]["rental_transaction_status"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          type: Database["public"]["Enums"]["rental_transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          guest_id: string
          host_id: string
          id?: string
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          property_id: string
          reference?: string | null
          reservation_id: string
          status?: Database["public"]["Enums"]["rental_transaction_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          type: Database["public"]["Enums"]["rental_transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          guest_id?: string
          host_id?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          payment_method?: string | null
          property_id?: string
          reference?: string | null
          reservation_id?: string
          status?: Database["public"]["Enums"]["rental_transaction_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          type?: Database["public"]["Enums"]["rental_transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "rental_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_transactions_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "rental_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_types: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      lead_notes_with_author: {
        Row: {
          author_email: string | null
          author_id: string | null
          author_name: string | null
          author_role: string | null
          content: string | null
          created_at: string | null
          id: string | null
          is_internal: boolean | null
          lead_id: string | null
          note_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_host_stats: {
        Row: {
          avg_rating: number | null
          cancellation_rate_pct: number | null
          email: string | null
          full_name: string | null
          host_id: string | null
          is_superhost: boolean | null
          properties_count: number | null
          reservations_cancelled: number | null
          reservations_completed: number | null
          reservations_total: number | null
          response_rate_pct: number | null
          reviews_count: number | null
          superhost_evaluated_at: string | null
          threads_responded: number | null
          threads_total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_rental_property: {
        Args: { _property_id: string }
        Returns: boolean
      }
      cleanup_old_notification_reads: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      evaluate_all_superhosts: { Args: never; Returns: number }
      evaluate_superhost_status: {
        Args: { p_host_id: string }
        Returns: boolean
      }
      exec_admin_sql: { Args: { p_sql: string }; Returns: undefined }
      generate_affiliate_code: { Args: never; Returns: string }
      get_my_assigned_obchodnik: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_leads: {
        Args: {
          p_merged_by: string
          p_source_lead_id: string
          p_target_lead_id: string
        }
        Returns: undefined
      }
      rental_reservation_balance: {
        Args: { p_reservation_id: string }
        Returns: {
          net: number
          outstanding: number
          paid: number
          refunded: number
          total: number
        }[]
      }
      write_audit_log: {
        Args: {
          p_action: string
          p_changed_fields?: string[]
          p_entity_id: string
          p_entity_type: string
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "obchodnik"
        | "tipar"
        | "senior_obchodnik"
        | "influencer_coordinator"
        | "host"
        | "guest"
      consultation_booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      email_template_category: "system" | "team" | "customer"
      email_template_trigger:
        | "password_reset"
        | "email_confirmation"
        | "welcome_email"
        | "event_registration_customer"
        | "event_registration_tipar"
        | "event_registration_obchodnik"
        | "event_reminder_customer"
        | "event_cancelled"
        | "lead_status_change"
        | "lead_level_upgrade"
        | "milestone_reached"
        | "new_contact_message"
        | "brochure_request"
        | "catalog_download"
      lifecycle_status:
        | "visitor"
        | "lead"
        | "qualified"
        | "client"
        | "premium"
        | "vip"
      notification_type:
        | "lead_created"
        | "lead_assigned"
        | "lead_status_changed"
        | "lead_converted"
        | "commission_confirmed"
        | "team_summary"
        | "system_alert"
        | "consultation_booked"
        | "consultation_confirmed"
        | "consultation_cancelled"
        | "consultation_reminder"
      rental_booking_type: "entire_property" | "room"
      rental_calendar_conflict_mode:
        | "strict_exclusive"
        | "flexible_partial"
        | "entire_property_priority"
      rental_calendar_status: "available" | "blocked" | "booked" | "pending"
      rental_cancellation_policy:
        | "flexible"
        | "moderate"
        | "strict"
        | "non_refundable"
      rental_media_type: "image" | "video"
      rental_mode: "entire_property" | "rooms_only" | "hybrid"
      rental_payment_status:
        | "unpaid"
        | "partially_paid"
        | "paid"
        | "refunded"
        | "partially_refunded"
        | "failed"
      rental_pricing_adjustment_type:
        | "percentage"
        | "fixed_amount"
        | "override_price"
      rental_pricing_rule_type: "seasonal" | "weekend" | "length_of_stay"
      rental_property_status:
        | "draft"
        | "pending_approval"
        | "active"
        | "paused"
        | "blocked"
        | "archived"
        | "approved"
      rental_property_type:
        | "apartment"
        | "villa"
        | "studio"
        | "house"
        | "townhouse"
        | "cabin"
        | "other"
      rental_reservation_status:
        | "inquiry"
        | "pending"
        | "awaiting_payment"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled_by_guest"
        | "cancelled_by_host"
        | "no_show"
        | "completed"
        | "refunded"
      rental_room_type: "private_room" | "shared_room" | "master_bedroom"
      rental_transaction_status:
        | "pending"
        | "completed"
        | "failed"
        | "refunded"
        | "voided"
      rental_transaction_type:
        | "deposit"
        | "balance"
        | "full_payment"
        | "refund"
        | "security_deposit"
        | "security_deposit_refund"
        | "discount"
        | "extra_fee"
        | "cleaning_fee"
        | "cancellation_fee"
        | "adjustment"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "obchodnik",
        "tipar",
        "senior_obchodnik",
        "influencer_coordinator",
        "host",
        "guest",
      ],
      consultation_booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      email_template_category: ["system", "team", "customer"],
      email_template_trigger: [
        "password_reset",
        "email_confirmation",
        "welcome_email",
        "event_registration_customer",
        "event_registration_tipar",
        "event_registration_obchodnik",
        "event_reminder_customer",
        "event_cancelled",
        "lead_status_change",
        "lead_level_upgrade",
        "milestone_reached",
        "new_contact_message",
        "brochure_request",
        "catalog_download",
      ],
      lifecycle_status: [
        "visitor",
        "lead",
        "qualified",
        "client",
        "premium",
        "vip",
      ],
      notification_type: [
        "lead_created",
        "lead_assigned",
        "lead_status_changed",
        "lead_converted",
        "commission_confirmed",
        "team_summary",
        "system_alert",
        "consultation_booked",
        "consultation_confirmed",
        "consultation_cancelled",
        "consultation_reminder",
      ],
      rental_booking_type: ["entire_property", "room"],
      rental_calendar_conflict_mode: [
        "strict_exclusive",
        "flexible_partial",
        "entire_property_priority",
      ],
      rental_calendar_status: ["available", "blocked", "booked", "pending"],
      rental_cancellation_policy: [
        "flexible",
        "moderate",
        "strict",
        "non_refundable",
      ],
      rental_media_type: ["image", "video"],
      rental_mode: ["entire_property", "rooms_only", "hybrid"],
      rental_payment_status: [
        "unpaid",
        "partially_paid",
        "paid",
        "refunded",
        "partially_refunded",
        "failed",
      ],
      rental_pricing_adjustment_type: [
        "percentage",
        "fixed_amount",
        "override_price",
      ],
      rental_pricing_rule_type: ["seasonal", "weekend", "length_of_stay"],
      rental_property_status: [
        "draft",
        "pending_approval",
        "active",
        "paused",
        "blocked",
        "archived",
        "approved",
      ],
      rental_property_type: [
        "apartment",
        "villa",
        "studio",
        "house",
        "townhouse",
        "cabin",
        "other",
      ],
      rental_reservation_status: [
        "inquiry",
        "pending",
        "awaiting_payment",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled_by_guest",
        "cancelled_by_host",
        "no_show",
        "completed",
        "refunded",
      ],
      rental_room_type: ["private_room", "shared_room", "master_bedroom"],
      rental_transaction_status: [
        "pending",
        "completed",
        "failed",
        "refunded",
        "voided",
      ],
      rental_transaction_type: [
        "deposit",
        "balance",
        "full_payment",
        "refund",
        "security_deposit",
        "security_deposit_refund",
        "discount",
        "extra_fee",
        "cleaning_fee",
        "cancellation_fee",
        "adjustment",
      ],
    },
  },
} as const
