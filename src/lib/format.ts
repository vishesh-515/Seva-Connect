import { format, parseISO, isValid } from "date-fns";

export function formatCurrency(amount: number | string | null | undefined, currency = "INR") {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n || 0);
  } catch {
    return `${currency} ${(n || 0).toFixed(2)}`;
  }
}

let activeDateFormat = "dd MMM yyyy";

export function setGlobalDateFormat(pattern: string | null | undefined) {
  if (pattern && pattern.trim()) {
    activeDateFormat = pattern.trim();
  }
}

export function formatDate(value: string | null | undefined, pattern?: string) {
  if (!value) return "—";
  const d = parseISO(value);
  if (!isValid(d)) return "—";
  try {
    return format(d, pattern || activeDateFormat);
  } catch {
    return format(d, "dd MMM yyyy");
  }
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Escape a CSV cell and neutralise spreadsheet-formula prefixes (CSV injection). */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const head = columns.map((c) => csvCell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Sum amounts grouped by currency — never mixes currencies. */
export function sumByCurrency(rows: { amount: number | string | null; currency: string }[]) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.amount == null) continue;
    out[r.currency] = (out[r.currency] ?? 0) + Number(r.amount);
  }
  return out;
}

export const ELIGIBLE_DONATION_STATUSES = ["recorded", "confirmed"] as const;
export const ELIGIBLE_EXPENSE_STATUSES = ["recorded", "approved"] as const;

export function budgetUtilization(budget: number | null | undefined, spent: number) {
  if (!budget || budget <= 0) return null;
  return {
    pct: Math.min(100, Math.round((spent / budget) * 100)),
    remaining: budget - spent,
    over: spent > budget,
  };
}
