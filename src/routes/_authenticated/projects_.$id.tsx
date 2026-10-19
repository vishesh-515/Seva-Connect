import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Receipt,
  Users,
  Target,
  Wallet,
  UserCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { projectsConfig } from "@/lib/entities";
import { RecordDetail, Section, MiniTable, useRelated } from "@/components/entity/RecordDetail";
import { QuickAdd } from "@/components/entity/QuickAdd";
import { StatusBadge, StatCard } from "@/components/feedback/common";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import {
  budgetUtilization,
  ELIGIBLE_EXPENSE_STATUSES,
  formatCurrency,
  formatDate,
  humanize,
} from "@/lib/format";
import { matchBeneficiariesForProject } from "@/lib/program-matching";
import { assessUrgency } from "@/lib/prioritization";
import type { Row } from "@/components/entity/types";

export const Route = createFileRoute("/_authenticated/projects_/$id")({
  head: () => ({
    meta: [
      { title: "Project details — Seva Connect" },
      {
        name: "description",
        content: "Project budget, team, beneficiaries, program matching and spending.",
      },
      { property: "og:title", content: "Project details — Seva Connect" },
      { property: "og:description", content: "Project budget, team, beneficiaries and spending." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { org, can } = useCurrentOrg();
  const qc = useQueryClient();

  const expenses = useRelated("expenses", "project_id", id, "*", "expense_date");
  const bens = useRelated(
    "project_beneficiaries",
    "project_id",
    id,
    "id, beneficiary:beneficiaries(id, full_name, code, support_category, status)",
  );
  const members = useRelated(
    "project_members",
    "project_id",
    id,
    "id, role, user_id, volunteer:volunteers(full_name)",
  );

  const dir = useQuery({
    queryKey: ["org", org.id, "directory"],
    queryFn: async () =>
      ((await supabase.rpc("org_members_directory", { _org: org.id })).data ?? []) as Row[],
  });

  // Query all active beneficiaries for program matching
  const allBeneficiariesQuery = useQuery({
    queryKey: ["org", org.id, "beneficiaries", "for-project-matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .eq("organization_id", org.id)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  // Mutation to enroll a matched beneficiary
  const enrollBeneficiaryMutation = useMutation({
    mutationFn: async (beneficiaryId: string) => {
      const { error } = await supabase.from("project_beneficiaries").insert({
        organization_id: org.id,
        project_id: id,
        beneficiary_id: beneficiaryId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Beneficiary enrolled in program");
      qc.invalidateQueries({ queryKey: ["org", org.id] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "Already enrolled." : e.message),
  });

  const nameOf = (uid: string) =>
    dir.data?.find((d) => d["user_id"] === uid)?.["full_name"] ||
    dir.data?.find((d) => d["user_id"] === uid)?.["email"] ||
    "Team member";

  return (
    <RecordDetail config={projectsConfig} id={id} back="/projects" titleKey="name">
      {(p) => {
        const spent = (expenses.data ?? [])
          .filter(
            (e) =>
              (ELIGIBLE_EXPENSE_STATUSES as readonly string[]).includes(e["status"]) &&
              e["currency"] === p["currency"],
          )
          .reduce((s, e) => s + Number(e["amount"]), 0);
        const u = budgetUtilization(p["budget"] ? Number(p["budget"]) : null, spent);
        const target = p["target_beneficiaries"] as number | null;
        const reached = bens.data?.length ?? 0;

        const enrolledBeneficiaryIds = (bens.data ?? [])
          .map((b) => b["beneficiary"]?.id)
          .filter(Boolean);
        const beneficiaryMatches = matchBeneficiariesForProject(
          p,
          allBeneficiariesQuery.data ?? [],
          enrolledBeneficiaryIds,
        );
        const unenrolledMatches = beneficiaryMatches.filter((m) => !m.isEnrolled);

        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Budget"
                icon={Wallet}
                value={p["budget"] != null ? formatCurrency(p["budget"], p["currency"]) : "—"}
              />
              <StatCard
                label="Spent"
                icon={Receipt}
                value={formatCurrency(spent, p["currency"])}
                hint={u ? `${u.pct}% used${u.over ? " — over budget" : ""}` : undefined}
              />
              <StatCard
                label="Beneficiaries"
                icon={Users}
                value={reached}
                hint={
                  target
                    ? `Target: ${target} (${Math.max(0, target - reached)} remaining)`
                    : undefined
                }
              />
              <StatCard
                label="Progress"
                icon={Target}
                value={`${p["manual_progress"] ?? (target ? Math.min(100, Math.round((reached / target) * 100)) : 0)}%`}
              />
            </div>
            {u && <Progress value={u.pct} aria-label="Budget used" />}

            {/* Smart Beneficiary Matching for this Program */}
            <Section
              title="Recommended Beneficiaries (Smart Program Matching)"
              actions={
                <Badge variant="secondary" className="font-normal text-xs">
                  {unenrolledMatches.length} candidate{unenrolledMatches.length === 1 ? "" : "s"}
                </Badge>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Active beneficiaries in need of support aligned with this program's focus,
                  category, and target location.
                </p>
                {allBeneficiariesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Matching beneficiaries…</p>
                ) : unenrolledMatches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    All matching active beneficiaries are currently enrolled.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {unenrolledMatches.slice(0, 6).map((m) => {
                      const urg = assessUrgency(m.beneficiary);
                      return (
                        <div
                          key={m.beneficiary["id"]}
                          className="flex flex-col justify-between rounded-lg border bg-card p-3 shadow-2xs hover:border-primary/50 transition-colors"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <Link
                                to="/beneficiaries/$id"
                                params={{ id: m.beneficiary["id"] }}
                                className="font-medium text-sm text-foreground hover:text-primary hover:underline truncate"
                              >
                                {m.beneficiary["full_name"]}
                              </Link>
                              <Badge
                                variant="outline"
                                className={
                                  m.score >= 70
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px]"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]"
                                }
                              >
                                {m.score}% match
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[10px] border ${urg.badgeClass}`}
                              >
                                {urg.level === "critical" && (
                                  <AlertTriangle className="h-2.5 w-2.5 text-destructive animate-pulse" />
                                )}
                                {urg.level === "high" && (
                                  <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
                                )}
                                {urg.label}
                              </span>
                              <span className="text-[11px] text-muted-foreground truncate">
                                {m.beneficiary["code"]}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {m.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-3 border-t pt-2 text-right">
                            {can("beneficiaries.write") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs w-full"
                                disabled={enrollBeneficiaryMutation.isPending}
                                onClick={() =>
                                  enrollBeneficiaryMutation.mutate(m.beneficiary["id"])
                                }
                              >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                Enroll in project
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Section>

            {/* Team Management */}
            <Section
              title="Team & volunteer assignments"
              actions={
                can("projects.write") && (
                  <div className="flex flex-wrap gap-2">
                    <QuickAddMember projectId={id} members={dir.data ?? []} />
                    <QuickAdd
                      label="Assign volunteer"
                      table="project_members"
                      fixed={{ project_id: id }}
                      fields={[
                        {
                          name: "volunteer_id",
                          label: "Volunteer",
                          required: true,
                          options: { table: "volunteers", label: "full_name" },
                        },
                        { name: "role", label: "Role", initial: "volunteer" },
                      ]}
                    />
                  </div>
                )
              }
            >
              <MiniTable
                rows={members.data}
                empty="No staff or volunteers assigned yet."
                cols={[
                  {
                    label: "Name",
                    render: (r) => r["volunteer"]?.full_name ?? nameOf(r["user_id"]),
                  },
                  {
                    label: "Role Type",
                    render: (r) => (r["volunteer"] ? "Volunteer" : "Staff Member"),
                  },
                  { label: "Assigned Role", render: (r) => humanize(r["role"]) },
                ]}
              />
            </Section>

            {/* Enrolled Beneficiaries */}
            <Section
              title={`Enrolled beneficiaries (${reached}${target ? ` / ${target}` : ""})`}
              actions={
                can("beneficiaries.write") && (
                  <QuickAdd
                    label="Link beneficiary"
                    table="project_beneficiaries"
                    fixed={{ project_id: id }}
                    fields={[
                      {
                        name: "beneficiary_id",
                        label: "Beneficiary",
                        required: true,
                        options: { table: "beneficiaries", label: "full_name" },
                      },
                    ]}
                  />
                )
              }
            >
              <MiniTable
                rows={bens.data}
                empty="No beneficiaries enrolled yet."
                cols={[
                  {
                    label: "Name",
                    render: (r) =>
                      r["beneficiary"] ? (
                        <Link
                          to="/beneficiaries/$id"
                          params={{ id: r["beneficiary"].id }}
                          className="hover:underline font-medium"
                        >
                          {r["beneficiary"].full_name}
                        </Link>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    label: "ID Code",
                    render: (r) => (
                      <span className="font-mono text-xs">{r["beneficiary"]?.code}</span>
                    ),
                  },
                  { label: "Category", render: (r) => r["beneficiary"]?.support_category ?? "—" },
                  {
                    label: "Status",
                    render: (r) => <StatusBadge status={r["beneficiary"]?.status} />,
                  },
                ]}
              />
            </Section>

            {/* Expenses */}
            <Section title="Project expenses & expenditures">
              <MiniTable
                rows={expenses.data}
                empty="No expenditures logged for this project."
                cols={[
                  { label: "Date", render: (r) => formatDate(r["expense_date"]) },
                  { label: "Title", render: (r) => r["title"] },
                  { label: "Category", render: (r) => r["category"] },
                  { label: "Amount", render: (r) => formatCurrency(r["amount"], r["currency"]) },
                  { label: "Status", render: (r) => <StatusBadge status={r["status"]} /> },
                ]}
              />
            </Section>
          </>
        );
      }}
    </RecordDetail>
  );
}

function QuickAddMember({ projectId, members }: { projectId: string; members: Row[] }) {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uid, setUid] = useState("");
  const [role, setRole] = useState("member");
  const m = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_members").insert({
        organization_id: org.id,
        project_id: projectId,
        user_id: uid,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member assigned — they've been notified");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["org", org.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserCheck className="mr-1.5 h-4 w-4" />
          Assign staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign team member</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (uid) m.mutate();
          }}
        >
          <div>
            <Label htmlFor="pm-user" className="mb-1.5 block">
              Member *
            </Label>
            <select
              id="pm-user"
              required
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
            >
              <option value="">Select member…</option>
              {members.map((d) => (
                <option key={d["user_id"]} value={d["user_id"]}>
                  {d["full_name"] || d["email"]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pm-role" className="mb-1.5 block">
              Role in project
            </Label>
            <Input id="pm-role" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={m.isPending}>
            {m.isPending ? "Assigning…" : "Assign to project"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
