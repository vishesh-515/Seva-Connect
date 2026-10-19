import {
  Users,
  HandHeart,
  HeartHandshake,
  Coins,
  FolderKanban,
  PackageCheck,
  Receipt,
  Printer,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/feedback/common";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { EntityConfig, Option } from "@/components/entity/types";
import { formatCurrency, formatDate, humanize } from "./format";
import { printAcknowledgment } from "./acknowledgment";
import { ReceiptCell } from "@/components/ReceiptCell";
import { assessUrgency } from "./prioritization";

const opts = (...v: string[]): Option[] => v.map((x) => ({ value: x, label: humanize(x) }));
const today = () => new Date().toISOString().slice(0, 10);

export const SUPPORT_CATEGORIES = opts(
  "Food",
  "Clothing",
  "Education",
  "Healthcare",
  "Financial assistance",
  "Shelter",
  "Other",
);
export const EXPENSE_CATEGORIES = opts(
  "Operations",
  "Salaries",
  "Transportation",
  "Food and supplies",
  "Healthcare",
  "Education",
  "Infrastructure",
  "Administration",
  "Other",
);
export const PAYMENT_METHODS = opts("cash", "bank_transfer", "upi", "cheque", "card", "other");

export const beneficiariesConfig: EntityConfig = {
  key: "beneficiaries",
  detailPath: (r) => `/beneficiaries/${r["id"]}`,
  table: "beneficiaries",
  title: "Beneficiaries",
  singular: "Beneficiary",
  description: "People and households your organization supports.",
  icon: Users,
  select: "*",
  searchColumns: ["full_name", "code", "phone", "email"],
  dateFilter: "registration_date",
  defaultSort: { column: "created_at", ascending: false },
  writePermission: "beneficiaries.write",
  archiveStatus: "archived",
  columns: [
    {
      key: "full_name",
      label: "Name",
      sortable: true,
      render: (r) => (
        <span>
          {r["full_name"]}
          <span className="ml-2 font-mono text-xs text-muted-foreground">{r["code"]}</span>
        </span>
      ),
    },
    {
      key: "urgency",
      label: "Priority",
      render: (r) => {
        const u = assessUrgency(r);
        return (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${u.badgeClass}`}
            title={u.reasons.join(" • ")}
          >
            {u.level === "critical" && (
              <AlertTriangle className="h-3 w-3 shrink-0 animate-pulse text-destructive" />
            )}
            {u.level === "high" && <AlertCircle className="h-3 w-3 shrink-0 text-amber-500" />}
            {u.label}
          </span>
        );
      },
    },
    {
      key: "phone",
      label: "Contact",
      render: (r) => (
        <span className="text-muted-foreground">{r["phone"] || r["email"] || "—"}</span>
      ),
    },
    {
      key: "city",
      label: "Location",
      sortable: true,
      render: (r) => [r["city"], r["region"]].filter(Boolean).join(", ") || "—",
    },
    { key: "support_category", label: "Category", sortable: true },
    {
      key: "registration_date",
      label: "Registered",
      sortable: true,
      render: (r) => formatDate(r["registration_date"]),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => <StatusBadge status={r["status"]} />,
    },
  ],
  filters: [
    {
      name: "status",
      label: "Status",
      options: opts("active", "inactive", "graduated", "archived"),
    },
    { name: "support_category", label: "Category", options: SUPPORT_CATEGORIES },
  ],
  fields: [
    { name: "full_name", label: "Full name", type: "text", required: true },
    { name: "date_of_birth", label: "Date of birth", type: "date" },
    {
      name: "gender",
      label: "Gender",
      type: "select",
      options: opts("female", "male", "other", "prefer_not_to_say"),
    },
    { name: "phone", label: "Phone", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "address", label: "Address", type: "text", required: true },
    { name: "city", label: "City / district", type: "text", required: true },
    { name: "region", label: "State / region", type: "text", required: true },
    { name: "postal_code", label: "Postal code", type: "text" },
    { name: "household_size", label: "Household size", type: "number" },
    {
      name: "support_category",
      label: "Support category",
      type: "select",
      options: SUPPORT_CATEGORIES,
      required: true,
    },
    { name: "registration_date", label: "Registration date", type: "date", required: true },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("active", "inactive", "graduated", "archived"),
      required: true,
    },
    {
      name: "support_requirements",
      label: "Support requirements",
      type: "textarea",
      required: true,
    },
    {
      name: "notes",
      label: "Internal notes",
      type: "textarea",
      help: "Visible to organization members only. Avoid sensitive personal data.",
    },
  ],
  defaults: () => ({ registration_date: today(), status: "active", support_category: "Food" }),
  validate: (v) =>
    v["date_of_birth"] && v["date_of_birth"] > today()
      ? { date_of_birth: "Date of birth cannot be in the future" }
      : {},
  beforeCreate: async (v, orgId) => {
    const ors = [`full_name.ilike.${v["full_name"]!.replace(/[%,()*]/g, "")}`];
    if (v["phone"]) ors.push(`phone.eq.${v["phone"].replace(/[,()]/g, "")}`);
    if (v["email"]) ors.push(`email.ilike.${v["email"].replace(/[,()%]/g, "")}`);
    const { data } = await supabase
      .from("beneficiaries")
      .select("code, full_name, phone")
      .eq("organization_id", orgId)
      .or(ors.join(","))
      .limit(5);
    if (!data?.length) return null;
    return (
      `Possible duplicate${data.length > 1 ? "s" : ""} found:\n` +
      data.map((d) => `• ${d.full_name} (${d.code}${d.phone ? `, ${d.phone}` : ""})`).join("\n") +
      "\n\nRecords are never merged automatically. Save anyway?"
    );
  },
  csvMap: (r) => ({ ...r, urgency: assessUrgency(r).label }),
  csv: [
    { key: "code", label: "ID" },
    { key: "full_name", label: "Name" },
    { key: "urgency", label: "Urgency" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "region", label: "Region" },
    { key: "support_category", label: "Category" },
    { key: "registration_date", label: "Registered" },
    { key: "status", label: "Status" },
  ],
};

export const volunteersConfig: EntityConfig = {
  key: "volunteers",
  detailPath: (r) => `/volunteers/${r["id"]}`,
  table: "volunteers",
  title: "Volunteers",
  singular: "Volunteer",
  description: "Your volunteer network, availability and participation.",
  icon: HandHeart,
  select: "*",
  searchColumns: ["full_name", "email", "phone", "skills"],
  defaultSort: { column: "created_at", ascending: false },
  writePermission: "volunteers.write",
  archiveStatus: "archived",
  columns: [
    { key: "full_name", label: "Name", sortable: true },
    {
      key: "email",
      label: "Contact",
      render: (r) => (
        <span className="text-muted-foreground">{r["email"] || r["phone"] || "—"}</span>
      ),
    },
    { key: "skills", label: "Skills" },
    { key: "availability", label: "Availability" },
    {
      key: "joining_date",
      label: "Joined",
      sortable: true,
      render: (r) => formatDate(r["joining_date"]),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => <StatusBadge status={r["status"]} />,
    },
  ],
  filters: [{ name: "status", label: "Status", options: opts("active", "inactive", "archived") }],
  fields: [
    { name: "full_name", label: "Full name", type: "text", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "text", required: true },
    { name: "joining_date", label: "Joining date", type: "date", required: true },
    {
      name: "skills",
      label: "Skills",
      type: "text",
      placeholder: "Teaching, first aid, logistics",
    },
    { name: "interests", label: "Areas of interest", type: "text" },
    {
      name: "availability",
      label: "Availability",
      type: "text",
      placeholder: "Weekends, evenings",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("active", "inactive", "archived"),
      required: true,
    },
    { name: "address", label: "Address", type: "text", full: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  defaults: () => ({ joining_date: today(), status: "active" }),
  csv: [
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "skills", label: "Skills" },
    { key: "availability", label: "Availability" },
    { key: "joining_date", label: "Joined" },
    { key: "status", label: "Status" },
  ],
};

export const donorsConfig: EntityConfig = {
  key: "donors",
  detailPath: (r) => `/donors/${r["id"]}`,
  table: "donors",
  title: "Donors",
  singular: "Donor",
  description: "Individuals and organizations who support your work.",
  icon: HeartHandshake,
  select: "*",
  searchColumns: ["name", "email", "phone"],
  defaultSort: { column: "created_at", ascending: false },
  writePermission: "donors.write",
  archiveStatus: "archived",
  columns: [
    { key: "name", label: "Name", sortable: true },
    { key: "donor_type", label: "Type", render: (r) => humanize(r["donor_type"]) },
    {
      key: "email",
      label: "Email",
      render: (r) => <span className="text-muted-foreground">{r["email"] || "—"}</span>,
    },
    { key: "phone", label: "Phone" },
    {
      key: "created_at",
      label: "Added",
      sortable: true,
      render: (r) => formatDate(r["created_at"]),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r["status"]} /> },
  ],
  filters: [
    { name: "donor_type", label: "Type", options: opts("individual", "organization") },
    { name: "status", label: "Status", options: opts("active", "archived") },
  ],
  fields: [
    {
      name: "donor_type",
      label: "Donor type",
      type: "select",
      options: opts("individual", "organization"),
      required: true,
    },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "text" },
    { name: "address", label: "Address", type: "text", full: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  defaults: () => ({ donor_type: "individual" }),
  csv: [
    { key: "name", label: "Name" },
    { key: "donor_type", label: "Type" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
  ],
};

const isMoney = (v: Record<string, string>) => v["donation_type"] !== "in_kind";
const isKind = (v: Record<string, string>) => v["donation_type"] === "in_kind";

export const donationsConfig: EntityConfig = {
  key: "donations",
  table: "donations",
  title: "Donations",
  singular: "Donation",
  description:
    "Monetary and in-kind contributions. A recorded donation is not a confirmed payment until marked confirmed.",
  icon: Coins,
  select: "*, donor:donors(name), project:projects(name)",
  searchColumns: ["reference", "item_name", "purpose", "payment_reference"],
  dateFilter: "donation_date",
  defaultSort: { column: "donation_date", ascending: false },
  writePermission: "donations.write",
  archiveStatus: "cancelled",
  columns: [
    {
      key: "reference",
      label: "Reference",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r["reference"]}</span>,
    },
    { key: "donation_type", label: "Type", render: (r) => humanize(r["donation_type"]) },
    {
      key: "donor",
      label: "Donor",
      render: (r) => r["donor"]?.name ?? <span className="text-muted-foreground">Anonymous</span>,
    },
    {
      key: "amount",
      label: "Amount / items",
      sortable: true,
      className: "text-right",
      render: (r) =>
        r["donation_type"] === "monetary"
          ? formatCurrency(r["amount"], r["currency"])
          : `${r["quantity"]} ${r["unit"] ?? ""} ${r["item_name"]}`,
    },
    { key: "project", label: "Project", render: (r) => r["project"]?.name ?? "—" },
    {
      key: "donation_date",
      label: "Date",
      sortable: true,
      render: (r) => formatDate(r["donation_date"]),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => <StatusBadge status={r["status"]} />,
    },
  ],
  filters: [
    { name: "donation_type", label: "Type", options: opts("monetary", "in_kind") },
    {
      name: "status",
      label: "Status",
      options: opts("recorded", "confirmed", "cancelled", "refunded"),
    },
  ],
  fields: [
    {
      name: "donation_type",
      label: "Donation type",
      type: "select",
      options: opts("monetary", "in_kind"),
      required: true,
    },
    { name: "donation_date", label: "Date received", type: "date", required: true },
    {
      name: "donor_id",
      label: "Donor",
      type: "relation",
      relation: { table: "donors", label: "name" },
      help: "Leave empty for anonymous donations.",
    },
    {
      name: "project_id",
      label: "Designated project",
      type: "relation",
      relation: { table: "projects", label: "name" },
    },
    { name: "amount", label: "Amount", type: "number", required: true, showIf: isMoney },
    {
      name: "currency",
      label: "Currency (ISO code)",
      type: "text",
      required: true,
      showIf: isMoney,
    },
    {
      name: "payment_method",
      label: "Payment method",
      type: "select",
      options: PAYMENT_METHODS,
      showIf: isMoney,
    },
    { name: "payment_reference", label: "Payment reference", type: "text", showIf: isMoney },
    { name: "receipt_reference", label: "Receipt reference", type: "text", showIf: isMoney },
    { name: "item_name", label: "Item name", type: "text", required: true, showIf: isKind },
    {
      name: "item_category",
      label: "Item category",
      type: "select",
      options: opts("Food", "Clothing", "Books", "Medical supplies", "Other"),
      showIf: isKind,
    },
    { name: "quantity", label: "Quantity", type: "number", required: true, showIf: isKind },
    { name: "unit", label: "Unit", type: "text", placeholder: "kg, boxes, pieces", showIf: isKind },
    { name: "estimated_value", label: "Estimated value", type: "number", showIf: isKind },
    { name: "purpose", label: "Purpose / category", type: "text" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("recorded", "confirmed", "cancelled", "refunded"),
      required: true,
      help: "Mark confirmed only once funds are verified as received.",
    },
    {
      name: "storage_notes",
      label: "Storage / allocation notes",
      type: "textarea",
      showIf: isKind,
    },
    { name: "description", label: "Description", type: "textarea" },
  ],
  defaults: (org) => ({
    donation_type: "monetary",
    donation_date: today(),
    currency: org.currency,
    status: "recorded",
  }),
  validate: (v) => {
    const e: Record<string, string> = {};
    if (isMoney(v) && v["amount"] && Number(v["amount"]) <= 0)
      e["amount"] = "Amount must be greater than zero";
    if (isMoney(v) && v["currency"] && !/^[A-Za-z]{3}$/.test(v["currency"]))
      e["currency"] = "Use a 3-letter code like INR";
    if (isKind(v) && v["quantity"] && Number(v["quantity"]) <= 0)
      e["quantity"] = "Quantity must be greater than zero";
    return e;
  },
  csvMap: (r) => ({
    ...r,
    donor: r["donor"]?.name ?? "Anonymous",
    project: r["project"]?.name ?? "",
  }),
  csv: [
    { key: "reference", label: "Reference" },
    { key: "donation_type", label: "Type" },
    { key: "donor", label: "Donor" },
    { key: "amount", label: "Amount" },
    { key: "currency", label: "Currency" },
    { key: "item_name", label: "Item" },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "project", label: "Project" },
    { key: "donation_date", label: "Date" },
    { key: "status", label: "Status" },
  ],
  rowActions: (r, org) => (
    <DropdownMenuItem onClick={() => printAcknowledgment(r, org)}>
      <Printer className="mr-2 h-4 w-4" /> Print acknowledgment
    </DropdownMenuItem>
  ),
};

export const projectsConfig: EntityConfig = {
  key: "projects",
  detailPath: (r) => `/projects/${r["id"]}`,
  table: "projects",
  title: "Support Programmes",
  singular: "Programme",
  description: "Community support programmes, targets, budgets, and beneficiary capacity.",
  icon: FolderKanban,
  select: "*",
  searchColumns: ["name", "location"],
  defaultSort: { column: "created_at", ascending: false },
  writePermission: "projects.write",
  archiveStatus: "cancelled",
  columns: [
    { key: "name", label: "Project", sortable: true },
    { key: "location", label: "Location" },
    {
      key: "start_date",
      label: "Start",
      sortable: true,
      render: (r) => formatDate(r["start_date"]),
    },
    { key: "end_date", label: "End", sortable: true, render: (r) => formatDate(r["end_date"]) },
    {
      key: "budget",
      label: "Budget",
      sortable: true,
      className: "text-right",
      render: (r) => (r["budget"] != null ? formatCurrency(r["budget"], r["currency"]) : "—"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (r) => <StatusBadge status={r["status"]} />,
    },
  ],
  filters: [
    {
      name: "status",
      label: "Status",
      options: opts("planned", "active", "on_hold", "completed", "cancelled"),
    },
  ],
  fields: [
    { name: "name", label: "Project name", type: "text", required: true, full: true },
    { name: "start_date", label: "Start date", type: "date", required: true },
    { name: "end_date", label: "End date", type: "date" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("planned", "active", "on_hold", "completed", "cancelled"),
      required: true,
    },
    { name: "location", label: "Location", type: "text" },
    { name: "budget", label: "Budget amount", type: "number" },
    { name: "currency", label: "Currency (ISO code)", type: "text", required: true },
    { name: "target_beneficiaries", label: "Target beneficiaries", type: "number" },
    {
      name: "manual_progress",
      label: "Manual progress (%)",
      type: "number",
      help: "Manually estimated — not derived from milestones.",
    },
    { name: "description", label: "Description", type: "textarea" },
    { name: "objectives", label: "Objectives", type: "textarea" },
  ],
  defaults: (org) => ({ status: "planned", currency: org.currency, start_date: today() }),
  validate: (v) => {
    const e: Record<string, string> = {};
    if (v["start_date"] && v["end_date"] && v["end_date"] < v["start_date"])
      e["end_date"] = "End date must be on or after the start date";
    if (v["manual_progress"] && Number(v["manual_progress"]) > 100)
      e["manual_progress"] = "Must be between 0 and 100";
    if (v["currency"] && !/^[A-Za-z]{3}$/.test(v["currency"]))
      e["currency"] = "Use a 3-letter code like INR";
    return e;
  },
  csv: [
    { key: "name", label: "Project" },
    { key: "status", label: "Status" },
    { key: "start_date", label: "Start" },
    { key: "end_date", label: "End" },
    { key: "budget", label: "Budget" },
    { key: "currency", label: "Currency" },
    { key: "location", label: "Location" },
  ],
};

export const assistanceConfig: EntityConfig = {
  key: "assistance",
  table: "assistance_records",
  title: "Distributions",
  singular: "Distribution",
  description: "Support delivered to beneficiaries. Corrections keep a full audit trail.",
  icon: PackageCheck,
  select: "*, beneficiary:beneficiaries(full_name, code), project:projects(name)",
  searchColumns: ["reference", "description", "assistance_type"],
  dateFilter: "distribution_date",
  defaultSort: { column: "distribution_date", ascending: false },
  writePermission: "assistance.write",
  archiveStatus: "cancelled",
  columns: [
    {
      key: "reference",
      label: "Reference",
      sortable: true,
      render: (r) => <span className="font-mono text-xs">{r["reference"]}</span>,
    },
    { key: "beneficiary", label: "Beneficiary", render: (r) => r["beneficiary"]?.full_name ?? "—" },
    { key: "assistance_type", label: "Type", sortable: true },
    { key: "quantity", label: "Quantity", render: (r) => `${r["quantity"]} ${r["unit"] ?? ""}` },
    { key: "project", label: "Project", render: (r) => r["project"]?.name ?? "—" },
    {
      key: "distribution_date",
      label: "Date",
      sortable: true,
      render: (r) => formatDate(r["distribution_date"]),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r["status"]} /> },
  ],
  filters: [
    { name: "assistance_type", label: "Type", options: SUPPORT_CATEGORIES },
    {
      name: "status",
      label: "Status",
      options: opts("planned", "distributed", "cancelled", "corrected"),
    },
  ],
  fields: [
    {
      name: "beneficiary_id",
      label: "Beneficiary",
      type: "relation",
      required: true,
      relation: {
        table: "beneficiaries",
        label: "full_name",
        filter: { column: "status", value: "archived" },
      },
    },
    {
      name: "project_id",
      label: "Project",
      type: "relation",
      relation: { table: "projects", label: "name" },
    },
    {
      name: "assistance_type",
      label: "Assistance type",
      type: "select",
      options: SUPPORT_CATEGORIES,
      required: true,
    },
    { name: "distribution_date", label: "Distribution date", type: "date", required: true },
    { name: "quantity", label: "Quantity", type: "number", required: true },
    { name: "unit", label: "Unit", type: "text" },
    { name: "estimated_value", label: "Estimated value", type: "number" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("planned", "distributed", "cancelled", "corrected"),
      required: true,
    },
    { name: "description", label: "Description", type: "textarea", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
  defaults: () => ({
    distribution_date: today(),
    quantity: "1",
    status: "distributed",
    assistance_type: "Food",
  }),
  validate: (v) =>
    v["quantity"] && Number(v["quantity"]) <= 0
      ? { quantity: "Quantity must be greater than zero" }
      : {},
  confirmCreate: (v) =>
    `You are about to record ${v["quantity"]} ${v["unit"] ?? ""} of ${v["assistance_type"]} assistance dated ${v["distribution_date"]}. This becomes part of the beneficiary's history.`,
  csvMap: (r) => ({
    ...r,
    beneficiary: r["beneficiary"]?.full_name ?? "",
    beneficiary_code: r["beneficiary"]?.code ?? "",
    project: r["project"]?.name ?? "",
  }),
  csv: [
    { key: "reference", label: "Reference" },
    { key: "beneficiary_code", label: "Beneficiary ID" },
    { key: "beneficiary", label: "Beneficiary" },
    { key: "assistance_type", label: "Type" },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "estimated_value", label: "Est. value" },
    { key: "project", label: "Project" },
    { key: "distribution_date", label: "Date" },
    { key: "status", label: "Status" },
  ],
};

export const expensesConfig: EntityConfig = {
  key: "expenses",
  table: "expenses",
  title: "Expenses",
  singular: "Expense",
  description:
    "Recorded spending. Records here are not independently audited and don't move money.",
  icon: Receipt,
  select: "*, project:projects(name)",
  searchColumns: ["reference", "title", "vendor"],
  dateFilter: "expense_date",
  defaultSort: { column: "expense_date", ascending: false },
  writePermission: "expenses.write",
  archiveStatus: "cancelled",
  columns: [
    {
      key: "title",
      label: "Expense",
      sortable: true,
      render: (r) => (
        <span>
          {r["title"]}
          <span className="ml-2 font-mono text-xs text-muted-foreground">{r["reference"]}</span>
        </span>
      ),
    },
    { key: "category", label: "Category", sortable: true },
    { key: "vendor", label: "Payee" },
    { key: "project", label: "Project", render: (r) => r["project"]?.name ?? "—" },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      className: "text-right",
      render: (r) => formatCurrency(r["amount"], r["currency"]),
    },
    {
      key: "expense_date",
      label: "Date",
      sortable: true,
      render: (r) => formatDate(r["expense_date"]),
    },
    { key: "status", label: "Status", render: (r) => <StatusBadge status={r["status"]} /> },
    { key: "receipt_path", label: "Receipt", render: (r) => <ReceiptCell row={r} /> },
  ],
  filters: [
    { name: "category", label: "Category", options: EXPENSE_CATEGORIES },
    {
      name: "status",
      label: "Status",
      options: opts("recorded", "approved", "rejected", "cancelled"),
    },
  ],
  fields: [
    { name: "title", label: "Title", type: "text", required: true, full: true },
    { name: "amount", label: "Amount", type: "number", required: true },
    { name: "currency", label: "Currency (ISO code)", type: "text", required: true },
    {
      name: "category",
      label: "Category",
      type: "select",
      options: EXPENSE_CATEGORIES,
      required: true,
    },
    { name: "expense_date", label: "Expense date", type: "date", required: true },
    {
      name: "project_id",
      label: "Project",
      type: "relation",
      relation: { table: "projects", label: "name" },
    },
    { name: "payment_method", label: "Payment method", type: "select", options: PAYMENT_METHODS },
    { name: "vendor", label: "Vendor / payee", type: "text" },
    { name: "receipt_reference", label: "Receipt reference", type: "text" },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: opts("recorded", "approved", "rejected", "cancelled"),
      required: true,
      help: "Recorded → Approved or Rejected. Cancelled records are excluded from totals.",
    },
    { name: "description", label: "Description", type: "textarea" },
  ],
  defaults: (org) => ({
    currency: org.currency,
    expense_date: today(),
    status: "recorded",
    category: "Operations",
  }),
  validate: (v) => {
    const e: Record<string, string> = {};
    if (v["amount"] && Number(v["amount"]) <= 0) e["amount"] = "Amount must be greater than zero";
    if (v["currency"] && !/^[A-Za-z]{3}$/.test(v["currency"]))
      e["currency"] = "Use a 3-letter code like INR";
    return e;
  },
  csvMap: (r) => ({ ...r, project: r["project"]?.name ?? "" }),
  csv: [
    { key: "reference", label: "Reference" },
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "vendor", label: "Payee" },
    { key: "amount", label: "Amount" },
    { key: "currency", label: "Currency" },
    { key: "project", label: "Project" },
    { key: "expense_date", label: "Date" },
    { key: "status", label: "Status" },
  ],
};
