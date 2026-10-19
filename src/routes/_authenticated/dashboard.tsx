import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  HandHeart,
  Coins,
  Receipt,
  FolderKanban,
  PackageCheck,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  UserPlus,
  HeartHandshake,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { formatCurrency, formatDate, humanize } from "@/lib/format";
import { PageHeader, StatCard, ErrorState } from "@/components/feedback/common";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assessUrgency } from "@/lib/prioritization";
import type { Row } from "@/components/entity/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview — Seva Connect" },
      {
        name: "description",
        content: "Your NGO operations, urgent cases and assistance at a glance.",
      },
      { property: "og:title", content: "Overview — Seva Connect" },
      { property: "og:description", content: "Your NGO operations at a glance." },
    ],
  }),
  component: Dashboard,
});

type Summary = {
  beneficiaries: number;
  active_volunteers: number;
  active_projects: number;
  assistance_this_month: number;
  donations_by_currency: { currency: string; total: number }[];
  expenses_by_currency: { currency: string; total: number }[];
  monthly: { month: string; donations: number; expenses: number; beneficiaries: number }[];
};

const money = (list: { currency: string; total: number }[], fallback: string) =>
  list.length
    ? list.map((x) => formatCurrency(x.total, x.currency)).join(" · ")
    : formatCurrency(0, fallback);

function Dashboard() {
  const { org, can } = useCurrentOrg();
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);

  const q = useQuery({
    queryKey: ["org", org.id, "dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_summary", {
        _org: org.id,
        _from: from.toISOString().slice(0, 10),
        _to: to.toISOString().slice(0, 10),
      });
      if (error) throw error;
      return data as unknown as Summary;
    },
  });

  const logs = useQuery({
    queryKey: ["org", org.id, "activity"],
    queryFn: async () =>
      (
        await supabase
          .from("activity_logs")
          .select("*")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false })
          .limit(8)
      ).data ?? [],
  });

  // Query beneficiaries to evaluate urgent cases needing prioritization
  const urgentCasesQuery = useQuery({
    queryKey: ["org", org.id, "urgent-cases-preview"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      return rows
        .map((b) => ({ beneficiary: b, assessment: assessUrgency(b) }))
        .filter((item) => item.assessment.level === "critical" || item.assessment.level === "high")
        .sort((a, b) => b.assessment.score - a.assessment.score)
        .slice(0, 5);
    },
  });

  if (q.isError)
    return <ErrorState message="Couldn't load dashboard." onRetry={() => q.refetch()} />;
  const s = q.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Overview"
        description={`Live metrics and activity for ${org.name}.`}
        actions={
          <div className="flex flex-wrap gap-2">
            {can("beneficiaries.write") && (
              <Button asChild size="sm">
                <Link to="/beneficiaries">
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  Beneficiaries
                </Link>
              </Button>
            )}
            {can("assistance.write") && (
              <Button asChild size="sm" variant="outline">
                <Link to="/assistance">
                  <PackageCheck className="mr-1.5 h-4 w-4" />
                  Distributions
                </Link>
              </Button>
            )}
            {can("donations.write") && (
              <Button asChild size="sm" variant="outline">
                <Link to="/donations">
                  <Coins className="mr-1.5 h-4 w-4" />
                  Donations
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {!s ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
            <StatCard label="Total Beneficiaries" value={s.beneficiaries} icon={Users} />
            <StatCard label="Active Volunteers" value={s.active_volunteers} icon={HandHeart} />
            <StatCard label="Active Projects" value={s.active_projects} icon={FolderKanban} />
            <StatCard
              label="Donations Recorded"
              value={money(s.donations_by_currency, org.currency)}
              icon={Coins}
              hint="Recorded & confirmed"
            />
            <StatCard
              label="Expenses Recorded"
              value={money(s.expenses_by_currency, org.currency)}
              icon={Receipt}
              hint="Recorded & approved"
            />
            <StatCard
              label="Distributions This Month"
              value={s.assistance_this_month}
              icon={PackageCheck}
            />
          </div>

          {/* Urgent Priority Cases Section */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Urgent-Case Prioritization & Care Action
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Beneficiaries with acute crisis indicators or prolonged assistance gaps.
                  </p>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/beneficiaries">
                  View all beneficiaries
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {urgentCasesQuery.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (urgentCasesQuery.data?.length ?? 0) === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <HeartHandshake className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                No acute crisis cases currently pending. All active beneficiaries are prioritized.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {urgentCasesQuery.data!.map(({ beneficiary, assessment }) => (
                  <Link
                    key={beneficiary["id"]}
                    to="/beneficiaries/$id"
                    params={{ id: beneficiary["id"] }}
                    className="flex flex-col justify-between rounded-lg border bg-background p-3 hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-sm text-foreground hover:underline truncate">
                          {beneficiary["full_name"]}
                        </span>
                        <Badge variant="outline" className={`${assessment.badgeClass} text-[10px]`}>
                          {assessment.level === "critical" ? (
                            <AlertTriangle className="mr-1 h-2.5 w-2.5 animate-pulse text-destructive" />
                          ) : (
                            <AlertCircle className="mr-1 h-2.5 w-2.5 text-amber-500" />
                          )}
                          {assessment.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{beneficiary["code"]}</span>
                        <span>•</span>
                        <span>{beneficiary["support_category"]}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {assessment.reasons[0] ||
                          beneficiary["support_requirements"] ||
                          "Awaiting support evaluation"}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t pt-2 text-[11px] text-primary font-medium">
                      <span>Prioritize aid</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 lg:col-span-2 shadow-xs">
              <h2 className="mb-3 text-sm font-semibold">
                Financial Trend (Donations vs Expenses)
              </h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={s.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="donations"
                    name="Donations"
                    fill="var(--chart-1)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="var(--chart-2)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h2 className="mb-3 text-sm font-semibold">Recent Activity Log</h2>
              {logs.data?.length ? (
                <ul className="space-y-3 text-sm">
                  {logs.data.map((l) => (
                    <li key={l.id} className="border-b pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs uppercase tracking-wide text-foreground">
                          {humanize(l.action)} {humanize(l.entity_type)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(l.created_at, "d MMM, HH:mm")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{l.summary}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No activity logged yet — add your first beneficiary or record a donation.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
