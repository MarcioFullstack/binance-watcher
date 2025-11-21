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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_config_history: {
        Row: {
          alert_type: string
          changed_at: string
          changed_by: string
          field_changed: string
          id: string
          new_value: string
          old_value: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          changed_at?: string
          changed_by: string
          field_changed: string
          id?: string
          new_value: string
          old_value?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          changed_at?: string
          changed_by?: string
          field_changed?: string
          id?: string
          new_value?: string
          old_value?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alert_configs: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string | null
          enabled: boolean
          id: string
          threshold: number
          updated_at: string | null
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          enabled?: boolean
          id?: string
          threshold: number
          updated_at?: string | null
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string | null
          enabled?: boolean
          id?: string
          threshold?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_config_id: string | null
          details: Json
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          triggered_at: string | null
        }
        Insert: {
          alert_config_id?: string | null
          details: Json
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          triggered_at?: string | null
        }
        Update: {
          alert_config_id?: string | null
          details?: Json
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_alert_config_id_fkey"
            columns: ["alert_config_id"]
            isOneToOne: false
            referencedRelation: "alert_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auth_attempts: {
        Row: {
          attempt_type: string
          attempted_at: string
          id: string
          identifier: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempt_type: string
          attempted_at?: string
          id?: string
          identifier: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          attempt_type?: string
          attempted_at?: string
          id?: string
          identifier?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      backup_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_used: boolean
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      binance_accounts: {
        Row: {
          account_name: string
          api_key: string
          api_secret: string
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          api_key: string
          api_secret: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          api_key?: string
          api_secret?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_pnl: {
        Row: {
          created_at: string
          date: string
          id: string
          market_type: string
          pnl_percentage: number
          pnl_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          market_type?: string
          pnl_percentage?: number
          pnl_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          market_type?: string
          pnl_percentage?: number
          pnl_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loss_alert_history: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          alert_message: string
          balance_at_alert: number
          id: string
          initial_balance: number
          level_name: string
          loss_amount: number
          loss_percentage: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_message: string
          balance_at_alert: number
          id?: string
          initial_balance: number
          level_name: string
          loss_amount: number
          loss_percentage: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          alert_message?: string
          balance_at_alert?: number
          id?: string
          initial_balance?: number
          level_name?: string
          loss_amount?: number
          loss_percentage?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loss_alert_levels: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          level_name: string
          loss_percentage: number
          push_notification: boolean | null
          sound_enabled: boolean | null
          updated_at: string | null
          user_id: string
          visual_alert: boolean | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          level_name: string
          loss_percentage: number
          push_notification?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          visual_alert?: boolean | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          level_name?: string
          loss_percentage?: number
          push_notification?: boolean | null
          sound_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          visual_alert?: boolean | null
        }
        Relationships: []
      }
      notification_history: {
        Row: {
          created_at: string
          description: string
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pending_2fa_verifications: {
        Row: {
          attempts: number
          challenge_token: string
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          challenge_token: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          challenge_token?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      pending_payments: {
        Row: {
          confirmed_amount: number | null
          confirmed_at: string | null
          created_at: string
          currency: string
          expected_amount: number
          id: string
          plan_type: string | null
          status: string
          transaction_hash: string | null
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          confirmed_amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          expected_amount?: number
          id?: string
          plan_type?: string | null
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          confirmed_amount?: number | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          expected_amount?: number
          id?: string
          plan_type?: string | null
          status?: string
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      pnl_alert_configs: {
        Row: {
          alert_type: string
          created_at: string
          enabled: boolean
          id: string
          push_enabled: boolean
          sound_enabled: boolean
          threshold: number
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          sound_enabled?: boolean
          threshold: number
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          push_enabled?: boolean
          sound_enabled?: boolean
          threshold?: number
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          id: string
          ip_address?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      risk_settings: {
        Row: {
          created_at: string | null
          daily_reset: boolean | null
          gain_push_notifications: boolean | null
          id: string
          initial_balance: number | null
          kill_switch_enabled: boolean | null
          loss_push_notifications: boolean | null
          risk_active: boolean | null
          risk_percent: number | null
          siren_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_reset?: boolean | null
          gain_push_notifications?: boolean | null
          id?: string
          initial_balance?: number | null
          kill_switch_enabled?: boolean | null
          loss_push_notifications?: boolean | null
          risk_active?: boolean | null
          risk_percent?: number | null
          siren_type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_reset?: boolean | null
          gain_push_notifications?: boolean | null
          id?: string
          initial_balance?: number | null
          kill_switch_enabled?: boolean | null
          loss_push_notifications?: boolean | null
          risk_active?: boolean | null
          risk_percent?: number | null
          siren_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_payment_amount: number | null
          next_billing_date: string | null
          plan_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_payment_amount?: number | null
          next_billing_date?: string | null
          plan_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_payment_amount?: number | null
          next_billing_date?: string | null
          plan_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_2fa: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          totp_secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          totp_secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voucher_activations: {
        Row: {
          activated_at: string
          days_granted: number
          id: string
          user_id: string
          voucher_id: string
        }
        Insert: {
          activated_at?: string
          days_granted: number
          id?: string
          user_id: string
          voucher_id: string
        }
        Update: {
          activated_at?: string
          days_granted?: number
          id?: string
          user_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_activations_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          code: string
          created_at: string | null
          current_uses: number
          days: number | null
          id: string
          is_used: boolean | null
          max_uses: number | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_uses?: number
          days?: number | null
          id?: string
          is_used?: boolean | null
          max_uses?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_uses?: number
          days?: number | null
          id?: string
          is_used?: boolean | null
          max_uses?: number | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_auto_renew_subscriptions: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          p_attempt_type: string
          p_identifier: string
          p_max_attempts: number
          p_window_minutes: number
        }
        Returns: boolean
      }
      cleanup_expired_2fa_tokens: { Args: never; Returns: undefined }
      cleanup_old_auth_attempts: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_type:
        | "vouchers_per_day"
        | "payment_rejection_rate"
        | "high_payment_volume"
      app_role: "admin" | "user"
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
      alert_type: [
        "vouchers_per_day",
        "payment_rejection_rate",
        "high_payment_volume",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
