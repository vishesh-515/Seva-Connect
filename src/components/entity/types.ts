import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/permissions";
import type { Organization } from "@/lib/org-context";

export type Row = Record<string, any>;

export type Option = { value: string; label: string };

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "date" | "number" | "select" | "relation";
  options?: Option[];
  relation?: { table: string; label: string; filter?: { column: string; value: string } };
  required?: boolean;
  placeholder?: string;
  full?: boolean;
  help?: string;
  showIf?: (values: Record<string, string>) => boolean;
};

export type ColumnDef = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (row: Row, org: Organization) => ReactNode;
};

export type EntityConfig = {
  key: string;
  table: string;
  title: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  select: string;
  searchColumns: string[];
  columns: ColumnDef[];
  fields: FieldDef[];
  filters?: { name: string; label: string; options: Option[] }[];
  dateFilter?: string;
  defaultSort: { column: string; ascending: boolean };
  writePermission: Permission;
  detailPath?: (row: Row) => string;
  archiveStatus?: string;
  defaults?: (org: Organization) => Record<string, string>;
  validate?: (values: Record<string, string>) => Record<string, string>;
  /** Return a warning to confirm before creating (e.g. duplicates). */
  beforeCreate?: (values: Record<string, string>, orgId: string) => Promise<string | null>;
  confirmCreate?: (values: Record<string, string>) => string;
  csv: { key: string; label: string }[];
  csvMap?: (row: Row) => Row;
  rowActions?: (row: Row, org: Organization) => ReactNode;
};
