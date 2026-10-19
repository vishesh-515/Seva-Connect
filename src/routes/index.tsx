import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Leaf,
  ShieldCheck,
  Users,
  Coins,
  AlertCircle,
  HeartHandshake,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  PackageCheck,
  TrendingUp,
  Activity,
  Sun,
  Moon,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seva Connect — NGO & Humanitarian Management Platform" },
      {
        name: "description",
        content:
          "Professional dual-tone NGO workspace for beneficiary care, urgent-case triage, assistance dispensation, and transparent audit trails.",
      },
      { property: "og:title", content: "Seva Connect — Next-Gen NGO Management" },
      {
        property: "og:description",
        content: "Modern dual-tone workspace designed for high-impact humanitarian operations.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [activeTab, setActiveTab] = useState<"triage" | "matching" | "relief">("triage");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("sevaconnect-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("sevaconnect-theme", "light");
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background dualtone-mesh">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/15 to-tone-accent/20 blur-3xl" />
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="group flex items-center gap-2.5 font-bold tracking-tight">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/25 transition-transform duration-200 group-hover:scale-105">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base text-foreground leading-none font-bold">
                Seva <span className="text-primary font-black">Connect</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Humanitarian OS
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/60 text-muted-foreground transition-all hover:bg-card hover:text-foreground hover:border-primary/40"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="shadow-xs shadow-primary/20">
              <Link to="/dashboard" className="gap-1.5">
                <span>Workspace</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <div className="flex flex-col items-center text-center">
          {/* Dual-tone announcement badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary backdrop-blur-xs mb-8 transition-all hover:border-primary/40 hover:bg-primary/10">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Dual-Tone Enterprise Architecture</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-tone-accent font-medium">Real-time NGO Operations</span>
          </div>

          <h1 className="max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Smart Beneficiary Care &{" "}
            <span className="dualtone-gradient-text">Urgent Relief Operations</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            The next-generation NGO workspace engineered for speed, dignity, and transparency.
            Prioritize crisis cases with acute vulnerability scores, automatically match relief programs,
            and maintain an uncompromised audit trail.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <Button asChild size="lg" className="h-12 px-6 text-base font-semibold shadow-md shadow-primary/25">
              <Link to="/auth" className="gap-2">
                <span>Launch Your Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base font-semibold border-border/80 bg-card/60 backdrop-blur-xs hover:border-primary/40">
              <Link to="/dashboard">Explore Live Demo</Link>
            </Button>
          </div>

          {/* Key Stat Ribbon */}
          <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 shadow-sm backdrop-blur-md sm:grid-cols-4">
            <div className="flex flex-col items-center border-r border-border/50 last:border-0 p-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">99.4%</span>
              <span className="text-xs text-muted-foreground font-medium">Allocation Accuracy</span>
            </div>
            <div className="flex flex-col items-center border-r border-border/50 last:border-0 p-2">
              <span className="text-2xl font-bold tracking-tight text-tone-accent">15 min</span>
              <span className="text-xs text-muted-foreground font-medium">Crisis Triage Speed</span>
            </div>
            <div className="flex flex-col items-center border-r border-border/50 last:border-0 p-2">
              <span className="text-2xl font-bold tracking-tight text-primary">100%</span>
              <span className="text-xs text-muted-foreground font-medium">Row-Level RLS Security</span>
            </div>
            <div className="flex flex-col items-center p-2">
              <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">Zero</span>
              <span className="text-xs text-muted-foreground font-medium">Duplicate Wastage</span>
            </div>
          </div>
        </div>

        {/* Interactive Dual-Tone Simulator Card */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-xl backdrop-blur-xl">
          {/* Card Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-border/70 bg-muted/40 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Live Interactive Triage Simulator
              </span>
            </div>
            {/* Interactive Mode Pills */}
            <div className="mt-2 flex rounded-lg border border-border/60 bg-background/80 p-1 sm:mt-0">
              <button
                onClick={() => setActiveTab("triage")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  activeTab === "triage"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Acute Need Scoring
              </button>
              <button
                onClick={() => setActiveTab("matching")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  activeTab === "matching"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Smart Program Match
              </button>
              <button
                onClick={() => setActiveTab("relief")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  activeTab === "relief"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dispensation Ledger
              </button>
            </div>
          </div>

          {/* Interactive Screen Body */}
          <div className="p-6 md:p-8">
            {activeTab === "triage" && (
              <div className="space-y-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                        <Activity className="h-3 w-3" />
                        CRITICAL TRIAGE PRIORITY
                      </span>
                      <span className="text-xs text-muted-foreground">ID: BEN-2026-088</span>
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-foreground">
                      Fatima Begum (Household of 6)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Severe food insecurity + medical dependent · Displaced flood survivor
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-muted-foreground uppercase">Urgency Index</div>
                      <div className="text-3xl font-black text-rose-600 dark:text-rose-400">96<span className="text-sm font-semibold text-muted-foreground">/100</span></div>
                    </div>
                    <div className="h-12 w-2 rounded-full bg-rose-500" />
                  </div>
                </div>

                {/* Micro metrics bar */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <span className="text-xs font-medium text-muted-foreground">Vulnerability Matrix</span>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-bold text-foreground">Level 4 (Severe)</span>
                      <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                        Critical
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <span className="text-xs font-medium text-muted-foreground">Last Ration Dispensed</span>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-bold text-foreground">38 Days Ago</span>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Overdue</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <span className="text-xs font-medium text-muted-foreground">Recommended Action</span>
                    <div className="mt-1 font-bold text-primary">
                      Emergency Food Kit + Medical Grant
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "matching" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Automated Program Alignment</h3>
                    <p className="text-sm text-muted-foreground">
                      Matches vulnerable beneficiaries directly with funded NGO projects
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    2 Projects Matched
                  </Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-primary">Priority Program 1</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">98% Fit Score</span>
                    </div>
                    <h4 className="mt-2 font-bold text-foreground">Project Annapurna: Nutritional Kits</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Monthly ration supplies for destitute rural families</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-foreground font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Budget verified · Volunteer assigned
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-muted-foreground">Secondary Program</span>
                      <span className="text-xs font-semibold text-primary">87% Fit Score</span>
                    </div>
                    <h4 className="mt-2 font-bold text-foreground">Community Medical Subsidies</h4>
                    <p className="mt-1 text-xs text-muted-foreground">Prescription and diagnostics funding for elderly dependents</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Review pending by Project Lead
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "relief" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">Live Dispensation Ledger</h3>
                  <span className="text-xs font-medium text-muted-foreground">Synchronized with Supabase RLS</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/60">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Beneficiary</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">DISP-8921</td>
                        <td className="px-4 py-3 font-semibold text-foreground">Rameshwar K.</td>
                        <td className="px-4 py-3 text-muted-foreground">Dry Ration Kit</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Distributed
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">OTP Verified</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">DISP-8922</td>
                        <td className="px-4 py-3 font-semibold text-foreground">Sunita Devi</td>
                        <td className="px-4 py-3 text-muted-foreground">Winter Blanket + Fuel</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            In Transit
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">Volunteer Dispatched</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dual-Tone Core Feature Grid */}
        <div className="mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Engineered for Complete Mission Transparency
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Every tool your team, donors, and field volunteers need to scale impact without chaos.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: Users,
                title: "Beneficiary Care & Tracking",
                desc: "Demographic profiles, household trees, and intelligent duplicate deduplication to prevent waste.",
                accent: "primary",
              },
              {
                icon: AlertCircle,
                title: "Urgent-Case Prioritization",
                desc: "Algorithmic vulnerability scoring surfaces crisis cases before they slip through bureaucratic cracks.",
                accent: "amber",
              },
              {
                icon: HeartHandshake,
                title: "Smart Program Matching",
                desc: "Direct mapping of community needs to active aid initiatives, eliminating unspent budget bottlenecks.",
                accent: "primary",
              },
              {
                icon: Coins,
                title: "Transparent Finances",
                desc: "Multi-currency donor contributions, expenditure tracking, receipt attachments, and exportable financial audits.",
                accent: "amber",
              },
              {
                icon: ShieldCheck,
                title: "Row-Level RLS Security",
                desc: "Enterprise Postgres permissions ensuring staff and volunteers access only their authorized organizational records.",
                accent: "primary",
              },
              {
                icon: PackageCheck,
                title: "Distribution & Field Verification",
                desc: "Real-time dispensation logs with audit timestamps, inventory decrements, and offline-ready responsiveness.",
                accent: "amber",
              },
            ].map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 shadow-xs interactive-card transition-all hover:border-primary/40 hover:bg-card"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-110 ${
                    accent === "amber"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Dual-Tone CTA Banner */}
        <div className="relative mt-24 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-tone-accent/15 p-8 text-center md:p-12">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              Empower your NGO with <span className="dualtone-gradient-text">Seva Connect</span> today.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground">
              Instant setup, open database schema with Supabase, and full control over your organization’s data.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-11 px-6 font-semibold shadow-md shadow-primary/25">
                <Link to="/auth">Get Started Now</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-11 px-6 font-semibold border-border/80 bg-card/60 hover:border-primary/40">
                <Link to="/dashboard">Go to Workspace</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/40 py-8 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Leaf className="h-3 w-3" />
            </div>
            <span className="font-semibold text-foreground">Seva Connect</span>
            <span>· Non-Profit Beneficiary Management System</span>
          </div>
          <div>© {new Date().getFullYear()} Seva Connect. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
