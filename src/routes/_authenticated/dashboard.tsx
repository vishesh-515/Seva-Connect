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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Total Beneficiaries"
              value={s.beneficiaries}
              icon={Users}
              toneVariant="primary"
              hint="Verified household profiles"
            />
            <StatCard
              label="Active Volunteers"
              value={s.active_volunteers}
              icon={HandHeart}
              toneVariant="emerald"
              hint="Ready for field deployment"
            />
            <StatCard
              label="Active Projects"
              value={s.active_projects}
              icon={FolderKanban}
              toneVariant="primary"
              hint="Community aid programs"
            />
            <StatCard
              label="Donations Recorded"
              value={money(s.donations_by_currency, org.currency)}
              icon={Coins}
              toneVariant="amber"
              hint="Audited & allocated funds"
            />
            <StatCard
              label="Expenses Recorded"
              value={money(s.expenses_by_currency, org.currency)}
              icon={Receipt}
              toneVariant="coral"
              hint="Direct relief disbursements"
            />
            <StatCard
              label="Distributions This Month"
              value={s.assistance_this_month}
              icon={PackageCheck}
              toneVariant="amber"
              hint="Completed aid handoffs"
            />
          </div>

          {/* Urgent Priority Cases Section */}
          <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-card p-5 shadow-sm transition-all">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Urgent-Case Prioritization & Care Action
                    </h2>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      LIVE TRIAGE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Acute crisis indicators, vulnerable households, or prolonged assistance gaps.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="text-xs font-semibold border-border/80 hover:border-primary/40">
                <Link to="/beneficiaries">
                  All Beneficiaries
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {urgentCasesQuery.isLoading ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : (urgentCasesQuery.data?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <HeartHandshake className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2.5" />
                <p className="font-medium text-foreground">No acute crisis cases currently pending.</p>
                <p className="text-xs text-muted-foreground mt-1">All active households are within their scheduled assistance cycles.</p>
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {urgentCasesQuery.data!.map(({ beneficiary, assessment }) => (
                  <Link
                    key={beneficiary["id"]}
                    to="/beneficiaries/$id"
                    params={{ id: beneficiary["id"] }}
                    className="group relative flex flex-col justify-between rounded-xl border border-border/80 bg-background/80 p-4 interactive-card hover:border-amber-500/50 hover:bg-card transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {beneficiary["full_name"]}
                        </span>
                        <Badge variant="outline" className={`${assessment.badgeClass} text-[10px] font-bold`}>
                          {assessment.level === "critical" ? (
                            <AlertTriangle className="mr-1 h-2.5 w-2.5 animate-pulse text-destructive" />
                          ) : (
                            <AlertCircle className="mr-1 h-2.5 w-2.5 text-amber-500" />
                          )}
                          {assessment.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[11px] font-semibold">{beneficiary["code"]}</span>
                        <span>•</span>
                        <span>{beneficiary["support_category"]}</span>
                      </div>
                      <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {assessment.reasons[0] ||
                          beneficiary["support_requirements"] ||
                          "Awaiting support evaluation"}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                      <span>Prioritize Care Package</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-card p-5 lg:col-span-2 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    Financial Balance (Donations vs Relief Expenses)
                  </h2>
                  <p className="text-xs text-muted-foreground">Monthly ledger reconciliation for transparent governance</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={s.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="month" fontSize={11} stroke="var(--muted-foreground)" />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                  <Bar
                    dataKey="donations"
                    name="Donations"
                    fill="var(--chart-1)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Expenses"
                    fill="var(--chart-2)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-3">
                <h2 className="text-base font-bold text-foreground">Recent Audit Stream</h2>
                <span className="text-[11px] font-semibold text-muted-foreground">Real-time</span>
              </div>
              {logs.data?.length ? (
                <ul className="space-y-3.5 text-sm">
                  {logs.data.map((l) => (
                    <li key={l.id} className="relative pl-4 border-l-2 border-primary/30 last:border-l-transparent pb-1">
                      <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wide text-foreground">
                          {humanize(l.action)} {humanize(l.entity_type)}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {formatDate(l.created_at, "d MMM, HH:mm")}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{l.summary}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center">
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
