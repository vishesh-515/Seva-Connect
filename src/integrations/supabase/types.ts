export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          changes: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          organization_id: string;
          summary: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          organization_id: string;
          summary?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          changes?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          organization_id?: string;
          summary?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      assistance_records: {
        Row: {
          assistance_type: string;
          beneficiary_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          distribution_date: string;
          estimated_value: number | null;
          id: string;
          notes: string | null;
          organization_id: string;
          project_id: string | null;
          quantity: number;
          reference: string;
          responsible_user_id: string | null;
          status: string;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          assistance_type?: string;
          beneficiary_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          distribution_date?: string;
          estimated_value?: number | null;
          id?: string;
          notes?: string | null;
          organization_id: string;
          project_id?: string | null;
          quantity?: number;
          reference?: string;
          responsible_user_id?: string | null;
          status?: string;
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assistance_type?: string;
          beneficiary_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          distribution_date?: string;
          estimated_value?: number | null;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          project_id?: string | null;
          quantity?: number;
          reference?: string;
          responsible_user_id?: string | null;
          status?: string;
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assistance_records_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            isOneToOne: false;
            referencedRelation: "beneficiaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assistance_records_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assistance_records_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      beneficiaries: {
        Row: {
          address: string | null;
          city: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          date_of_birth: string | null;
          email: string | null;
          full_name: string;
          gender: string | null;
          household_size: number | null;
          id: string;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          postal_code: string | null;
          region: string | null;
          registration_date: string;
          status: string;
          support_category: string;
          support_requirements: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          full_name: string;
          gender?: string | null;
          household_size?: number | null;
          id?: string;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          postal_code?: string | null;
          region?: string | null;
          registration_date?: string;
          status?: string;
          support_category?: string;
          support_requirements?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          date_of_birth?: string | null;
          email?: string | null;
          full_name?: string;
          gender?: string | null;
          household_size?: number | null;
          id?: string;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          postal_code?: string | null;
          region?: string | null;
          registration_date?: string;
          status?: string;
          support_category?: string;
          support_requirements?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "beneficiaries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      donations: {
        Row: {
          amount: number | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          donation_date: string;
          donation_type: string;
          donor_id: string | null;
          estimated_value: number | null;
          id: string;
          item_category: string | null;
          item_name: string | null;
          organization_id: string;
          payment_method: string | null;
          payment_reference: string | null;
          project_id: string | null;
          purpose: string | null;
          quantity: number | null;
          receipt_reference: string | null;
          reference: string;
          status: string;
          storage_notes: string | null;
          unit: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          amount?: number | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          donation_date?: string;
          donation_type?: string;
          donor_id?: string | null;
          estimated_value?: number | null;
          id?: string;
          item_category?: string | null;
          item_name?: string | null;
          organization_id: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          project_id?: string | null;
          purpose?: string | null;
          quantity?: number | null;
          receipt_reference?: string | null;
          reference?: string;
          status?: string;
          storage_notes?: string | null;
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          amount?: number | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          donation_date?: string;
          donation_type?: string;
          donor_id?: string | null;
          estimated_value?: number | null;
          id?: string;
          item_category?: string | null;
          item_name?: string | null;
          organization_id?: string;
          payment_method?: string | null;
          payment_reference?: string | null;
          project_id?: string | null;
          purpose?: string | null;
          quantity?: number | null;
          receipt_reference?: string | null;
          reference?: string;
          status?: string;
          storage_notes?: string | null;
          unit?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey";
            columns: ["donor_id"];
            isOneToOne: false;
            referencedRelation: "donors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "donations_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      donors: {
        Row: {
          address: string | null;
          created_at: string;
          created_by: string | null;
          donor_type: string;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          donor_type?: string;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          created_by?: string | null;
          donor_type?: string;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "donors_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          expense_date: string;
          id: string;
          organization_id: string;
          payment_method: string | null;
          project_id: string | null;
          receipt_path: string | null;
          receipt_reference: string | null;
          reference: string;
          status: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
          vendor: string | null;
        };
        Insert: {
          amount: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          expense_date?: string;
          id?: string;
          organization_id: string;
          payment_method?: string | null;
          project_id?: string | null;
          receipt_path?: string | null;
          receipt_reference?: string | null;
          reference?: string;
          status?: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
          vendor?: string | null;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          expense_date?: string;
          id?: string;
          organization_id?: string;
          payment_method?: string | null;
          project_id?: string | null;
          receipt_path?: string | null;
          receipt_reference?: string | null;
          reference?: string;
          status?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
          vendor?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expenses_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          invited_by: string | null;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          invited_by?: string | null;
          organization_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          invited_by?: string | null;
          organization_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          organization_id: string | null;
          read_at: string | null;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          organization_id?: string | null;
          read_at?: string | null;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          organization_id?: string | null;
          read_at?: string | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_members: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["org_role"];
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["org_role"];
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          address: string | null;
          contact_email: string;
          country: string;
          created_at: string;
          created_by: string | null;
          currency: string;
          date_format: string;
          id: string;
          logo_url: string | null;
          name: string;
          org_type: string;
          phone: string | null;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          contact_email: string;
          country?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          date_format?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          org_type?: string;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          contact_email?: string;
          country?: string;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          date_format?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          org_type?: string;
          phone?: string | null;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          job_title: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          job_title?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_beneficiaries: {
        Row: {
          beneficiary_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          organization_id: string;
          project_id: string;
          updated_at: string;
        };
        Insert: {
          beneficiary_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id: string;
          project_id: string;
          updated_at?: string;
        };
        Update: {
          beneficiary_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id?: string;
          project_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_beneficiaries_beneficiary_id_fkey";
            columns: ["beneficiary_id"];
            isOneToOne: false;
            referencedRelation: "beneficiaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_beneficiaries_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_beneficiaries_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
        ];
      };
      project_members: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          organization_id: string;
          project_id: string;
          role: string;
          updated_at: string;
          user_id: string | null;
          volunteer_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id: string;
          project_id: string;
          role?: string;
          updated_at?: string;
          user_id?: string | null;
          volunteer_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id?: string;
          project_id?: string;
          role?: string;
          updated_at?: string;
          user_id?: string | null;
          volunteer_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_members_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_members_volunteer_id_fkey";
            columns: ["volunteer_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
        ];
      };
      projects: {
        Row: {
          budget: number | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          description: string | null;
          end_date: string | null;
          id: string;
          location: string | null;
          manager_id: string | null;
          manual_progress: number | null;
          name: string;
          objectives: string | null;
          organization_id: string;
          start_date: string | null;
          status: string;
          target_beneficiaries: number | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          budget?: number | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          location?: string | null;
          manager_id?: string | null;
          manual_progress?: number | null;
          name: string;
          objectives?: string | null;
          organization_id: string;
          start_date?: string | null;
          status?: string;
          target_beneficiaries?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          budget?: number | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          description?: string | null;
          end_date?: string | null;
          id?: string;
          location?: string | null;
          manager_id?: string | null;
          manual_progress?: number | null;
          name?: string;
          objectives?: string | null;
          organization_id?: string;
          start_date?: string | null;
          status?: string;
          target_beneficiaries?: number | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      volunteer_hours: {
        Row: {
          activity_date: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          hours: number;
          id: string;
          organization_id: string;
          project_id: string | null;
          updated_at: string;
          volunteer_id: string;
        };
        Insert: {
          activity_date?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          hours: number;
          id?: string;
          organization_id: string;
          project_id?: string | null;
          updated_at?: string;
          volunteer_id: string;
        };
        Update: {
          activity_date?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          hours?: number;
          id?: string;
          organization_id?: string;
          project_id?: string | null;
          updated_at?: string;
          volunteer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "volunteer_hours_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volunteer_hours_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "volunteer_hours_volunteer_id_fkey";
            columns: ["volunteer_id"];
            isOneToOne: false;
            referencedRelation: "volunteers";
            referencedColumns: ["id"];
          },
        ];
      };
      volunteers: {
        Row: {
          address: string | null;
          availability: string | null;
          created_at: string;
          created_by: string | null;
          email: string | null;
          full_name: string;
          id: string;
          interests: string | null;
          joining_date: string;
          notes: string | null;
          organization_id: string;
          phone: string | null;
          skills: string | null;
          status: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          address?: string | null;
          availability?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          interests?: string | null;
          joining_date?: string;
          notes?: string | null;
          organization_id: string;
          phone?: string | null;
          skills?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          address?: string | null;
          availability?: string | null;
          created_at?: string;
          created_by?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          interests?: string | null;
          joining_date?: string;
          notes?: string | null;
          organization_id?: string;
          phone?: string | null;
          skills?: string | null;
          status?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "volunteers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_pending_invitations: { Args: never; Returns: number };
      create_organization: {
        Args: {
          _address: string;
          _contact_email: string;
          _country: string;
          _currency: string;
          _name: string;
          _org_type: string;
          _phone: string;
        };
        Returns: string;
      };
      dashboard_summary: {
        Args: { _from: string; _org: string; _to: string };
        Returns: Json;
      };
      has_org_role: {
        Args: {
          _org: string;
          _roles: Database["public"]["Enums"]["org_role"][];
        };
        Returns: boolean;
      };
      is_org_member: { Args: { _org: string }; Returns: boolean };
      org_members_directory: {
        Args: { _org: string };
        Returns: {
          email: string;
          full_name: string;
          joined_at: string;
          member_id: string;
          role: Database["public"]["Enums"]["org_role"];
          status: string;
          user_id: string;
        }[];
      };
      org_role_of: {
        Args: { _org: string };
        Returns: Database["public"]["Enums"]["org_role"];
      };
      project_spend: {
        Args: { _org: string };
        Returns: {
          currency: string;
          project_id: string;
          spent: number;
        }[];
      };
    };
    Enums: {
      org_role: "owner" | "admin" | "staff" | "project_manager" | "viewer";
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
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
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
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
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
      org_role: ["owner", "admin", "staff", "project_manager", "viewer"],
    },
  },
} as const;
