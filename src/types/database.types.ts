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
      album_artists: {
        Row: {
          album_id: string;
          artist_id: string;
          created_at: string;
          position: number;
          role: Database["public"]["Enums"]["artist_role"];
          user_id: string;
        };
        Insert: {
          album_id: string;
          artist_id: string;
          created_at?: string;
          position?: number;
          role?: Database["public"]["Enums"]["artist_role"];
          user_id?: string;
        };
        Update: {
          album_id?: string;
          artist_id?: string;
          created_at?: string;
          position?: number;
          role?: Database["public"]["Enums"]["artist_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "album_artists_album_id_user_id_fkey";
            columns: ["album_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "album_artists_artist_id_user_id_fkey";
            columns: ["artist_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      album_genres: {
        Row: {
          album_id: string;
          created_at: string;
          genre_id: string;
          is_primary: boolean;
          user_id: string;
        };
        Insert: {
          album_id: string;
          created_at?: string;
          genre_id: string;
          is_primary?: boolean;
          user_id?: string;
        };
        Update: {
          album_id?: string;
          created_at?: string;
          genre_id?: string;
          is_primary?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "album_genres_album_id_user_id_fkey";
            columns: ["album_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "album_genres_genre_id_user_id_fkey";
            columns: ["genre_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      album_instruments: {
        Row: {
          album_id: string;
          created_at: string;
          instrument_id: string;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          album_id: string;
          created_at?: string;
          instrument_id: string;
          notes?: string | null;
          user_id?: string;
        };
        Update: {
          album_id?: string;
          created_at?: string;
          instrument_id?: string;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "album_instruments_album_id_user_id_fkey";
            columns: ["album_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id", "user_id"];
          },
          {
            foreignKeyName: "album_instruments_instrument_id_user_id_fkey";
            columns: ["instrument_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "instruments";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      album_links: {
        Row: {
          album_id: string;
          created_at: string;
          id: string;
          label: string | null;
          url: string;
          user_id: string;
        };
        Insert: {
          album_id: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          url: string;
          user_id?: string;
        };
        Update: {
          album_id?: string;
          created_at?: string;
          id?: string;
          label?: string | null;
          url?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "album_links_album_id_user_id_fkey";
            columns: ["album_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      albums: {
        Row: {
          artwork_url: string | null;
          created_at: string;
          id: string;
          musicbrainz_release_group_id: string | null;
          record_label: string | null;
          release_year: number | null;
          sort_title: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          artwork_url?: string | null;
          created_at?: string;
          id?: string;
          musicbrainz_release_group_id?: string | null;
          record_label?: string | null;
          release_year?: number | null;
          sort_title?: string | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          artwork_url?: string | null;
          created_at?: string;
          id?: string;
          musicbrainz_release_group_id?: string | null;
          record_label?: string | null;
          release_year?: number | null;
          sort_title?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      artists: {
        Row: {
          photo_url: string | null;
          country: string | null;
          created_at: string;
          id: string;
          musicbrainz_id: string | null;
          name: string;
          sort_name: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          photo_url?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          musicbrainz_id?: string | null;
          name: string;
          sort_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          photo_url?: string | null;
          country?: string | null;
          created_at?: string;
          id?: string;
          musicbrainz_id?: string | null;
          name?: string;
          sort_name?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      genres: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          parent_genre_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          parent_genre_id?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          parent_genre_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "genres_parent_genre_id_user_id_fkey";
            columns: ["parent_genre_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "genres";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      instrument_categories: {
        Row: {
          category: Database["public"]["Enums"]["instrument_category"];
          instrument_id: string;
          user_id: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["instrument_category"];
          instrument_id: string;
          user_id?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["instrument_category"];
          instrument_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "instrument_categories_instrument_id_user_id_fkey";
            columns: ["instrument_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "instruments";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      instruments: {
        Row: {
          image_url: string | null;
          created_at: string;
          id: string;
          name: string;
          user_id: string;
        };
        Insert: {
          image_url?: string | null;
          created_at?: string;
          id?: string;
          name: string;
          user_id?: string;
        };
        Update: {
          image_url?: string | null;
          created_at?: string;
          id?: string;
          name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      listening_entries: {
        Row: {
          album_id: string;
          created_at: string;
          id: string;
          listened_at: string;
          notes: string | null;
          rating: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          album_id: string;
          created_at?: string;
          id?: string;
          listened_at?: string;
          notes?: string | null;
          rating: number;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          album_id?: string;
          created_at?: string;
          id?: string;
          listened_at?: string;
          notes?: string | null;
          rating?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "listening_entries_album_id_user_id_fkey";
            columns: ["album_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "albums";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      save_library_changes: {
        Args: { changes: Json };
        Returns: Json;
      };
    };
    Enums: {
      artist_role: "primary" | "featured" | "other";
      instrument_category:
        | "percussion"
        | "strings"
        | "woodwind"
        | "brass"
        | "keyboard"
        | "electronic"
        | "voice"
        | "other";
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
    Enums: {
      artist_role: ["primary", "featured", "other"],
      instrument_category: [
        "percussion",
        "strings",
        "woodwind",
        "brass",
        "keyboard",
        "electronic",
        "voice",
        "other",
      ],
    },
  },
} as const;
