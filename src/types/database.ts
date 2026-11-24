export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      account_deletion_log: {
        Row: {
          anonymized_ref: string;
          deleted_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          anonymized_ref: string;
          deleted_at?: string;
          id?: string;
        };
        Update: {
          anonymized_ref?: string;
          deleted_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      appliances: {
        Row: {
          archived_at: string | null;
          brand: string | null;
          category: Database["public"]["Enums"]["appliance_category"];
          created_at: string;
          home_id: string;
          id: string;
          model: string | null;
          name: string;
          notes: string | null;
          purchase_date: string | null;
          room_id: string | null;
          serial_number: string | null;
          updated_at: string;
          warranty_until: string | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          brand?: string | null;
          category?: Database["public"]["Enums"]["appliance_category"];
          created_at?: string;
          home_id: string;
          id?: string;
          model?: string | null;
          name: string;
          notes?: string | null;
          purchase_date?: string | null;
          room_id?: string | null;
          serial_number?: string | null;
          updated_at?: string;
          warranty_until?: string | null;
        };
        Update: {
          archived_at?: string | null;
          brand?: string | null;
          category?: Database["public"]["Enums"]["appliance_category"];
          created_at?: string;
          home_id?: string;
          id?: string;
          model?: string | null;
          name?: string;
          notes?: string | null;
          purchase_date?: string | null;
          room_id?: string | null;
          serial_number?: string | null;
          updated_at?: string;
          warranty_until?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "appliances_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appliances_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      attachments: {
        Row: {
          appliance_id: string | null;
          created_at: string;
          file_name: string;
          file_path: string;
          home_id: string;
          id: string;
          issue_id: string | null;
          kind: Database["public"]["Enums"]["attachment_kind"];
          maintenance_id: string | null;
          mime_type: string;
          size_bytes: number;
          updated_at: string;
          uploaded_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          appliance_id?: string | null;
          created_at?: string;
          file_name: string;
          file_path: string;
          home_id: string;
          id?: string;
          issue_id?: string | null;
          kind: Database["public"]["Enums"]["attachment_kind"];
          maintenance_id?: string | null;
          mime_type: string;
          size_bytes: number;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Update: {
          appliance_id?: string | null;
          created_at?: string;
          file_name?: string;
          file_path?: string;
          home_id?: string;
          id?: string;
          issue_id?: string | null;
          kind?: Database["public"]["Enums"]["attachment_kind"];
          maintenance_id?: string | null;
          mime_type?: string;
          size_bytes?: number;
          updated_at?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attachments_appliance_id_fkey";
            columns: ["appliance_id"];
            isOneToOne: false;
            referencedRelation: "appliances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "home_issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_maintenance_id_fkey";
            columns: ["maintenance_id"];
            isOneToOne: false;
            referencedRelation: "maintenance_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          end_date: string | null;
          end_time: string | null;
          event_type: Database["public"]["Enums"]["event_type"];
          home_id: string;
          id: string;
          start_date: string;
          start_time: string | null;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"];
          home_id: string;
          id?: string;
          start_date: string;
          start_time?: string | null;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          event_type?: Database["public"]["Enums"]["event_type"];
          home_id?: string;
          id?: string;
          start_date?: string;
          start_time?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      home_invites: {
        Row: {
          created_at: string;
          expires_at: string;
          home_id: string;
          id: string;
          invited_by: string;
          invited_email: string;
          role: Database["public"]["Enums"]["home_role"];
          status: Database["public"]["Enums"]["invite_status"];
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires_at?: string;
          home_id: string;
          id?: string;
          invited_by: string;
          invited_email: string;
          role?: Database["public"]["Enums"]["home_role"];
          status?: Database["public"]["Enums"]["invite_status"];
          token?: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          home_id?: string;
          id?: string;
          invited_by?: string;
          invited_email?: string;
          role?: Database["public"]["Enums"]["home_role"];
          status?: Database["public"]["Enums"]["invite_status"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_invites_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      home_issues: {
        Row: {
          appliance_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          home_id: string;
          id: string;
          notify_landlord: boolean;
          reported_at: string;
          resolved_at: string | null;
          room_id: string | null;
          status: Database["public"]["Enums"]["issue_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          appliance_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          home_id: string;
          id?: string;
          notify_landlord?: boolean;
          reported_at?: string;
          resolved_at?: string | null;
          room_id?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          appliance_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          home_id?: string;
          id?: string;
          notify_landlord?: boolean;
          reported_at?: string;
          resolved_at?: string | null;
          room_id?: string | null;
          status?: Database["public"]["Enums"]["issue_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_issues_appliance_id_fkey";
            columns: ["appliance_id"];
            isOneToOne: false;
            referencedRelation: "appliances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "home_issues_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "home_issues_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "home_issues_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      home_member_permissions: {
        Row: {
          can_complete_tasks: boolean;
          can_manage_events: boolean;
          can_manage_shopping: boolean;
          can_manage_tasks: boolean;
          can_purchase_shopping: boolean;
          home_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          can_complete_tasks?: boolean;
          can_manage_events?: boolean;
          can_manage_shopping?: boolean;
          can_manage_tasks?: boolean;
          can_purchase_shopping?: boolean;
          home_id: string;
          user_id: string;
        };
        Update: {
          can_complete_tasks?: boolean;
          can_manage_events?: boolean;
          can_manage_shopping?: boolean;
          can_manage_tasks?: boolean;
          can_purchase_shopping?: boolean;
          home_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_member_permissions_home_id_user_id_fkey";
            columns: ["home_id", "user_id"];
            isOneToOne: true;
            referencedRelation: "home_members";
            referencedColumns: ["home_id", "user_id"];
          },
        ];
      };
      home_member_shopping_scopes: {
        Row: {
          category: Database["public"]["Enums"]["shopping_category"];
          home_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          category: Database["public"]["Enums"]["shopping_category"];
          home_id: string;
          user_id: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["shopping_category"];
          home_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_member_shopping_scopes_home_id_user_id_fkey";
            columns: ["home_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "home_members";
            referencedColumns: ["home_id", "user_id"];
          },
        ];
      };
      home_member_task_scopes: {
        Row: {
          home_id: string;
          room_id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          home_id: string;
          room_id: string;
          user_id: string;
        };
        Update: {
          home_id?: string;
          room_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_member_task_scopes_home_id_user_id_fkey";
            columns: ["home_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "home_members";
            referencedColumns: ["home_id", "user_id"];
          },
          {
            foreignKeyName: "home_member_task_scopes_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      home_members: {
        Row: {
          absence_end: string | null;
          absence_start: string | null;
          created_at: string;
          home_id: string;
          id: string;
          role: Database["public"]["Enums"]["home_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          absence_end?: string | null;
          absence_start?: string | null;
          created_at?: string;
          home_id: string;
          id?: string;
          role?: Database["public"]["Enums"]["home_role"];
          user_id: string;
        };
        Update: {
          absence_end?: string | null;
          absence_start?: string | null;
          created_at?: string;
          home_id?: string;
          id?: string;
          role?: Database["public"]["Enums"]["home_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "home_members_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "home_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      homes: {
        Row: {
          created_at: string;
          created_by: string | null;
          household_type: Database["public"]["Enums"]["household_type"] | null;
          id: string;
          maintenance_ran_at: string | null;
          name: string;
          ownership_type: Database["public"]["Enums"]["ownership_type"] | null;
          property_type: Database["public"]["Enums"]["property_type"] | null;
          resident_count: number | null;
          routine_level: Database["public"]["Enums"]["routine_level"] | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          household_type?: Database["public"]["Enums"]["household_type"] | null;
          id?: string;
          maintenance_ran_at?: string | null;
          name: string;
          ownership_type?: Database["public"]["Enums"]["ownership_type"] | null;
          property_type?: Database["public"]["Enums"]["property_type"] | null;
          resident_count?: number | null;
          routine_level?: Database["public"]["Enums"]["routine_level"] | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          household_type?: Database["public"]["Enums"]["household_type"] | null;
          id?: string;
          maintenance_ran_at?: string | null;
          name?: string;
          ownership_type?: Database["public"]["Enums"]["ownership_type"] | null;
          property_type?: Database["public"]["Enums"]["property_type"] | null;
          resident_count?: number | null;
          routine_level?: Database["public"]["Enums"]["routine_level"] | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "homes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      issue_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          event_type: Database["public"]["Enums"]["issue_event_type"];
          from_status: Database["public"]["Enums"]["issue_status"] | null;
          home_id: string;
          id: string;
          issue_id: string;
          note: string | null;
          to_status: Database["public"]["Enums"]["issue_status"] | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          event_type: Database["public"]["Enums"]["issue_event_type"];
          from_status?: Database["public"]["Enums"]["issue_status"] | null;
          home_id: string;
          id?: string;
          issue_id: string;
          note?: string | null;
          to_status?: Database["public"]["Enums"]["issue_status"] | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          event_type?: Database["public"]["Enums"]["issue_event_type"];
          from_status?: Database["public"]["Enums"]["issue_status"] | null;
          home_id?: string;
          id?: string;
          issue_id?: string;
          note?: string | null;
          to_status?: Database["public"]["Enums"]["issue_status"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "issue_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_events_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "issue_events_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "home_issues";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_items: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          home_id: string;
          id: string;
          notes: string | null;
          resolved_at: string | null;
          room_id: string | null;
          status: Database["public"]["Enums"]["maintenance_item_status"];
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          home_id: string;
          id?: string;
          notes?: string | null;
          resolved_at?: string | null;
          room_id?: string | null;
          status?: Database["public"]["Enums"]["maintenance_item_status"];
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          home_id?: string;
          id?: string;
          notes?: string | null;
          resolved_at?: string | null;
          room_id?: string | null;
          status?: Database["public"]["Enums"]["maintenance_item_status"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_items_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_items_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      maintenance_records: {
        Row: {
          appliance_id: string | null;
          completed_at: string | null;
          cost_cents: number | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          home_id: string;
          id: string;
          issue_id: string | null;
          notes: string | null;
          provider_name: string | null;
          room_id: string | null;
          scheduled_for: string | null;
          status: Database["public"]["Enums"]["maintenance_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          appliance_id?: string | null;
          completed_at?: string | null;
          cost_cents?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          home_id: string;
          id?: string;
          issue_id?: string | null;
          notes?: string | null;
          provider_name?: string | null;
          room_id?: string | null;
          scheduled_for?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          appliance_id?: string | null;
          completed_at?: string | null;
          cost_cents?: number | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          home_id?: string;
          id?: string;
          issue_id?: string | null;
          notes?: string | null;
          provider_name?: string | null;
          room_id?: string | null;
          scheduled_for?: string | null;
          status?: Database["public"]["Enums"]["maintenance_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_records_appliance_id_fkey";
            columns: ["appliance_id"];
            isOneToOne: false;
            referencedRelation: "appliances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_issue_id_fkey";
            columns: ["issue_id"];
            isOneToOne: false;
            referencedRelation: "home_issues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "maintenance_records_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      occurrence_checklist_states: {
        Row: {
          home_id: string;
          item_id: string;
          occurrence_id: string;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          home_id: string;
          item_id: string;
          occurrence_id: string;
          status: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          home_id?: string;
          item_id?: string;
          occurrence_id?: string;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "occurrence_checklist_states_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "occurrence_checklist_states_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "task_checklist_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "occurrence_checklist_states_occurrence_id_fkey";
            columns: ["occurrence_id"];
            isOneToOne: false;
            referencedRelation: "task_occurrences";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "occurrence_checklist_states_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pets: {
        Row: {
          created_at: string;
          created_by: string | null;
          home_id: string;
          id: string;
          name: string;
          notes: string | null;
          species: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          home_id: string;
          id?: string;
          name: string;
          notes?: string | null;
          species?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          home_id?: string;
          id?: string;
          name?: string;
          notes?: string | null;
          species?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pets_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pets_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      pro_interest: {
        Row: {
          created_at: string;
          id: string;
          price_option: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          price_option: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          price_option?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pro_interest_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      product_events: {
        Row: {
          created_at: string;
          event_name: string;
          home_id: string | null;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          event_name: string;
          home_id?: string | null;
          id?: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          event_name?: string;
          home_id?: string | null;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_events_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_home_id: string | null;
          full_name: string | null;
          id: string;
          last_seen_at: string | null;
          marketing_opt_in: boolean;
          onboarding_completed: boolean;
          onboarding_step: number;
          terms_accepted_at: string | null;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_home_id?: string | null;
          full_name?: string | null;
          id: string;
          last_seen_at?: string | null;
          marketing_opt_in?: boolean;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          terms_accepted_at?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_home_id?: string | null;
          full_name?: string | null;
          id?: string;
          last_seen_at?: string | null;
          marketing_opt_in?: boolean;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          terms_accepted_at?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_current_home_id_fkey";
            columns: ["current_home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          last_used_at: string | null;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          last_used_at?: string | null;
          p256dh: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          last_used_at?: string | null;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          created_at: string;
          home_id: string;
          id: string;
          name: string;
          position: number;
          room_type: Database["public"]["Enums"]["room_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          home_id: string;
          id?: string;
          name: string;
          position?: number;
          room_type?: Database["public"]["Enums"]["room_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          home_id?: string;
          id?: string;
          name?: string;
          position?: number;
          room_type?: Database["public"]["Enums"]["room_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rooms_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      routines: {
        Row: {
          created_at: string;
          end_date: string | null;
          frequency_type: Database["public"]["Enums"]["frequency_type"];
          generated_until: string | null;
          home_id: string;
          id: string;
          interval_unit: Database["public"]["Enums"]["interval_unit"] | null;
          interval_value: number;
          is_active: boolean;
          month_day: number | null;
          start_date: string;
          task_id: string;
          ungenerated_count: number;
          updated_at: string;
          weekdays: number[];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          end_date?: string | null;
          frequency_type: Database["public"]["Enums"]["frequency_type"];
          generated_until?: string | null;
          home_id: string;
          id?: string;
          interval_unit?: Database["public"]["Enums"]["interval_unit"] | null;
          interval_value?: number;
          is_active?: boolean;
          month_day?: number | null;
          start_date: string;
          task_id: string;
          ungenerated_count?: number;
          updated_at?: string;
          weekdays?: number[];
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          frequency_type?: Database["public"]["Enums"]["frequency_type"];
          generated_until?: string | null;
          home_id?: string;
          id?: string;
          interval_unit?: Database["public"]["Enums"]["interval_unit"] | null;
          interval_value?: number;
          is_active?: boolean;
          month_day?: number | null;
          start_date?: string;
          task_id?: string;
          ungenerated_count?: number;
          updated_at?: string;
          weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "routines_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "routines_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: true;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_categories: {
        Row: {
          created_at: string;
          default_slug: string | null;
          home_id: string;
          icon: string;
          id: string;
          name: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          default_slug?: string | null;
          home_id: string;
          icon?: string;
          id?: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          default_slug?: string | null;
          home_id?: string;
          icon?: string;
          id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_categories_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_items: {
        Row: {
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          event_id: string | null;
          home_id: string;
          id: string;
          is_purchased: boolean;
          mission: string | null;
          name: string;
          notes: string | null;
          priority: string;
          purchased_at: string | null;
          purchased_by: string | null;
          quantity: number;
          room_id: string | null;
          unit: Database["public"]["Enums"]["shopping_unit"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          home_id: string;
          id?: string;
          is_purchased?: boolean;
          mission?: string | null;
          name: string;
          notes?: string | null;
          priority?: string;
          purchased_at?: string | null;
          purchased_by?: string | null;
          quantity?: number;
          room_id?: string | null;
          unit?: Database["public"]["Enums"]["shopping_unit"];
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          event_id?: string | null;
          home_id?: string;
          id?: string;
          is_purchased?: boolean;
          mission?: string | null;
          name?: string;
          notes?: string | null;
          priority?: string;
          purchased_at?: string | null;
          purchased_by?: string | null;
          quantity?: number;
          room_id?: string | null;
          unit?: Database["public"]["Enums"]["shopping_unit"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "shopping_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_purchased_by_fkey";
            columns: ["purchased_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_items_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_list_items: {
        Row: {
          category_id: string | null;
          created_at: string;
          id: string;
          last_added_at: string | null;
          list_id: string;
          name: string;
          notes: string | null;
          quantity: number;
          reorder_months: number | null;
          unit: Database["public"]["Enums"]["shopping_unit"];
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          last_added_at?: string | null;
          list_id: string;
          name: string;
          notes?: string | null;
          quantity?: number;
          reorder_months?: number | null;
          unit?: Database["public"]["Enums"]["shopping_unit"];
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          id?: string;
          last_added_at?: string | null;
          list_id?: string;
          name?: string;
          notes?: string | null;
          quantity?: number;
          reorder_months?: number | null;
          unit?: Database["public"]["Enums"]["shopping_unit"];
        };
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "shopping_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "shopping_lists";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_lists: {
        Row: {
          category_id: string | null;
          created_at: string;
          home_id: string;
          id: string;
          mission: string | null;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          category_id?: string | null;
          created_at?: string;
          home_id: string;
          id?: string;
          mission?: string | null;
          name: string;
        };
        Update: {
          category_id?: string | null;
          created_at?: string;
          home_id?: string;
          id?: string;
          mission?: string | null;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_lists_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "shopping_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_lists_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_sessions: {
        Row: {
          finished_at: string;
          finished_by: string;
          home_id: string;
          id: string;
          items: NonNullable<Json>;
          items_count: number;
        };
        ComputedFields: never;
        Insert: {
          finished_at?: string;
          finished_by: string;
          home_id: string;
          id?: string;
          items?: NonNullable<Json>;
          items_count?: number;
        };
        Update: {
          finished_at?: string;
          finished_by?: string;
          home_id?: string;
          id?: string;
          items?: NonNullable<Json>;
          items_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_sessions_finished_by_fkey";
            columns: ["finished_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_sessions_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_share_links: {
        Row: {
          created_at: string;
          created_by: string | null;
          home_id: string;
          id: string;
          token: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          home_id: string;
          id?: string;
          token?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          home_id?: string;
          id?: string;
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shopping_share_links_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shopping_share_links_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: true;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan: Database["public"]["Enums"]["subscription_plan"];
          provider: Database["public"]["Enums"]["subscription_provider"];
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          status: Database["public"]["Enums"]["subscription_status"];
          updated_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          provider?: Database["public"]["Enums"]["subscription_provider"];
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: Database["public"]["Enums"]["subscription_plan"];
          provider?: Database["public"]["Enums"]["subscription_provider"];
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          status?: Database["public"]["Enums"]["subscription_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      task_checklist_items: {
        Row: {
          created_at: string;
          home_id: string;
          id: string;
          position: number;
          task_id: string;
          title: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          home_id: string;
          id?: string;
          position?: number;
          task_id: string;
          title: string;
        };
        Update: {
          created_at?: string;
          home_id?: string;
          id?: string;
          position?: number;
          task_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_checklist_items_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_checklist_items_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_occurrences: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          home_id: string;
          id: string;
          notes: string | null;
          original_date: string;
          scheduled_for: string;
          status: Database["public"]["Enums"]["occurrence_status"];
          task_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          home_id: string;
          id?: string;
          notes?: string | null;
          original_date: string;
          scheduled_for: string;
          status?: Database["public"]["Enums"]["occurrence_status"];
          task_id: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          home_id?: string;
          id?: string;
          notes?: string | null;
          original_date?: string;
          scheduled_for?: string;
          status?: Database["public"]["Enums"]["occurrence_status"];
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_occurrences_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_occurrences_completed_by_fkey";
            columns: ["completed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_occurrences_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_occurrences_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      task_rotation_members: {
        Row: {
          id: string;
          profile_id: string;
          rotation_id: string;
          sort_order: number;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          profile_id: string;
          rotation_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          profile_id?: string;
          rotation_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "task_rotation_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_rotation_members_rotation_id_fkey";
            columns: ["rotation_id"];
            isOneToOne: false;
            referencedRelation: "task_rotations";
            referencedColumns: ["id"];
          },
        ];
      };
      task_rotations: {
        Row: {
          created_at: string;
          current_member_index: number;
          home_id: string;
          id: string;
          last_rotated_at: string | null;
          name: string;
          rotation_day: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          current_member_index?: number;
          home_id: string;
          id?: string;
          last_rotated_at?: string | null;
          name: string;
          rotation_day: number;
        };
        Update: {
          created_at?: string;
          current_member_index?: number;
          home_id?: string;
          id?: string;
          last_rotated_at?: string | null;
          name?: string;
          rotation_day?: number;
        };
        Relationships: [
          {
            foreignKeyName: "task_rotations_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          appliance_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_time: string | null;
          home_id: string;
          id: string;
          instructions: string | null;
          is_essential: boolean;
          priority: Database["public"]["Enums"]["task_priority"];
          room_id: string | null;
          rotation_id: string | null;
          source: Database["public"]["Enums"]["task_source"];
          status: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          appliance_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_time?: string | null;
          home_id: string;
          id?: string;
          instructions?: string | null;
          is_essential?: boolean;
          priority?: Database["public"]["Enums"]["task_priority"];
          room_id?: string | null;
          rotation_id?: string | null;
          source?: Database["public"]["Enums"]["task_source"];
          status?: Database["public"]["Enums"]["task_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          appliance_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_time?: string | null;
          home_id?: string;
          id?: string;
          instructions?: string | null;
          is_essential?: boolean;
          priority?: Database["public"]["Enums"]["task_priority"];
          room_id?: string | null;
          rotation_id?: string | null;
          source?: Database["public"]["Enums"]["task_source"];
          status?: Database["public"]["Enums"]["task_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_appliance_id_fkey";
            columns: ["appliance_id"];
            isOneToOne: false;
            referencedRelation: "appliances";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_home_id_fkey";
            columns: ["home_id"];
            isOneToOne: false;
            referencedRelation: "homes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_rotation_id_fkey";
            columns: ["rotation_id"];
            isOneToOne: false;
            referencedRelation: "task_rotations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_invite: {
        Args: { p_token: string };
        Returns: {
          out_home_id: string;
          out_role: Database["public"]["Enums"]["home_role"];
        }[];
      };
      add_shopping_item: {
        Args: {
          p_category_id: string;
          p_event_id?: string;
          p_home_id: string;
          p_mission: string;
          p_name: string;
          p_notes: string;
          p_priority: string;
          p_quantity: number;
          p_room_id: string;
          p_unit: Database["public"]["Enums"]["shopping_unit"];
        };
        Returns: Json;
      };
      apply_shopping_list: { Args: { p_list_id: string }; Returns: Json };
      assign_task_occurrence: {
        Args: { p_assigned_to: string; p_occurrence_id: string };
        Returns: Json;
      };
      backfill_onboarding_task_rooms: { Args: Record<PropertyKey, never>; Returns: number };
      can_manage_shopping: { Args: { p_home_id: string }; Returns: boolean };
      claim_home_maintenance: {
        Args: { p_home_id: string; p_min_interval?: string };
        Returns: Json;
      };
      claim_task_occurrence: { Args: { p_occurrence_id: string }; Returns: Json };
      clear_my_absence: { Args: Record<PropertyKey, never>; Returns: undefined };
      complete_task_occurrence: { Args: { p_occurrence_id: string }; Returns: Json };
      create_shopping_list: {
        Args: {
          p_category_id: string;
          p_home_id: string;
          p_items: Json;
          p_mission: string;
          p_name: string;
        };
        Returns: string;
      };
      current_plan: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Enums"]["subscription_plan"];
      };
      ensure_same_home: {
        Args: { p_home_id: string; p_id: string; p_table: unknown };
        Returns: undefined;
      };
      get_home_members: {
        Args: Record<PropertyKey, never>;
        Returns: {
          absence_end: string;
          absence_start: string;
          avatar_url: string;
          full_name: string;
          joined_at: string;
          role: Database["public"]["Enums"]["home_role"];
          user_id: string;
        }[];
      };
      get_invite_by_token: {
        Args: { p_token: string };
        Returns: {
          expires_at: string;
          home_name: string;
          role: Database["public"]["Enums"]["home_role"];
          status: Database["public"]["Enums"]["invite_status"];
        }[];
      };
      get_member_permissions: {
        Args: { p_target_user_id: string };
        Returns: {
          can_complete_tasks: boolean;
          can_manage_events: boolean;
          can_manage_shopping: boolean;
          can_manage_tasks: boolean;
          can_purchase_shopping: boolean;
          shopping_categories: Database["public"]["Enums"]["shopping_category"][];
          task_room_ids: string[];
        }[];
      };
      get_shared_shopping_list: { Args: { p_token: string }; Returns: Json };
      has_home_role: {
        Args: { p_home_id: string; p_roles: Database["public"]["Enums"]["home_role"][] };
        Returns: boolean;
      };
      home_allows_attachments: { Args: { p_home_id: string }; Returns: boolean };
      home_owner_plan: {
        Args: { p_home_id: string };
        Returns: Database["public"]["Enums"]["subscription_plan"];
      };
      invite_member: {
        Args: { p_email: string; p_role?: Database["public"]["Enums"]["home_role"] };
        Returns: {
          expires_at: string;
          invite_id: string;
          token: string;
        }[];
      };
      is_home_member: { Args: { p_home_id: string }; Returns: boolean };
      onboarding_create_home: {
        Args: {
          p_household_type: string;
          p_name: string;
          p_ownership_type: string;
          p_property_type: string;
          p_resident_count: number;
          p_timezone: string;
        };
        Returns: string;
      };
      plan_limits: {
        Args: { p_plan: Database["public"]["Enums"]["subscription_plan"] };
        Returns: {
          attachments_allowed: boolean;
          max_active_tasks: number;
          max_appliances: number;
          max_homes: number;
        }[];
      };
      plan_of_user: {
        Args: { p_user_id: string };
        Returns: Database["public"]["Enums"]["subscription_plan"];
      };
      postpone_task_occurrence: {
        Args: { p_new_date: string; p_occurrence_id: string };
        Returns: Json;
      };
      remove_member: { Args: { p_user_id: string }; Returns: undefined };
      revoke_invite: { Args: { p_invite_id: string }; Returns: undefined };
      seed_shopping_categories_for_home: { Args: { p_home_id: string }; Returns: undefined };
      set_checklist_item_state: {
        Args: { p_item_id: string; p_occurrence_id: string; p_status: string };
        Returns: Json;
      };
      set_member_permissions: {
        Args: {
          p_can_complete_tasks?: boolean;
          p_can_manage_events?: boolean;
          p_can_manage_shopping?: boolean;
          p_can_manage_tasks?: boolean;
          p_can_purchase_shopping?: boolean;
          p_shopping_categories?: Database["public"]["Enums"]["shopping_category"][];
          p_target_user_id: string;
          p_task_room_ids?: string[];
        };
        Returns: undefined;
      };
      set_my_absence: { Args: { p_end: string; p_start: string }; Returns: undefined };
      shopping_name_key: { Args: { p_name: string }; Returns: string };
      skip_task_occurrence: { Args: { p_occurrence_id: string }; Returns: Json };
      storage_home_id: { Args: { p_name: string }; Returns: string };
      task_occurrence_access: { Args: { p_occurrence_id: string }; Returns: Json };
      transfer_ownership: { Args: { p_new_owner_id: string }; Returns: undefined };
      unclaim_task_occurrence: { Args: { p_occurrence_id: string }; Returns: Json };
      undo_task_occurrence: { Args: { p_occurrence_id: string }; Returns: Json };
      update_occurrence_notes: {
        Args: { p_notes: string; p_occurrence_id: string };
        Returns: Json;
      };
    };
    Enums: {
      appliance_category:
        | "geladeira"
        | "maquina_lavar"
        | "ar_condicionado"
        | "micro_ondas"
        | "fogao"
        | "televisao"
        | "lava_loucas"
        | "outro";
      attachment_kind: "photo" | "document";
      event_type:
        | "aniversario"
        | "viagem"
        | "jantar"
        | "consulta_medica"
        | "visita"
        | "manutencao"
        | "feriado"
        | "outros";
      frequency_type: "once" | "daily" | "weekly" | "biweekly" | "monthly" | "custom";
      home_role: "owner" | "admin" | "member";
      household_type: "sozinho" | "casal" | "familia" | "compartilhada" | "outro";
      interval_unit: "day" | "week" | "month";
      invite_status: "pending" | "accepted" | "revoked" | "expired";
      issue_event_type: "created" | "status_changed" | "note" | "maintenance_linked";
      issue_status: "open" | "in_progress" | "resolved";
      maintenance_item_status: "pendente" | "em_andamento" | "concluido" | "cancelado";
      maintenance_status: "scheduled" | "completed" | "cancelled";
      occurrence_status: "pending" | "completed" | "skipped" | "missed";
      ownership_type: "proprio" | "alugado" | "outro";
      property_type: "apartamento" | "casa" | "sobrado" | "studio_kitnet" | "outro";
      room_type:
        | "sala"
        | "cozinha"
        | "quarto"
        | "banheiro"
        | "lavanderia"
        | "escritorio"
        | "varanda"
        | "garagem"
        | "outro";
      routine_level: "leve" | "equilibrada" | "detalhada";
      shopping_category:
        "limpeza" | "higiene" | "cozinha" | "lavanderia" | "alimentacao" | "outros";
      shopping_unit: "un" | "kg" | "g" | "l" | "ml" | "pacote" | "caixa";
      subscription_plan: "free" | "pro";
      subscription_provider: "none" | "beta_grant" | "stripe" | "mercadopago";
      subscription_status: "active" | "trialing" | "past_due" | "canceled";
      task_priority: "baixa" | "media" | "alta";
      task_source: "manual" | "onboarding";
      task_status: "active" | "paused" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appliance_category: [
        "geladeira",
        "maquina_lavar",
        "ar_condicionado",
        "micro_ondas",
        "fogao",
        "televisao",
        "lava_loucas",
        "outro",
      ],
      attachment_kind: ["photo", "document"],
      event_type: [
        "aniversario",
        "viagem",
        "jantar",
        "consulta_medica",
        "visita",
        "manutencao",
        "feriado",
        "outros",
      ],
      frequency_type: ["once", "daily", "weekly", "biweekly", "monthly", "custom"],
      home_role: ["owner", "admin", "member"],
      household_type: ["sozinho", "casal", "familia", "compartilhada", "outro"],
      interval_unit: ["day", "week", "month"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      issue_event_type: ["created", "status_changed", "note", "maintenance_linked"],
      issue_status: ["open", "in_progress", "resolved"],
      maintenance_item_status: ["pendente", "em_andamento", "concluido", "cancelado"],
      maintenance_status: ["scheduled", "completed", "cancelled"],
      occurrence_status: ["pending", "completed", "skipped", "missed"],
      ownership_type: ["proprio", "alugado", "outro"],
      property_type: ["apartamento", "casa", "sobrado", "studio_kitnet", "outro"],
      room_type: [
        "sala",
        "cozinha",
        "quarto",
        "banheiro",
        "lavanderia",
        "escritorio",
        "varanda",
        "garagem",
        "outro",
      ],
      routine_level: ["leve", "equilibrada", "detalhada"],
      shopping_category: ["limpeza", "higiene", "cozinha", "lavanderia", "alimentacao", "outros"],
      shopping_unit: ["un", "kg", "g", "l", "ml", "pacote", "caixa"],
      subscription_plan: ["free", "pro"],
      subscription_provider: ["none", "beta_grant", "stripe", "mercadopago"],
      subscription_status: ["active", "trialing", "past_due", "canceled"],
      task_priority: ["baixa", "media", "alta"],
      task_source: ["manual", "onboarding"],
      task_status: ["active", "paused", "archived"],
    },
  },
} as const;
