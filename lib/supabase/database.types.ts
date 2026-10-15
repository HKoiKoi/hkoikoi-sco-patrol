export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      patrol_drafts: {
        Row: {
          away: number[];
          cafe_zone: number[];
          drowsy: number[];
          memo: string;
          revision: number;
          standing: number[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          away?: number[];
          cafe_zone?: number[];
          drowsy?: number[];
          memo?: string;
          revision?: number;
          standing?: number[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          away?: number[];
          cafe_zone?: number[];
          drowsy?: number[];
          memo?: string;
          revision?: number;
          standing?: number[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patrol_drafts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      patrol_logs: {
        Row: {
          author_id: string;
          away: number[];
          business_date: string;
          cafe_zone: number[];
          client_request_id: string;
          drowsy: number[];
          id: string;
          memo: string | null;
          patrolled_at: string;
          standing: number[];
        };
        Insert: {
          author_id: string;
          away?: number[];
          business_date: string;
          cafe_zone?: number[];
          client_request_id: string;
          drowsy?: number[];
          id?: string;
          memo?: string | null;
          patrolled_at: string;
          standing?: number[];
        };
        Update: {
          author_id?: string;
          away?: number[];
          business_date?: string;
          cafe_zone?: number[];
          client_request_id?: string;
          drowsy?: number[];
          id?: string;
          memo?: string | null;
          patrolled_at?: string;
          standing?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "patrol_logs_author_id_profiles_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "patrol_logs_author_id_staff_names_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "staff_names";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          full_name: string | null;
          id: string;
          role: string;
          updated_at: string | null;
        };
        Insert: {
          full_name?: string | null;
          id: string;
          role?: string;
          updated_at?: string | null;
        };
        Update: {
          full_name?: string | null;
          id?: string;
          role?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      quick_tags: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          label: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label: string;
          sort_order: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          label?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      staff_names: {
        Row: {
          full_name: string | null;
          id: string;
        };
        Insert: {
          full_name?: string | null;
          id: string;
        };
        Update: {
          full_name?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_names_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_patrol: {
        Args: { client_request_id: string; expected_revision: number };
        Returns: Json;
      };
      save_patrol_draft: {
        Args: {
          away: number[];
          base_revision: number;
          cafe_zone: number[];
          drowsy: number[];
          memo: string;
          standing: number[];
        };
        Returns: Json;
      };
      swap_quick_tag_order: {
        Args: { tag_a: string; tag_b: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
