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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bundle_photos: {
        Row: {
          bundle_id: string
          created_at: string
          photo_slug: string
          position: number
        }
        Insert: {
          bundle_id: string
          created_at?: string
          photo_slug: string
          position: number
        }
        Update: {
          bundle_id?: string
          created_at?: string
          photo_slug?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_photos_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_photos_photo_slug_fkey"
            columns: ["photo_slug"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["slug"]
          },
        ]
      }
      bundles: {
        Row: {
          categories: string[]
          created_at: string
          date_taken: string | null
          description: string | null
          id: string
          location_name: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          date_taken?: string | null
          description?: string | null
          id: string
          location_name?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          date_taken?: string | null
          description?: string | null
          id?: string
          location_name?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      photo_v2_collection_photos: {
        Row: {
          collection_id: string
          created_at: string
          photo_id: string
          position: number
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          photo_id: string
          position: number
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          photo_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_v2_collection_photos_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "photo_v2_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_v2_collection_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_v2_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_v2_collections: {
        Row: {
          categories: string[]
          cover_photo_id: string | null
          created_at: string
          date_taken: string | null
          description: string | null
          id: string
          is_public_copy: boolean
          kind: string
          legacy_bundle_id: string | null
          location_name: string | null
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          categories?: string[]
          cover_photo_id?: string | null
          created_at?: string
          date_taken?: string | null
          description?: string | null
          id?: string
          is_public_copy?: boolean
          kind: string
          legacy_bundle_id?: string | null
          location_name?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          cover_photo_id?: string | null
          created_at?: string
          date_taken?: string | null
          description?: string | null
          id?: string
          is_public_copy?: boolean
          kind?: string
          legacy_bundle_id?: string | null
          location_name?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_v2_collections_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photo_v2_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_v2_media_cleanup: {
        Row: {
          created_at: string
          photo_id: string
        }
        Insert: {
          created_at?: string
          photo_id: string
        }
        Update: {
          created_at?: string
          photo_id?: string
        }
        Relationships: []
      }
      photo_v2_photos: {
        Row: {
          alt_text: string
          categories: string[]
          created_at: string
          date_taken: string
          description: string | null
          focus_x: number | null
          focus_y: number | null
          id: string
          image_height: number | null
          image_width: number | null
          location: string | null
          object_key: string
          published: boolean
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          categories?: string[]
          created_at?: string
          date_taken: string
          description?: string | null
          focus_x?: number | null
          focus_y?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          object_key: string
          published?: boolean
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          categories?: string[]
          created_at?: string
          date_taken?: string
          description?: string | null
          focus_x?: number | null
          focus_y?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          object_key?: string
          published?: boolean
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      photo_v2_publications: {
        Row: {
          draft_id: string
          draft_revision: string
          live_id: string
        }
        Insert: {
          draft_id: string
          draft_revision: string
          live_id: string
        }
        Update: {
          draft_id?: string
          draft_revision?: string
          live_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_v2_publications_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: true
            referencedRelation: "photo_v2_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_v2_publications_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: true
            referencedRelation: "photo_v2_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_v3_collection_photos: {
        Row: {
          collection_id: string
          created_at: string
          photo_id: string
          position: number
          updated_at: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          photo_id: string
          position: number
          updated_at?: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          photo_id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_v3_collection_photos_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "photo_v3_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_v3_collection_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photo_v3_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_v3_collections: {
        Row: {
          categories: string[]
          cover_photo_id: string | null
          created_at: string
          date_taken: string | null
          description: string | null
          id: string
          is_public_copy: boolean
          kind: string
          legacy_bundle_id: string | null
          location_name: string | null
          published: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          categories?: string[]
          cover_photo_id?: string | null
          created_at?: string
          date_taken?: string | null
          description?: string | null
          id?: string
          is_public_copy?: boolean
          kind: string
          legacy_bundle_id?: string | null
          location_name?: string | null
          published?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          categories?: string[]
          cover_photo_id?: string | null
          created_at?: string
          date_taken?: string | null
          description?: string | null
          id?: string
          is_public_copy?: boolean
          kind?: string
          legacy_bundle_id?: string | null
          location_name?: string | null
          published?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_v3_collections_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photo_v3_photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_v3_media_cleanup: {
        Row: {
          created_at: string
          photo_id: string
        }
        Insert: {
          created_at?: string
          photo_id: string
        }
        Update: {
          created_at?: string
          photo_id?: string
        }
        Relationships: []
      }
      photo_v3_photos: {
        Row: {
          alt_text: string
          categories: string[]
          created_at: string
          date_taken: string
          description: string | null
          focus_x: number | null
          focus_y: number | null
          id: string
          image_height: number | null
          image_width: number | null
          location: string | null
          object_key: string
          published: boolean
          slug: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          categories?: string[]
          created_at?: string
          date_taken: string
          description?: string | null
          focus_x?: number | null
          focus_y?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          object_key: string
          published?: boolean
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          categories?: string[]
          created_at?: string
          date_taken?: string
          description?: string | null
          focus_x?: number | null
          focus_y?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          object_key?: string
          published?: boolean
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      photo_v3_publications: {
        Row: {
          draft_id: string
          draft_revision: string
          live_id: string
        }
        Insert: {
          draft_id: string
          draft_revision: string
          live_id: string
        }
        Update: {
          draft_id?: string
          draft_revision?: string
          live_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_v3_publications_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: true
            referencedRelation: "photo_v3_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_v3_publications_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: true
            referencedRelation: "photo_v3_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          alt_text: string
          categories: string[]
          created_at: string
          date_taken: string
          description: string | null
          id: string
          image_height: number | null
          image_width: number | null
          location: string | null
          object_key: string
          portfolio_order: number
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          alt_text: string
          categories?: string[]
          created_at?: string
          date_taken: string
          description?: string | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          object_key: string
          portfolio_order: number
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          categories?: string[]
          created_at?: string
          date_taken?: string
          description?: string | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          location?: string | null
          object_key?: string
          portfolio_order?: number
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_portfolio_order_after: {
        Args: { deleted_order: number }
        Returns: undefined
      }
      photo_v2_publish_draft: {
        Args: { p_draft_id: string; p_expected_updated_at: string }
        Returns: {
          collection_kind: string
          public_slug: string
        }[]
      }
      photo_v2_save_and_publish_draft: {
        Args: {
          p_cover_photo_id?: string
          p_description?: string
          p_draft_id: string
          p_expected_updated_at?: string
          p_kind: string
          p_photo_ids: string[]
          p_title?: string
        }
        Returns: {
          collection_kind: string
          public_slug: string
          saved_revision: string
        }[]
      }
      photo_v2_save_selection_draft: {
        Args: {
          p_collection_id: string
          p_expected_updated_at: string
          p_photo_ids: string[]
        }
        Returns: string
      }
      photo_v2_save_series_draft: {
        Args: {
          p_collection_id: string
          p_cover_photo_id?: string
          p_description: string
          p_expected_updated_at?: string
          p_photo_ids: string[]
          p_title: string
        }
        Returns: string
      }
      photo_v2_unpublish_draft: {
        Args: { p_draft_id: string; p_expected_live_updated_at: string }
        Returns: {
          collection_kind: string
          public_slug: string
        }[]
      }
      photo_v3_publish_draft: {
        Args: { p_draft_id: string; p_expected_updated_at: string }
        Returns: {
          collection_kind: string
          public_slug: string
        }[]
      }
      photo_v3_save_and_publish_draft: {
        Args: {
          p_cover_photo_id?: string
          p_description?: string
          p_draft_id: string
          p_expected_updated_at?: string
          p_kind: string
          p_photo_ids: string[]
          p_title?: string
        }
        Returns: {
          collection_kind: string
          public_slug: string
          saved_revision: string
        }[]
      }
      photo_v3_save_selection_draft: {
        Args: {
          p_collection_id: string
          p_expected_updated_at: string
          p_photo_ids: string[]
        }
        Returns: string
      }
      photo_v3_save_series_draft: {
        Args: {
          p_collection_id: string
          p_cover_photo_id?: string
          p_description: string
          p_expected_updated_at?: string
          p_photo_ids: string[]
          p_title: string
        }
        Returns: string
      }
      photo_v3_unpublish_draft: {
        Args: { p_draft_id: string; p_expected_live_updated_at: string }
        Returns: {
          collection_kind: string
          public_slug: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
