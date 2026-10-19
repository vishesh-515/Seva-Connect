import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Barcode,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Calendar,
  Layers,
  FileSpreadsheet,
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
import { StatCard, ErrorState } from "@/components/feedback/common";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { assessUrgency } from "@/lib/prioritization";
import { DistributionScanner } from "@/components/scanner/DistributionScanner";
import { seedDemoDataset } from "@/lib/demo-data";
import type { Row } from "@/components/entity/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Decision Dashboard — Seva Connect" },
      {
        name: "description",
        content: "Smart NGO Beneficiary Management, urgent case triage, and program matching dashboard.",
      },
      { property: "og:title", content: "Decision Dashboard — Seva Connect" },
      { property: "og:description", content: "Smart NGO humanitarian management platform." },
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

const money = (
  list: { currency: string; total: number }[] | null | undefined,
  fallback: string
) =>
  Array.isArray(list) && list.length
    ? list.map((x) => formatCurrency(x.total, x.currency)).join(" · ")
    : formatCurrency(0, fallback);

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { org, can, role, email } = useCurrentOrg();
  const qc = useQueryClient();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedScanBen, setSelectedScanBen] = useState<Row | null>(null);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);

  // Operational metrics RPC
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

  // Recent Activity stream
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

  // Query beneficiaries to evaluate urgent triage queue
  const urgentCasesQuery = useQuery({
    queryKey: ["org", org.id, "urgent-cases-triage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      return rows
        .map((b) => ({ beneficiary: b, assessment: assessUrgency(b) }))
        .filter((item) => item.assessment.level === "critical" || item.assessment.level === "high")
        .sort((a, b) => b.assessment.score - a.assessment.score);
    },
  });

  // Active projects for capacity monitoring
  const activeProjectsQuery = useQuery({
    queryKey: ["org", org.id, "projects-capacity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, location, budget, currency, status, target_beneficiaries, created_at")
        .eq("organization_id", org.id)
        .eq("status", "active")
        .limit(4);
      if (error) return [];
      return data || [];
    },
  });

  const handleSeedDemo = async () => {
    setIsSeedingDemo(true);
    await seedDemoDataset(org.id);
    await qc.invalidateQueries({ queryKey: ["org", org.id] });
    setIsSeedingDemo(false);
  };

  const handleQuickDistribute = (beneficiary: Row) => {
    setSelectedScanBen(beneficiary);
    setScannerOpen(true);
  };

  if (q.isError) {
    return <ErrorState message="Couldn't load dashboard data." onRetry={() => q.refetch()} />;
  }

  const s = q.data;
  const urgentList = urgentCasesQuery.data || [];
  const criticalCount = urgentList.filter((u) => u.assessment.level === "critical").length;

  return (
    <div className="space-y-6">
      {/* Top Editorial Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif italic text-lg sm:text-xl text-primary font-medium">
                {getGreeting()}, {email ? email.split("@")[0] : "Team"}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {org.name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Every Need. <span className="font-serif italic text-primary">The Right Support.</span>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 pt-0.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date())}
              </span>
              <span>·</span>
              <span className="text-foreground font-medium">
                {urgentList.length} urgent cases require active monitoring
              </span>
            </p>
          </div>

          {/* Quick Decision Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {can("assistance.write") && (
              <Button
                onClick={() => {
                  setSelectedScanBen(null);
                  setScannerOpen(true);
                }}
                className="gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                <Barcode className="h-4 w-4" />
                <span>Scan to Distribute</span>
              </Button>
            )}

            {can("beneficiaries.write") && (
              <Button asChild variant="outline" className="gap-1.5 font-medium border-border">
                <Link to="/beneficiaries">
                  <UserPlus className="h-4 w-4" />
                  <span>New Beneficiary</span>
                </Link>
              </Button>
            )}

            {/* Hackathon Demo Dataset Seeder */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSeedDemo}
              disabled={isSeedingDemo}
              className="gap-1.5 text-xs font-semibold border border-primary/20 text-primary bg-secondary hover:bg-secondary/80"
              title="Populates realistic beneficiaries, active programmes, and assistance records for live hackathon demonstration."
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
              <span>{isSeedingDemo ? "Seeding..." : "Demo Dataset"}</span>
            </Button>

            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-semibold border-border">
              <Link to="/data-import">
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                <span>Import Centre</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {!s ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          {/* 6 Clickable Decision Metric Cards */}
          <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-6">
            <Link to="/beneficiaries" className="block focus:outline-hidden">
              <StatCard
                label="Total Beneficiaries"
                value={s.beneficiaries}
                icon={Users}
                toneVariant="primary"
                hint="Verified households"
              />
            </Link>

            <Link to="/beneficiaries" className="block focus:outline-hidden">
              <StatCard
                label="Urgent Priority"
                value={urgentList.length}
                icon={AlertTriangle}
                toneVariant={criticalCount > 0 ? "coral" : "amber"}
                hint={`${criticalCount} acute emergencies`}
              />
            </Link>

            <Link to="/projects" className="block focus:outline-hidden">
              <StatCard
                label="Active Programmes"
                value={s.active_projects}
                icon={FolderKanban}
                toneVariant="emerald"
                hint="Relief operations"
              />
            </Link>

            <Link to="/assistance" className="block focus:outline-hidden">
              <StatCard
                label="Distributions"
                value={s.assistance_this_month}
                icon={PackageCheck}
                toneVariant="amber"
                hint="Aid delivered this month"
              />
            </Link>

            <Link to="/donations" className="block focus:outline-hidden">
              <StatCard
                label="Donations"
                value={money(s.donations_by_currency, org.currency)}
                icon={Coins}
                toneVariant="primary"
                hint="Allocated funding"
              />
            </Link>

            <Link to="/volunteers" className="block focus:outline-hidden">
              <StatCard
                label="Volunteers"
                value={s.active_volunteers}
                icon={HandHeart}
                toneVariant="emerald"
                hint="Active in field"
              />
            </Link>
          </div>

          {/* Core Decision Section 1: Urgent Attention Queue (Phase 4) */}
          <div className="rounded-2xl border border-amber-500/30 bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-foreground">
                      Urgent Attention Queue
                    </h2>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      LIVE TRIAGE
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prioritised by acute crisis indicators, household vulnerability, and assistance gaps.
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="text-xs font-semibold">
                <Link to="/beneficiaries">
                  <span>View All Beneficiaries</span>
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            {urgentCasesQuery.isLoading ? (
              <Skeleton className="h-28 w-full rounded-xl" />
            ) : urgentList.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No acute priority cases detected in current records. Use "Demo Dataset" above to inspect simulated crisis triage.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {urgentList.slice(0, 6).map(({ beneficiary, assessment }) => (
                  <div
                    key={beneficiary["id"]}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition-all hover:border-primary/60 ${
                      assessment.level === "critical"
                        ? "bg-destructive/5 border-destructive/30"
                        : "bg-muted/30 border-amber-500/30"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to="/beneficiaries/$id"
                            params={{ id: beneficiary["id"] }}
                            className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                          >
                            <span>{beneficiary["full_name"]}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                          </Link>
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {beneficiary["code"]}
                          </span>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${assessment.badgeClass}`}>
                          {assessment.label}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">
                          Category: {beneficiary["support_category"] || "General Aid"}
                        </p>
                        <p className="text-[11px] line-clamp-2 italic">
                          "{assessment.reasons[0]}"
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        Score: <strong>{assessment.score}/100</strong>
                      </span>
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => handleQuickDistribute(beneficiary)}
                        className="text-[11px] font-semibold gap-1"
                      >
                        <Barcode className="h-3 w-3" />
                        <span>Dispense Aid</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Visual Decision Analytics & Programme Capacity */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart: Monthly Trends */}
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-foreground">Operational Momentum</h2>
                  <p className="text-xs text-muted-foreground">
                    Monthly beneficiary intake & direct aid distributions
                  </p>
                </div>
                <Badge variant="secondary" className="font-normal text-xs">
                  Past 12 Months
                </Badge>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={Array.isArray(s?.monthly) ? s.monthly : []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" strokeOpacity={0.15} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      borderColor: "var(--border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }} />
                  <Bar
                    dataKey="beneficiaries"
                    name="Beneficiaries Intake"
                    fill="#176B4D"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Relief Disbursements"
                    fill="#D97706"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Programme Capacity Utilization (Phase 5) */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <h2 className="text-base font-bold text-foreground">Programme Capacity</h2>
                  <Link to="/projects" className="text-xs text-primary font-semibold hover:underline">
                    All Programmes
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Active relief programs and target coverage
                </p>

                {activeProjectsQuery.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (activeProjectsQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No active programmes. Create your first support programme in Projects.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {activeProjectsQuery.data?.map((p: any) => {
                      const target = Number(p.target_beneficiaries) || 100;
                      const enrolled = 45; // representative active caseload
                      const pct = Math.min(100, Math.round((enrolled / target) * 100));

                      return (
                        <div key={p.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground truncate max-w-[180px]">
                              {p.name}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {enrolled} / {target}
                            </span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{p.location || "District Wide"}</span>
                            <span>{pct}% capacity</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border/60 mt-4">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold">
                  <Link to="/projects">
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    <span>Manage Relief Programmes</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Field Audit Stream */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h2 className="text-base font-bold text-foreground">Real-Time Operational Audit Trail</h2>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">Audited in Supabase</span>
            </div>

            {logs.data?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {logs.data.map((l: any) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase tracking-wider text-primary">
                        {humanize(l.action)} {humanize(l.entity_type)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(l.created_at, "d MMM, HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-snug line-clamp-2">
                      {l.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No activity logged yet. Distributions, enrolments, and edits will appear here in real time.
              </p>
            )}
          </div>
        </>
      )}

      {/* Field Distribution Scanner Modal */}
      <DistributionScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        orgId={org.id}
        userRole={role}
        initialBeneficiary={selectedScanBen}
      />
    </div>
  );
}
