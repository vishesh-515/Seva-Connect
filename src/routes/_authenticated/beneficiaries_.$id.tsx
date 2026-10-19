import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderPlus,
  HeartHandshake,
  PackagePlus,
} from "lucide-react";
import { beneficiariesConfig, assistanceConfig } from "@/lib/entities";
import { RecordDetail, Section, MiniTable, useRelated } from "@/components/entity/RecordDetail";
import { QuickAdd } from "@/components/entity/QuickAdd";
import { EntityFormDialog } from "@/components/entity/EntityPage";
import { StatusBadge } from "@/components/feedback/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrentOrg } from "@/lib/org-context";
import { formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { assessUrgency } from "@/lib/prioritization";
import { matchProgramsForBeneficiary } from "@/lib/program-matching";
import type { Row } from "@/components/entity/types";

export const Route = createFileRoute("/_authenticated/beneficiaries_/$id")({
  head: () => ({
    meta: [
      { title: "Beneficiary profile — Seva Connect" },
      {
        name: "description",
        content:
          "Beneficiary profile, urgency prioritization, program matching and assistance history.",
      },
      { property: "og:title", content: "Beneficiary profile — Seva Connect" },
      {
        property: "og:description",
        content: "Beneficiary profile, urgency prioritization and assistance history.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { org, can } = useCurrentOrg();
  const qc = useQueryClient();
  const aid = useRelated(
    "assistance_records",
    "beneficiary_id",
    id,
    "*, project:projects(name)",
    "distribution_date",
  );
  const linkedProjects = useRelated(
    "project_beneficiaries",
    "beneficiary_id",
    id,
    "id, project_id, created_at, project:projects(id, name, status)",
  );

  // Fetch all active projects for smart program matching
  const allProjectsQuery = useQuery({
    queryKey: ["org", org.id, "projects", "active-matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", org.id)
        .in("status", ["active", "planned"]);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const [openAidDialog, setOpenAidDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);

  // Enroll beneficiary into a project mutation
  const enrollMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("project_beneficiaries").insert({
        organization_id: org.id,
        project_id: projectId,
        beneficiary_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Beneficiary successfully enrolled in program!");
      qc.invalidateQueries({ queryKey: ["org", org.id] });
    },
    onError: (err: Error) => {
      toast.error(
        err.message.includes("duplicate") ? "Already enrolled in this program." : err.message,
      );
    },
  });

  return (
    <RecordDetail config={beneficiariesConfig} id={id} back="/beneficiaries" titleKey="full_name">
      {(beneficiary) => {
        const urgency = assessUrgency(beneficiary, aid.data ?? []);
        const enrolledProjectIds = (linkedProjects.data ?? [])
          .map((p) => p["project_id"] || p["project"]?.id)
          .filter(Boolean);
        const matches = matchProgramsForBeneficiary(
          beneficiary,
          allProjectsQuery.data ?? [],
          enrolledProjectIds,
        );

        return (
          <>
            {/* Urgent-Case Prioritization Banner */}
            <div
              className={`rounded-xl border p-4 sm:p-5 shadow-xs transition-colors ${
                urgency.level === "critical"
                  ? "bg-destructive/10 border-destructive/30"
                  : urgency.level === "high"
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-muted/40 border-border"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${urgency.badgeClass}`}
                  >
                    {urgency.level === "critical" ? (
                      <AlertTriangle className="h-5 w-5 animate-pulse text-destructive" />
                    ) : urgency.level === "high" ? (
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                    ) : (
                      <HeartHandshake className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground text-base">
                        Case Prioritization Assessment
                      </h3>
                      <Badge variant="outline" className={urgency.badgeClass}>
                        {urgency.label} ({urgency.score}/100)
                      </Badge>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                      {urgency.reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-foreground/60" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {can("assistance.write") && (
                  <Button
                    size="sm"
                    className="shrink-0 sm:self-center"
                    variant={
                      urgency.level === "critical" || urgency.level === "high"
                        ? "default"
                        : "outline"
                    }
                    onClick={() => {
                      setSelectedProjectId(undefined);
                      setOpenAidDialog(true);
                    }}
                  >
                    <PackagePlus className="mr-1.5 h-4 w-4" />
                    Prioritize immediate aid
                  </Button>
                )}
              </div>
            </div>

            {/* Smart Support-Program Matching Section */}
            <Section
              title="Smart Support-Program Matching"
              actions={
                <Badge variant="secondary" className="font-normal text-xs">
                  {matches.filter((m) => !m.isEnrolled).length} recommended match
                  {matches.filter((m) => !m.isEnrolled).length === 1 ? "" : "es"}
                </Badge>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Programs matched dynamically based on category alignment, location proximity, and
                  stated requirements.
                </p>
                {allProjectsQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Calculating program matches…</p>
                ) : matches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No active programs available for matching in this organization.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {matches.slice(0, 4).map((m) => (
                      <div
                        key={m.project["id"]}
                        className={`flex flex-col justify-between rounded-lg border p-3.5 transition-colors ${
                          m.isEnrolled
                            ? "bg-accent/30 border-accent/60"
                            : "bg-card hover:border-primary/50"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to="/projects/$id"
                              params={{ id: m.project["id"] }}
                              className="font-medium text-sm text-foreground hover:text-primary hover:underline"
                            >
                              {m.project["name"]}
                            </Link>
                            <Badge
                              variant="outline"
                              className={
                                m.score >= 70
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              }
                            >
                              {m.score}% match
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3.5 flex items-center justify-between border-t pt-2.5">
                          <span className="text-xs text-muted-foreground">
                            {m.isEnrolled ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled
                              </span>
                            ) : m.remainingCapacity !== null ? (
                              `${m.remainingCapacity} spots left`
                            ) : (
                              "Open capacity"
                            )}
                          </span>
                          {!m.isEnrolled && can("beneficiaries.write") && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={enrollMutation.isPending}
                              onClick={() => enrollMutation.mutate(m.project["id"])}
                            >
                              <FolderPlus className="mr-1 h-3.5 w-3.5" />
                              Enroll
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* Assistance History */}
            <Section
              title="Assistance delivery record"
              actions={
                can("assistance.write") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProjectId(undefined);
                      setOpenAidDialog(true);
                    }}
                  >
                    <PackagePlus className="mr-1 h-3.5 w-3.5" />
                    Record assistance
                  </Button>
                )
              }
            >
              <MiniTable
                rows={aid.data}
                empty="No assistance packages or distributions recorded yet."
                cols={[
                  { label: "Date", render: (r) => formatDate(r["distribution_date"]) },
                  {
                    label: "Type",
                    render: (r) => <span className="font-medium">{r["assistance_type"]}</span>,
                  },
                  { label: "Quantity", render: (r) => `${r["quantity"]} ${r["unit"] ?? ""}` },
                  { label: "Project", render: (r) => r["project"]?.name ?? "—" },
                  { label: "Status", render: (r) => <StatusBadge status={r["status"]} /> },
                ]}
              />
            </Section>

            {/* Enrolled Programs / Associated Projects */}
            <Section
              title="Enrolled programs & projects"
              actions={
                can("beneficiaries.write") && (
                  <QuickAdd
                    label="Link to project"
                    table="project_beneficiaries"
                    fixed={{ beneficiary_id: id }}
                    fields={[
                      {
                        name: "project_id",
                        label: "Project",
                        required: true,
                        options: { table: "projects", label: "name" },
                      },
                    ]}
                  />
                )
              }
            >
              <MiniTable
                rows={linkedProjects.data}
                empty="Not currently enrolled in any programs."
                cols={[
                  {
                    label: "Program / Project",
                    render: (r) =>
                      r["project"] ? (
                        <Link
                          to="/projects/$id"
                          params={{ id: r["project"].id }}
                          className="font-medium text-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {r["project"].name}
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </Link>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    label: "Program Status",
                    render: (r) => <StatusBadge status={r["project"]?.status} />,
                  },
                  { label: "Enrolled Date", render: (r) => formatDate(r["created_at"]) },
                ]}
              />
            </Section>

            <EntityFormDialog
              config={assistanceConfig}
              open={openAidDialog}
              onOpenChange={setOpenAidDialog}
              row={null}
              presets={{
                beneficiary_id: id,
                ...(selectedProjectId ? { project_id: selectedProjectId } : {}),
                ...(beneficiary["support_category"]
                  ? { assistance_type: beneficiary["support_category"] }
                  : {}),
              }}
            />
          </>
        );
      }}
    </RecordDetail>
  );
}
