
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "home_members": {
                  Row: {
                    "created_at": string,"home_id": string,"id": string,"role": Database["public"]['Enums']["home_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"home_id": string,"id"?: string,"role"?: Database["public"]['Enums']["home_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"home_id"?: string,"id"?: string,"role"?: Database["public"]['Enums']["home_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "home_members_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "home_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"homes": {
                  Row: {
                    "available_minutes_per_week": number | null,"created_at": string,"created_by": string | null,"household_type": Database["public"]['Enums']["household_type"] | null,"id": string,"name": string,"ownership_type": Database["public"]['Enums']["ownership_type"] | null,"property_type": Database["public"]['Enums']["property_type"] | null,"resident_count": number | null,"routine_level": Database["public"]['Enums']["routine_level"] | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "available_minutes_per_week"?: number | null,"created_at"?: string,"created_by"?: string | null,"household_type"?: Database["public"]['Enums']["household_type"] | null,"id"?: string,"name": string,"ownership_type"?: Database["public"]['Enums']["ownership_type"] | null,"property_type"?: Database["public"]['Enums']["property_type"] | null,"resident_count"?: number | null,"routine_level"?: Database["public"]['Enums']["routine_level"] | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "available_minutes_per_week"?: number | null,"created_at"?: string,"created_by"?: string | null,"household_type"?: Database["public"]['Enums']["household_type"] | null,"id"?: string,"name"?: string,"ownership_type"?: Database["public"]['Enums']["ownership_type"] | null,"property_type"?: Database["public"]['Enums']["property_type"] | null,"resident_count"?: number | null,"routine_level"?: Database["public"]['Enums']["routine_level"] | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "homes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"current_home_id": string | null,"full_name": string | null,"id": string,"last_seen_at": string | null,"marketing_opt_in": boolean,"onboarding_completed": boolean,"onboarding_step": number,"terms_accepted_at": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"current_home_id"?: string | null,"full_name"?: string | null,"id": string,"last_seen_at"?: string | null,"marketing_opt_in"?: boolean,"onboarding_completed"?: boolean,"onboarding_step"?: number,"terms_accepted_at"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"current_home_id"?: string | null,"full_name"?: string | null,"id"?: string,"last_seen_at"?: string | null,"marketing_opt_in"?: boolean,"onboarding_completed"?: boolean,"onboarding_step"?: number,"terms_accepted_at"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_current_home_id_fkey"
      columns: ["current_home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    }
                  ]
                },"rooms": {
                  Row: {
                    "created_at": string,"home_id": string,"id": string,"name": string,"position": number,"room_type": Database["public"]['Enums']["room_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"home_id": string,"id"?: string,"name": string,"position"?: number,"room_type"?: Database["public"]['Enums']["room_type"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"home_id"?: string,"id"?: string,"name"?: string,"position"?: number,"room_type"?: Database["public"]['Enums']["room_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rooms_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    }
                  ]
                },"routines": {
                  Row: {
                    "created_at": string,"end_date": string | null,"frequency_type": Database["public"]['Enums']["frequency_type"],"generated_until": string | null,"home_id": string,"id": string,"interval_unit": Database["public"]['Enums']["interval_unit"] | null,"interval_value": number,"is_active": boolean,"month_day": number | null,"start_date": string,"task_id": string,"updated_at": string,"weekdays": (number)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"end_date"?: string | null,"frequency_type": Database["public"]['Enums']["frequency_type"],"generated_until"?: string | null,"home_id": string,"id"?: string,"interval_unit"?: Database["public"]['Enums']["interval_unit"] | null,"interval_value"?: number,"is_active"?: boolean,"month_day"?: number | null,"start_date": string,"task_id": string,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Update: {
                    "created_at"?: string,"end_date"?: string | null,"frequency_type"?: Database["public"]['Enums']["frequency_type"],"generated_until"?: string | null,"home_id"?: string,"id"?: string,"interval_unit"?: Database["public"]['Enums']["interval_unit"] | null,"interval_value"?: number,"is_active"?: boolean,"month_day"?: number | null,"start_date"?: string,"task_id"?: string,"updated_at"?: string,"weekdays"?: (number)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "routines_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "routines_task_id_fkey"
      columns: ["task_id"]
isOneToOne: true
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "created_at": string,"current_period_end": string | null,"current_period_start": string | null,"id": string,"plan": Database["public"]['Enums']["subscription_plan"],"provider": Database["public"]['Enums']["subscription_provider"],"provider_customer_id": string | null,"provider_subscription_id": string | null,"status": Database["public"]['Enums']["subscription_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"id"?: string,"plan"?: Database["public"]['Enums']["subscription_plan"],"provider"?: Database["public"]['Enums']["subscription_provider"],"provider_customer_id"?: string | null,"provider_subscription_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"current_period_end"?: string | null,"current_period_start"?: string | null,"id"?: string,"plan"?: Database["public"]['Enums']["subscription_plan"],"provider"?: Database["public"]['Enums']["subscription_provider"],"provider_customer_id"?: string | null,"provider_subscription_id"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"task_occurrences": {
                  Row: {
                    "completed_at": string | null,"completed_by": string | null,"created_at": string,"home_id": string,"id": string,"notes": string | null,"original_date": string,"scheduled_for": string,"status": Database["public"]['Enums']["occurrence_status"],"task_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"home_id": string,"id"?: string,"notes"?: string | null,"original_date": string,"scheduled_for": string,"status"?: Database["public"]['Enums']["occurrence_status"],"task_id": string,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"home_id"?: string,"id"?: string,"notes"?: string | null,"original_date"?: string,"scheduled_for"?: string,"status"?: Database["public"]['Enums']["occurrence_status"],"task_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_occurrences_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_occurrences_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_occurrences_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"tasks": {
                  Row: {
                    "appliance_id": string | null,"created_at": string,"created_by": string | null,"description": string | null,"estimated_minutes": number | null,"home_id": string,"id": string,"priority": Database["public"]['Enums']["task_priority"],"room_id": string | null,"source": Database["public"]['Enums']["task_source"],"status": Database["public"]['Enums']["task_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appliance_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"estimated_minutes"?: number | null,"home_id": string,"id"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"room_id"?: string | null,"source"?: Database["public"]['Enums']["task_source"],"status"?: Database["public"]['Enums']["task_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "appliance_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"estimated_minutes"?: number | null,"home_id"?: string,"id"?: string,"priority"?: Database["public"]['Enums']["task_priority"],"room_id"?: string | null,"source"?: Database["public"]['Enums']["task_source"],"status"?: Database["public"]['Enums']["task_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_home_id_fkey"
      columns: ["home_id"]
isOneToOne: false
      referencedRelation: "homes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_room_id_fkey"
      columns: ["room_id"]
isOneToOne: false
      referencedRelation: "rooms"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "current_plan":
{ Args: { "p_user_id": string }; Returns: Database["public"]['Enums']["subscription_plan"]
                           },
"ensure_same_home":
{ Args: { "p_home_id": string,"p_id": string,"p_table": unknown }; Returns: undefined
                           },
"has_home_role":
{ Args: { "p_home_id": string,"p_roles": (Database["public"]['Enums']["home_role"])[] }; Returns: boolean
                           },
"is_home_member":
{ Args: { "p_home_id": string }; Returns: boolean
                           }
          }
          Enums: {
            "frequency_type": "once"|"daily"|"weekly"|"biweekly"|"monthly"|"custom","home_role": "owner"|"admin"|"member","household_type": "sozinho"|"casal"|"familia"|"compartilhada"|"outro","interval_unit": "day"|"week"|"month","occurrence_status": "pending"|"completed"|"skipped"|"missed","ownership_type": "proprio"|"alugado"|"outro","property_type": "apartamento"|"casa"|"sobrado"|"studio_kitnet"|"outro","room_type": "sala"|"cozinha"|"quarto"|"banheiro"|"lavanderia"|"escritorio"|"varanda"|"garagem"|"outro","routine_level": "leve"|"equilibrada"|"detalhada","subscription_plan": "free"|"pro","subscription_provider": "none"|"beta_grant"|"stripe"|"mercadopago","subscription_status": "active"|"trialing"|"past_due"|"canceled","task_priority": "baixa"|"media"|"alta","task_source": "manual"|"onboarding","task_status": "active"|"paused"|"archived"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "frequency_type": ["once", "daily", "weekly", "biweekly", "monthly", "custom"],"home_role": ["owner", "admin", "member"],"household_type": ["sozinho", "casal", "familia", "compartilhada", "outro"],"interval_unit": ["day", "week", "month"],"occurrence_status": ["pending", "completed", "skipped", "missed"],"ownership_type": ["proprio", "alugado", "outro"],"property_type": ["apartamento", "casa", "sobrado", "studio_kitnet", "outro"],"room_type": ["sala", "cozinha", "quarto", "banheiro", "lavanderia", "escritorio", "varanda", "garagem", "outro"],"routine_level": ["leve", "equilibrada", "detalhada"],"subscription_plan": ["free", "pro"],"subscription_provider": ["none", "beta_grant", "stripe", "mercadopago"],"subscription_status": ["active", "trialing", "past_due", "canceled"],"task_priority": ["baixa", "media", "alta"],"task_source": ["manual", "onboarding"],"task_status": ["active", "paused", "archived"]
          }
        }
} as const
