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
  QrCode,
  Barcode,
} from "lucide-react";
import { BeneficiaryCardModal } from "@/components/beneficiary/BeneficiaryCardModal";
import { DistributionScanner } from "@/components/scanner/DistributionScanner";
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
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

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
    <RecordDetail
      config={beneficiariesConfig}
      id={id}
      back="/beneficiaries"
      titleKey="full_name"
      extraActions={(beneficiary) => (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdCardOpen(true)}
            className="rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] hover:border-[#E29555]"
          >
            <QrCode className="h-4 w-4 text-[#E29555]" />
            <span className="hidden sm:inline">View ID Pass</span>
          </Button>
          {can("assistance.write") && (
            <Button
              size="sm"
              onClick={() => setScannerOpen(true)}
              className="rounded-full bg-gradient-to-r from-[#E29555] to-[#C87A38] text-[#130D0B] font-bold shadow-md hover:brightness-110"
            >
              <Barcode className="h-4 w-4" />
              <span>Quick Distribute</span>
            </Button>
          )}
        </>
      )}
    >
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
              className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
                urgency.level === "critical"
                  ? "bg-[#FFF5F5] border-[#FCDAD7] text-[#D32F2F] dark:bg-[#2E1513] dark:border-[#5A231E]"
                  : urgency.level === "high"
                    ? "bg-[#FFF9F3] border-[#F8E3D2] text-[#C87A38] dark:bg-[#281A15] dark:border-[#48291F]"
                    : "bg-white border-[#E8DFD5] text-[#2A1D17] dark:bg-[#1E1411] dark:border-[#35231C]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      urgency.level === "critical"
                        ? "bg-[#FFEAEA] border-[#FCDAD7] text-[#D32F2F] dark:bg-[#3D1A17] dark:border-[#5A231E] dark:text-[#E05345]"
                        : urgency.level === "high"
                          ? "bg-[#FFF0E0] border-[#F8E3D2] text-[#C87A38] dark:bg-[#2E1A10] dark:border-[#48291F] dark:text-[#E29555]"
                          : "bg-[#FAF7F2] border-[#E8DFD5] text-[#7D6E63] dark:bg-[#221612] dark:border-[#35231C] dark:text-[#AFA196]"
                    }`}
                  >
                    {urgency.level === "critical" ? (
                      <AlertTriangle className="h-5 w-5 animate-pulse text-[#D32F2F] dark:text-[#E05345]" />
                    ) : urgency.level === "high" ? (
                      <AlertCircle className="h-5 w-5 text-[#C87A38] dark:text-[#E29555]" />
                    ) : (
                      <HeartHandshake className="h-5 w-5 text-[#7D6E63] dark:text-[#AFA196]" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[#2A1D17] dark:text-[#FFFDFB] text-base">
                        Case Prioritization Assessment
                      </h3>
                      <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        urgency.level === "critical"
                          ? "bg-[#FFEAEA] border-[#FCDAD7] text-[#D32F2F] dark:bg-[#2E1513] dark:border-[#5A231E] dark:text-[#E05345]"
                          : urgency.level === "high"
                            ? "bg-[#FFF0E0] border-[#F8E3D2] text-[#C87A38] dark:bg-[#281A15] dark:border-[#48291F] dark:text-[#E29555]"
                            : "bg-[#FAF7F2] border-[#E8DFD5] text-[#7D6E63] dark:bg-[#221612] dark:border-[#35231C] dark:text-[#AFA196]"
                      }`}>
                        {urgency.label} ({urgency.score}/100)
                      </Badge>
                    </div>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-[#7D6E63] dark:text-[#AFA196]">
                      {urgency.reasons.map((r, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-[#C87A38] dark:bg-[#E29555]" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {can("assistance.write") && (
                  <Button
                    size="sm"
                    className="shrink-0 sm:self-center rounded-full bg-gradient-to-r from-[#D4843D] to-[#B86B28] text-white font-bold shadow-sm hover:brightness-105"
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
                <Badge variant="secondary" className="font-normal text-xs rounded-full border border-[#E8DFD5] dark:border-[#35231C] bg-[#FAF7F2] dark:bg-[#221612] text-[#7D6E63] dark:text-[#AFA196]">
                  {matches.filter((m) => !m.isEnrolled).length} recommended match
                  {matches.filter((m) => !m.isEnrolled).length === 1 ? "" : "es"}
                </Badge>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-[#7D6E63] dark:text-[#AFA196]">
                  Programs matched dynamically based on category alignment, location proximity, and
                  stated requirements.
                </p>
                {allProjectsQuery.isLoading ? (
                  <p className="text-sm text-[#7D6E63] dark:text-[#AFA196]">Calculating program matches…</p>
                ) : matches.length === 0 ? (
                  <p className="text-sm text-[#7D6E63] dark:text-[#AFA196]">
                    No active programs available for matching in this organization.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {matches.slice(0, 4).map((m) => (
                      <div
                        key={m.project["id"]}
                        className={`flex flex-col justify-between rounded-xl border p-3.5 transition-colors ${
                          m.isEnrolled
                            ? "bg-[#EBF7F0] border-[#C3E6D2] dark:bg-[#16271D] dark:border-[#1F4D34]"
                            : "bg-white border-[#E8DFD5] hover:border-[#C87A38] dark:bg-[#18100D] dark:border-[#35231C] dark:hover:border-[#E29555]"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to="/projects/$id"
                              params={{ id: m.project["id"] }}
                              className="font-bold text-sm text-[#2A1D17] dark:text-[#FFFDFB] hover:text-[#C87A38] dark:hover:text-[#E29555] hover:underline"
                            >
                              {m.project["name"]}
                            </Link>
                            <Badge
                              variant="outline"
                              className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                                m.score >= 70
                                  ? "bg-[#EBF7F0] text-[#2E7D5B] border-[#C3E6D2] dark:bg-[#152B1E] dark:text-[#2EA063] dark:border-[#1F4D34]"
                                  : "bg-[#FFF0E0] text-[#C87A38] border-[#F8E3D2] dark:bg-[#281A15] dark:text-[#E29555] dark:border-[#48291F]"
                              }`}
                            >
                              {m.score}% match
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-md bg-[#FAF7F2] border border-[#E8DFD5] px-2 py-0.5 text-[10px] text-[#7D6E63] dark:bg-[#251814] dark:border-[#35231C] dark:text-[#AFA196]"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3.5 flex items-center justify-between border-t border-[#E8DFD5] dark:border-[#2E1E19] pt-2.5">
                          <span className="text-xs text-[#7D6E63] dark:text-[#AFA196]">
                            {m.isEnrolled ? (
                              <span className="inline-flex items-center gap-1 text-[#2E7D5B] dark:text-[#2EA063] font-medium">
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
                              className="h-7 text-xs rounded-full border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#221612] text-[#2A1D17] dark:text-[#FFFDFB] hover:bg-[#FAF7F2] dark:hover:bg-[#2C1D18] hover:border-[#C87A38] dark:hover:border-[#E29555]"
                              disabled={enrollMutation.isPending}
                              onClick={() => enrollMutation.mutate(m.project["id"])}
                            >
                              <FolderPlus className="mr-1 h-3.5 w-3.5 text-[#C87A38] dark:text-[#E29555]" />
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

            {/* Distribution History */}
            <Section
              title="Distribution records"
              actions={
                can("assistance.write") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedProjectId(undefined);
                      setOpenAidDialog(true);
                    }}
                    className="rounded-full border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#221612] text-[#2A1D17] dark:text-[#FFFDFB] hover:bg-[#FAF7F2] dark:hover:bg-[#2C1D18] hover:border-[#C87A38] dark:hover:border-[#E29555]"
                  >
                    <PackagePlus className="mr-1 h-3.5 w-3.5 text-[#C87A38] dark:text-[#E29555]" />
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

            {/* Beneficiary ID Pass Modal */}
            <BeneficiaryCardModal
              open={idCardOpen}
              onOpenChange={setIdCardOpen}
              beneficiary={beneficiary}
              orgName={org.name}
              onQuickDistribute={() => setScannerOpen(true)}
            />

            {/* Quick Distribution Scanner */}
            <DistributionScanner
              open={scannerOpen}
              onOpenChange={setScannerOpen}
              orgId={org.id}
              initialBeneficiary={beneficiary}
            />
          </>
        );
      }}
    </RecordDetail>
  );
}
