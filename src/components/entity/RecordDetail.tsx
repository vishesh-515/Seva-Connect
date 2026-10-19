import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { formatDate, humanize } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DetailItem, ErrorState, StatusBadge } from "@/components/feedback/common";
import { EntityFormDialog } from "./EntityPage";
import type { EntityConfig, Row } from "./types";

export function useRecord(table: string, id: string, select = "*") {
  const { org } = useCurrentOrg();
  return useQuery({
    queryKey: ["org", org.id, table, "detail", id],
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select(select)
        .eq("id", id)
        .eq("organization_id", org.id)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });
}

export function useRelated(
  table: string,
  column: string,
  id: string,
  select = "*",
  order = "created_at",
) {
  const { org } = useCurrentOrg();
  return useQuery({
    queryKey: ["org", org.id, table, "related", column, id],
    queryFn: async () => {
      const { data, error } = await (supabase.from(table as any) as any)
        .select(select)
        .eq(column, id)
        .eq("organization_id", org.id)
        .order(order, { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E8DFD5] dark:border-[#2E1E19] bg-[#FAF7F2] dark:bg-[#160E0C] px-4 py-3.5">
        <h2 className="text-sm font-bold text-[#2A1D17] dark:text-[#FFFDFB] tracking-tight">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MiniTable({
  rows,
  cols,
  empty,
}: {
  rows: Row[] | undefined;
  cols: { label: string; render: (r: Row) => ReactNode }[];
  empty: string;
}) {
  if (!rows) return <Skeleton className="h-16 w-full bg-[#F0E8DC] dark:bg-[#281A15]" />;
  if (!rows.length) return <p className="text-xs text-[#7D6E63] dark:text-[#AFA196] py-3">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#E8DFD5] dark:border-[#2E1E19] text-left text-[11px] uppercase font-bold tracking-wider text-[#7D6E63] dark:text-[#AFA196]">
            {cols.map((c) => (
              <th key={c.label} className="py-2.5 pr-4 font-semibold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#EFE8DE] dark:divide-[#2E1E19]">
          {rows.map((r, i) => (
            <tr key={r["id"] ?? i} className="hover:bg-[#FAF7F2] dark:hover:bg-[#251914] transition-colors">
              {cols.map((c) => (
                <td key={c.label} className="py-3 pr-4 text-[#2A1D17] dark:text-[#FFFDFB]">
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecordDetail({
  config,
  id,
  back,
  titleKey,
  extraActions,
  children,
}: {
  config: EntityConfig;
  id: string;
  back: string;
  titleKey: string;
  extraActions?: (row: Row) => ReactNode;
  children?: (row: Row) => ReactNode;
}) {
  const { can } = useCurrentOrg();
  const q = useRecord(config.table, id, config.select);
  const [edit, setEdit] = useState(false);
  if (q.isLoading) return <Skeleton className="h-64 w-full bg-[#F0E8DC] dark:bg-[#281A15]" />;
  if (q.isError)
    return <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />;
  const row = q.data;
  if (!row)
    return <ErrorState message={`${config.singular} not found or you don't have access.`} />;
  const valueOf = (name: string, type: string) => {
    const v = row[name];
    if (v === null || v === undefined || v === "") return "—";
    if (type === "date") return formatDate(v);
    if (type === "relation")
      return (
        row[name.replace(/_id$/, "")]?.name ?? row[name.replace(/_id$/, "")]?.full_name ?? "Linked"
      );
    if (name === "status") return <StatusBadge status={v} />;
    return humanize(String(v)) === String(v) ? String(v) : String(v);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to={back as any}
            className="mb-1.5 inline-flex items-center text-xs font-medium text-[#7D6E63] dark:text-[#AFA196] hover:text-[#C87A38] dark:hover:text-[#E29555] transition-colors"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 text-[#C87A38] dark:text-[#E29555]" />
            Back to {config.title}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-[#2A1D17] dark:text-[#FFFDFB]">{row[titleKey]}</h1>
        </div>
        <div className="flex items-center gap-2">
          {extraActions?.(row)}
          {can(config.writePermission) && (
            <Button variant="outline" size="sm" onClick={() => setEdit(true)} className="rounded-full border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#221612] text-[#2A1D17] dark:text-[#FFFDFB] hover:bg-[#FAF7F2] dark:hover:bg-[#2C1D18] hover:border-[#C87A38] dark:hover:border-[#E29555]">
              <Pencil className="mr-1.5 h-3.5 w-3.5 text-[#C87A38] dark:text-[#E29555]" />
              Edit
            </Button>
          )}
        </div>
      </div>
      <Section title="Details">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.fields
            .filter(
              (f) =>
                !f.showIf ||
                f.showIf(
                  Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? "")])),
                ),
            )
            .map((f) => (
              <DetailItem
                key={f.name}
                label={f.label.replace(" *", "")}
                value={valueOf(f.name, f.type)}
              />
            ))}
          <DetailItem label="Created" value={formatDate(row["created_at"])} />
          <DetailItem label="Last updated" value={formatDate(row["updated_at"])} />
        </dl>
      </Section>
      {children?.(row)}
      <ActivityFor id={id} />
      <EntityFormDialog config={config} open={edit} onOpenChange={setEdit} row={row} />
    </div>
  );
}

function ActivityFor({ id }: { id: string }) {
  const q = useRelated("activity_logs", "entity_id", id);
  return (
    <Section title="Recent activity">
      <MiniTable
        rows={q.data}
        empty="No activity recorded yet."
        cols={[
          { label: "When", render: (r) => formatDate(r["created_at"], "d MMM yyyy, HH:mm") },
          { label: "Action", render: (r) => humanize(r["action"]) },
          { label: "Summary", render: (r) => r["summary"] ?? "—" },
        ]}
      />
    </Section>
  );
}
