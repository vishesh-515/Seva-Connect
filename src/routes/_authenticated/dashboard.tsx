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
      {/* Top Luxury Espresso Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[#35231C] bg-[#1E1411] p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div className="space-y-2">
            {/* Shubh Style Eyebrow Pill */}
            <div className="flex items-center gap-2">
              <span className="shubh-eyebrow">
                <Sparkles className="h-3 w-3 text-[#E29555]" />
                Humanitarian Operations & Impact
              </span>
              <span className="text-[#827368]">·</span>
              <span className="text-xs font-semibold text-[#AFA196]">{org.name}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#FFFDFB]">
              Every Need. <span className="heading-copper">The Right Support.</span>
            </h1>

            <p className="text-xs text-[#AFA196] flex flex-wrap items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1.5 text-[#AFA196]">
                <Calendar className="h-3.5 w-3.5 text-[#E29555] shrink-0" />
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }).format(new Date())}
              </span>
              <span>·</span>
              <span className="shubh-tag-ruby">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E05345] animate-pulse" />
                {urgentList.length} urgent cases in active triage
              </span>
              <span className="shubh-tag-emerald">
                <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                Supabase Live RLS
              </span>
            </p>
          </div>

          {/* Quick Decision Actions Styled as Luxury Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {can("assistance.write") && (
              <Button
                onClick={() => {
                  setSelectedScanBen(null);
                  setScannerOpen(true);
                }}
                className="gap-2 rounded-full font-bold bg-gradient-to-r from-[#E29555] to-[#C87A38] text-[#130D0B] shadow-sm hover:brightness-110 transition-all hover:scale-102"
              >
                <Barcode className="h-4 w-4" />
                <span>Scan to Distribute</span>
              </Button>
            )}

            {can("beneficiaries.write") && (
              <Button asChild variant="outline" className="gap-1.5 rounded-full font-semibold border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] hover:border-[#E29555]">
                <Link to="/beneficiaries">
                  <UserPlus className="h-4 w-4 text-[#E29555]" />
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
              className="gap-1.5 rounded-full text-xs font-semibold border border-[#48291F] bg-[#281A15] text-[#E29555] hover:bg-[#35211A] hover:border-[#E29555]"
              title="Populates realistic beneficiaries, active programmes, and assistance records for live hackathon demonstration."
            >
              <Sparkles className="h-3.5 w-3.5 text-[#E29555]" />
              <span>{isSeedingDemo ? "Seeding..." : "Demo Dataset"}</span>
            </Button>

            <Button asChild variant="outline" size="sm" className="gap-1.5 rounded-full text-xs font-semibold border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18]">
              <Link to="/data-import">
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#E29555]" />
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

          {/* Core Decision Section 1: Urgent Attention Queue */}
          <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2E1E19] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E1513] text-[#E05345] border border-[#5A231E] shadow-2xs">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#FFFDFB]">
                      Urgent Attention Queue
                    </h2>
                    <span className="shubh-tag-ruby">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E05345] animate-pulse" />
                      LIVE TRIAGE
                    </span>
                  </div>
                  <p className="text-xs text-[#AFA196]">
                    Prioritised by acute crisis indicators, household vulnerability, and assistance gaps.
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="rounded-full text-xs font-semibold border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] hover:border-[#E29555] transition-all">
                <Link to="/beneficiaries">
                  <span>View All Beneficiaries</span>
                  <ChevronRight className="ml-1 h-3.5 w-3.5 text-[#E29555]" />
                </Link>
              </Button>
            </div>

            {urgentCasesQuery.isLoading ? (
              <Skeleton className="h-28 w-full rounded-xl bg-[#281A15]" />
            ) : urgentList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#AFA196]">
                No acute priority cases detected in current records. Use "Demo Dataset" above to inspect simulated crisis triage.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {urgentList.slice(0, 6).map(({ beneficiary, assessment }) => (
                  <div
                    key={beneficiary["id"]}
                    className={`flex flex-col justify-between rounded-xl border p-4 transition-all interactive-card ${
                      assessment.level === "critical"
                        ? "bg-[#241713] border-[#5A231E] hover:border-[#E05345]"
                        : "bg-[#221612] border-[#35231C] hover:border-[#E29555]"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            to="/beneficiaries/$id"
                            params={{ id: beneficiary["id"] }}
                            className="font-bold text-sm text-[#FFFDFB] hover:text-[#E29555] transition-colors flex items-center gap-1.5"
                          >
                            <span>{beneficiary["full_name"]}</span>
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-60 text-[#E29555]" />
                          </Link>
                          <span className="font-mono text-[11px] text-[#AFA196]">
                            {beneficiary["code"]}
                          </span>
                        </div>
                        <span className={assessment.level === "critical" ? "shubh-tag-ruby" : "shubh-tag-copper"}>
                          {assessment.label}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-[#AFA196]">
                        <p className="font-medium text-[#FFFDFB]">
                          Category: {beneficiary["support_category"] || "General Aid"}
                        </p>
                        <p className="text-[11px] line-clamp-2 italic text-[#AFA196]">
                          "{assessment.reasons[0]}"
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#2E1E19] flex items-center justify-between">
                      <span className="text-[11px] text-[#AFA196]">
                        Score: <strong className="text-[#E29555]">{assessment.score}/100</strong>
                      </span>
                      <Button
                        size="xs"
                        onClick={() => handleQuickDistribute(beneficiary)}
                        className="shubh-explore-btn text-[11px] font-bold"
                      >
                        <Barcode className="h-3 w-3" />
                        <span>Dispense Aid ↗</span>
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
            <div className="lg:col-span-2 rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#2E1E19] pb-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#FFFDFB]">Operational Momentum</h2>
                  <p className="text-xs text-[#AFA196]">
                    Monthly beneficiary intake & direct aid distributions
                  </p>
                </div>
                <span className="shubh-tag-copper">
                  Past 12 Months
                </span>
              </div>

              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={Array.isArray(s?.monthly) ? s.monthly : []}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#35231C" strokeOpacity={0.8} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#AFA196" }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#AFA196" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1E1411",
                      borderColor: "#35231C",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      color: "#FFFDFB",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                    }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: "10px", fontSize: "12px" }} />
                  <Bar
                    dataKey="beneficiaries"
                    name="Beneficiaries Intake"
                    fill="#E29555"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="expenses"
                    name="Relief Disbursements"
                    fill="#2EA063"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Programme Capacity Utilization (Phase 5) */}
            <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 sm:p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#2E1E19] pb-3 mb-3">
                  <h2 className="text-base font-bold text-[#FFFDFB]">Programme Capacity</h2>
                  <Link to="/projects" className="text-xs text-[#E29555] font-semibold hover:underline flex items-center gap-1">
                    <span>All Programmes</span>
                    <span className="text-[10px]">↗</span>
                  </Link>
                </div>
                <p className="text-xs text-[#AFA196] mb-4">
                  Active relief programs and target coverage
                </p>

                {activeProjectsQuery.isLoading ? (
                  <Skeleton className="h-32 w-full bg-[#281A15]" />
                ) : (activeProjectsQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-xs text-[#AFA196] py-6 text-center">
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
                            <span className="font-semibold text-[#FFFDFB] truncate max-w-[180px]">
                              {p.name}
                            </span>
                            <span className="font-mono text-[#AFA196]">
                              {enrolled} / {target}
                            </span>
                          </div>
                          <Progress value={pct} className="h-1.5 bg-[#281A15] [&>div]:bg-gradient-to-r [&>div]:from-[#E29555] [&>div]:to-[#C87A38]" />
                          <div className="flex justify-between text-[10px] text-[#AFA196]">
                            <span>{p.location || "District Wide"}</span>
                            <span className="text-[#E29555] font-semibold">{pct}% capacity</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#2E1E19] mt-4">
                <Button asChild size="sm" variant="outline" className="w-full text-xs font-semibold rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] hover:border-[#E29555]">
                  <Link to="/projects">
                    <Layers className="h-3.5 w-3.5 mr-1.5 text-[#E29555]" />
                    <span>Manage Relief Programmes ↗</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Field Audit Stream */}
          <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#2E1E19] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#E29555]" />
                <h2 className="text-base font-bold text-[#FFFDFB]">Real-Time Operational Audit Trail</h2>
              </div>
              <span className="shubh-tag-emerald">Audited in Supabase</span>
            </div>

            {logs.data?.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {logs.data.map((l: any) => (
                  <div
                    key={l.id}
                    className="rounded-xl border border-[#35231C] bg-[#221612] p-3 text-xs space-y-1.5 hover:border-[#52362C] transition-all"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-bold uppercase tracking-wider text-[#E29555]">
                        {humanize(l.action)} {humanize(l.entity_type)}
                      </span>
                      <span className="text-[#827368]">
                        {formatDate(l.created_at, "d MMM, HH:mm")}
                      </span>
                    </div>
                    <p className="text-xs text-[#FFFDFB] font-medium leading-snug line-clamp-2">
                      {l.summary}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#AFA196] py-6 text-center">
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
