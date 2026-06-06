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
      activity_logs: {
        Row: {
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          message?: string
          user_id?: string | null
        }
        Relationships: []
      }
      approvals: {
        Row: {
          approver_id: string | null
          created_at: string
          decided_at: string | null
          decision: Database["public"]["Enums"]["approval_decision"]
          id: string
          quotation_id: string | null
          remarks: string | null
          rfq_id: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          quotation_id?: string | null
          remarks?: string | null
          rfq_id: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision?: Database["public"]["Enums"]["approval_decision"]
          id?: string
          quotation_id?: string | null
          remarks?: string | null
          rfq_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          cgst: number
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          igst: number
          invoice_number: string
          issued_at: string
          po_id: string | null
          sgst: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          cgst?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          igst?: number
          invoice_number?: string
          issued_at?: string
          po_id?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          total: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          cgst?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          igst?: number
          invoice_number?: string
          issued_at?: string
          po_id?: string | null
          sgst?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery: string | null
          id: string
          po_number: string
          quotation_id: string | null
          rfq_id: string | null
          status: Database["public"]["Enums"]["po_status"]
          terms: string | null
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          po_number?: string
          quotation_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          terms?: string | null
          total_amount: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery?: string | null
          id?: string
          po_number?: string
          quotation_id?: string | null
          rfq_id?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          terms?: string | null
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          attachments: Json
          created_at: string
          delivery_days: number
          id: string
          notes: string | null
          price: number
          rfq_id: string
          status: Database["public"]["Enums"]["quotation_status"]
          submitted_by: string | null
          updated_at: string
          vendor_id: string
          warranty_months: number
        }
        Insert: {
          attachments?: Json
          created_at?: string
          delivery_days: number
          id?: string
          notes?: string | null
          price: number
          rfq_id: string
          status?: Database["public"]["Enums"]["quotation_status"]
          submitted_by?: string | null
          updated_at?: string
          vendor_id: string
          warranty_months?: number
        }
        Update: {
          attachments?: Json
          created_at?: string
          delivery_days?: number
          id?: string
          notes?: string | null
          price?: number
          rfq_id?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          submitted_by?: string | null
          updated_at?: string
          vendor_id?: string
          warranty_months?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_vendors: {
        Row: {
          id: string
          invited_at: string
          rfq_id: string
          vendor_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          rfq_id: string
          vendor_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          rfq_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_vendors_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_vendors_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          attachments: Json
          awarded_quotation_id: string | null
          budget: number | null
          created_at: string
          created_by: string
          deadline: string
          description: string | null
          id: string
          product_details: string | null
          quantity: number
          rfq_number: string
          status: Database["public"]["Enums"]["rfq_status"]
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          awarded_quotation_id?: string | null
          budget?: number | null
          created_at?: string
          created_by: string
          deadline: string
          description?: string | null
          id?: string
          product_details?: string | null
          quantity?: number
          rfq_number?: string
          status?: Database["public"]["Enums"]["rfq_status"]
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          awarded_quotation_id?: string | null
          budget?: number | null
          created_at?: string
          created_by?: string
          deadline?: string
          description?: string | null
          id?: string
          product_details?: string | null
          quantity?: number
          rfq_number?: string
          status?: Database["public"]["Enums"]["rfq_status"]
          title?: string
          updated_at?: string
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
      vendor_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rater_id: string
          score: number
          vendor_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rater_id: string
          score: number
          vendor_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rater_id?: string
          score?: number
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_ratings_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          category: string
          company_name: string
          contact_person: string
          created_at: string
          created_by: string | null
          email: string
          gst_number: string | null
          id: string
          notes: string | null
          phone: string | null
          rating: number
          risk_score: number
          status: Database["public"]["Enums"]["vendor_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          category?: string
          company_name: string
          contact_person: string
          created_at?: string
          created_by?: string | null
          email: string
          gst_number?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          rating?: number
          risk_score?: number
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          category?: string
          company_name?: string
          contact_person?: string
          created_at?: string
          created_by?: string | null
          email?: string
          gst_number?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          rating?: number
          risk_score?: number
          status?: Database["public"]["Enums"]["vendor_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_invited_vendor: {
        Args: { _rfq: string; _user: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "procurement_officer" | "manager" | "vendor"
      approval_decision: "pending" | "approved" | "rejected" | "sent_back"
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      po_status:
        | "draft"
        | "issued"
        | "accepted"
        | "in_progress"
        | "delivered"
        | "closed"
        | "cancelled"
      quotation_status: "submitted" | "shortlisted" | "awarded" | "rejected"
      rfq_status:
        | "draft"
        | "open"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
        | "completed"
      vendor_status: "active" | "inactive" | "blacklisted"
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
      app_role: ["admin", "procurement_officer", "manager", "vendor"],
      approval_decision: ["pending", "approved", "rejected", "sent_back"],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      po_status: [
        "draft",
        "issued",
        "accepted",
        "in_progress",
        "delivered",
        "closed",
        "cancelled",
      ],
      quotation_status: ["submitted", "shortlisted", "awarded", "rejected"],
      rfq_status: [
        "draft",
        "open",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "completed",
      ],
      vendor_status: ["active", "inactive", "blacklisted"],
    },
  },
} as const
