import { createFileRoute, Link } from "@tanstack/react-router";
import { Leaf, ShieldCheck, Users, Coins, AlertCircle, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seva Connect — NGO & Beneficiary Management" },
      {
        name: "description",
        content:
          "Beneficiary management, urgent-case prioritization, support-program matching, donations, and assistance tracking for NGOs.",
      },
      { property: "og:title", content: "Seva Connect — NGO Management" },
      {
        property: "og:description",
        content: "One unified, secure workspace for your NGO's mission.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          Seva Connect
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/dashboard">Workspace</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-16">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-foreground mb-6">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Next-Generation Humanitarian Operations
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl text-foreground">
          Empowering NGOs with smart beneficiary care and assistance tracking.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Manage beneficiaries, prioritize urgent crisis cases, automatically match community needs
          to support programs, track food & medical distributions, and keep transparent donor
          records — all secured with enterprise row-level permissions.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="shadow-xs">
            <Link to="/auth">Get started free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {[
            [
              Users,
              "Beneficiary Care & Tracking",
              "Comprehensive demographic tracking, household profiles, and duplicate detection to protect resource allocation.",
            ],
            [
              AlertCircle,
              "Urgent-Case Prioritization",
              "Automated acute-need detection based on household vulnerability, emergency category, and distribution recency.",
            ],
            [
              HeartHandshake,
              "Smart Program Matching",
              "Align beneficiary needs with active aid projects to maximize mission impact and eliminate program gaps.",
            ],
            [
              Coins,
              "Transparent Finances",
              "Donation and expense logging with multi-currency support, receipt attachments, and full audit logs.",
            ],
            [
              ShieldCheck,
              "Row-Level Security",
              "Role-based controls ensuring staff, volunteers, and managers access only authorized organizational records.",
            ],
            [
              Leaf,
              "Field-Ready Simplicity",
              "Clean, accessible, responsive design optimized for speed on mobile tablets, laptops, and offline-ready networks.",
            ],
          ].map(([Icon, title, desc]: any) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 shadow-xs hover:border-primary/40 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground text-base">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-normal">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
