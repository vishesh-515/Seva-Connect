import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfYear } from "date-fns";
import { Download, Coins, Receipt, PackageCheck, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { PageHeader, StatCard, ErrorState } from "@/components/feedback/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCurrency,
  humanize,
  toCsv,
  downloadCsv,
  ELIGIBLE_DONATION_STATUSES,
  ELIGIBLE_EXPENSE_STATUSES,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Seva Connect" },
      {
        name: "description",
        content: "Donation, expense, assistance and beneficiary reports for your organization.",
      },
      { property: "og:title", content: "Reports — Seva Connect" },
      {
        property: "og:description",
        content: "Donation, expense, assistance and beneficiary reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type Group = { label: string; count: number; amount: number };
function group(
  rows: any[],
  key: (r: any) => string,
  amount: (r: any) => number = () => 0,
): Group[] {
  const m = new Map<string, Group>();
  for (const r of rows) {
    const k = key(r) || "Unspecified";
    const g = m.get(k) ?? { label: k, count: 0, amount: 0 };
    g.count++;
    g.amount += amount(r);
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.amount - a.amount || b.count - a.count);
}

function Page() {
  const { org, can } = useCurrentOrg();
  const [from, setFrom] = useState(format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const cur = org!.currency;
  const q = useQuery({
    queryKey: ["reports", org!.id, from, to],
    queryFn: async () => {
      const id = org!.id;
      const [d, e, a, b] = await Promise.all([
        can("donors.read")
          ? supabase
              .from("donations")
              .select(
                "amount, currency, status, donation_type, project:projects(name), donor:donors(name)",
              )
              .eq("organization_id", id)
              .gte("donation_date", from)
              .lte("donation_date", to)
              .in("status", [...ELIGIBLE_DONATION_STATUSES])
          : supabase
              .from("donations")
              .select("amount, currency, status, donation_type, project:projects(name)")
              .eq("organization_id", id)
              .gte("donation_date", from)
              .lte("donation_date", to)
              .in("status", [...ELIGIBLE_DONATION_STATUSES]),
        supabase
          .from("expenses")
          .select("amount, currency, category, project:projects(name)")
          .eq("organization_id", id)
          .gte("expense_date", from)
          .lte("expense_date", to)
          .in("status", [...ELIGIBLE_EXPENSE_STATUSES]),
        supabase
          .from("assistance_records")
          .select("assistance_type, estimated_value, beneficiary_id")
          .eq("organization_id", id)
          .gte("distribution_date", from)
          .lte("distribution_date", to)
          .neq("status", "cancelled"),
        supabase
          .from("beneficiaries")
          .select("support_category, status")
          .eq("organization_id", id)
          .gte("registration_date", from)
          .lte("registration_date", to),
      ]);
      for (const r of [d, e, a, b]) if (r.error) throw r.error;
      return {
        donations: (d.data ?? []) as any[],
        expenses: (e.data ?? []) as any[],
        assistance: (a.data ?? []) as any[],
        beneficiaries: (b.data ?? []) as any[],
      };
    },
  });

  const data = q.data;
  const inCur = (rows: any[]) => rows.filter((r) => r.currency === cur && r.amount != null);
  const sum = (rows: any[]) => inCur(rows).reduce((s, r) => s + Number(r.amount), 0);
  const sections = data
    ? [
        {
          title: "Donations by project",
          rows: group(
            inCur(data.donations),
            (r) => r.project?.name,
            (r) => Number(r.amount),
          ),
          money: true,
        },
        {
          title: "Donations by type",
          rows: group(
            inCur(data.donations),
            (r) => humanize(r.donation_type),
            (r) => Number(r.amount),
          ),
          money: true,
        },
        ...(can("donors.read")
          ? [
              {
                title: "Top donors",
                rows: group(
                  inCur(data.donations),
                  (r) => r.donor?.name ?? "Anonymous",
                  (r) => Number(r.amount),
                ).slice(0, 10),
                money: true,
              },
            ]
          : []),
        {
          title: "Expenses by category",
          rows: group(
            inCur(data.expenses),
            (r) => humanize(r.category),
            (r) => Number(r.amount),
          ),
          money: true,
        },
        {
          title: "Expenses by project",
          rows: group(
            inCur(data.expenses),
            (r) => r.project?.name,
            (r) => Number(r.amount),
          ),
          money: true,
        },
        {
          title: "Distributions by type",
          rows: group(
            data.assistance,
            (r) => humanize(r.assistance_type),
            (r) => Number(r.estimated_value ?? 0),
          ),
          money: true,
        },
        {
          title: "New beneficiaries by category",
          rows: group(data.beneficiaries, (r) => humanize(r.support_category)),
          money: false,
        },
      ]
    : [];

  const exportAll = () => {
    const rows = sections.flatMap((s) =>
      s.rows.map((r) => ({
        report: s.title,
        group: r.label,
        count: r.count,
        amount: s.money ? r.amount.toFixed(2) : "",
      })),
    );
    downloadCsv(
      `sevaconnect-report-${from}-to-${to}.csv`,
      toCsv(rows, [
        { key: "report", label: "Report" },
        { key: "group", label: "Group" },
        { key: "count", label: "Records" },
        { key: "amount", label: `Amount (${cur})` },
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Totals in ${cur}. Only recorded/confirmed donations and recorded/approved expenses are counted.`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()} className="no-print">
              Print
            </Button>
            <Button onClick={exportAll} disabled={!data} className="no-print">
              <Download className="mr-1 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      {q.isError ? (
        <ErrorState message="Couldn't load reports." onRetry={() => q.refetch()} />
      ) : !data ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Donations received"
              value={formatCurrency(sum(data.donations), cur)}
              icon={Coins}
              hint={`${data.donations.length} donations`}
            />
            <StatCard
              label="Expenses"
              value={formatCurrency(sum(data.expenses), cur)}
              icon={Receipt}
              hint={`Net ${formatCurrency(sum(data.donations) - sum(data.expenses), cur)}`}
            />
            <StatCard
              label="Distributions given"
              value={data.assistance.length}
              icon={PackageCheck}
              hint={`${new Set(data.assistance.map((a) => a.beneficiary_id)).size} people reached`}
            />
            <StatCard label="New beneficiaries" value={data.beneficiaries.length} icon={Users} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {sections.map((s) => (
              <div key={s.title} className="rounded-lg border bg-card p-4">
                <h3 className="mb-3 text-sm font-semibold">{s.title}</h3>
                {s.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      {s.rows.map((r) => (
                        <tr key={r.label} className="border-t first:border-0">
                          <td className="py-1.5">{r.label}</td>
                          <td className="py-1.5 text-right text-muted-foreground">{r.count}</td>
                          {s.money && (
                            <td className="py-1.5 text-right font-medium">
                              {formatCurrency(r.amount, cur)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
