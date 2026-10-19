import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  FileDown,
  Archive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  FolderDown,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  RefreshCw,
} from "lucide-react";
import { useOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportWizard } from "@/components/importer/ImportWizard";
import { ImportHistoryTable } from "@/components/importer/ImportHistoryTable";
import { getImportHistory } from "@/lib/importer/executor";
import { downloadCsvTemplate } from "@/lib/importer/templates";
import { IMPORT_SCHEMAS } from "@/lib/importer/schemas";
import type { ImportEntityType, ImportHistoryRecord } from "@/lib/importer/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/data-import")({
  component: DataImportCentrePage,
});

function DataImportCentrePage() {
  const { org, userEmail, can } = useOrg();
  const [showWizard, setShowWizard] = useState(false);
  const [selectedEntityForWizard, setSelectedEntityForWizard] = useState<ImportEntityType>("beneficiaries");
  const [history, setHistory] = useState<ImportHistoryRecord[]>([]);

  // Refresh history on mount and upon import completion
  const refreshHistory = () => {
    if (org?.id) {
      setHistory(getImportHistory(org.id));
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [org?.id]);

  // Aggregate statistics
  const totalImported = history.reduce((sum, h) => sum + h.successfulRows + (h.updatedRows || 0), 0);
  const successfulRuns = history.filter((h) => h.status === "completed").length;
  const rejectedRecords = history.reduce((sum, h) => sum + h.failedRows, 0);
  const totalSkipped = history.reduce((sum, h) => sum + h.skippedRows, 0);

  const startImportFor = (entity: ImportEntityType) => {
    setSelectedEntityForWizard(entity);
    setShowWizard(true);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  const handleDownloadSampleDataset = () => {
    const link = document.createElement("a");
    link.href = "/sample_dataset/seva_connect_sample_dataset.zip";
    link.download = "seva_connect_sample_dataset.zip";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloading complete Seva Connect sample dataset (ZIP)...");
  };

  if (!org) return null;

  return (
    <div className="space-y-8 p-6 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#281A15] border border-[#48291F] text-[#E29555] shadow-xs">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="shubh-eyebrow">
                  <Sparkles className="h-3 w-3 text-[#E29555]" />
                  Spreadsheet Ingestion
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#FFFDFB] mt-1">
                Data Import <span className="heading-copper">Centre</span>
              </h1>
              <p className="text-xs text-[#AFA196] mt-0.5">
                Import, validate, and organise NGO records from your existing spreadsheets.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Sample Dataset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSampleDataset}
            className="gap-2 rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] hover:border-[#E29555] font-semibold"
          >
            <Archive className="h-4 w-4 text-[#E29555]" />
            <span>Download Sample Dataset ↗</span>
          </Button>

          {/* Download CSV Templates Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] font-semibold">
                <FileDown className="h-4 w-4 text-[#E29555]" />
                <span>Download CSV Templates</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl border-[#35231C] bg-[#1E1411] text-[#FFFDFB]">
              <DropdownMenuLabel className="text-xs text-[#AFA196]">Database CSV Templates</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#2E1E19]" />
              {Object.values(IMPORT_SCHEMAS).map((s) => (
                <DropdownMenuItem
                  key={s.type}
                  onClick={() => {
                    downloadCsvTemplate(s.type);
                    toast.success(`Downloaded template for ${s.title}`);
                  }}
                  className="text-xs cursor-pointer hover:bg-[#281A15] hover:text-[#E29555]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-[#E29555]" />
                  <span>{s.title} Template</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upload Data Button */}
          <Button
            size="sm"
            onClick={() => {
              setShowWizard(true);
              window.scrollTo({ top: 350, behavior: "smooth" });
            }}
            className="gap-2 rounded-full bg-gradient-to-r from-[#E29555] to-[#C87A38] text-[#130D0B] font-bold shadow-md hover:brightness-110"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Data ↗</span>
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#AFA196]">
            <span>Total Records</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#281A15] border border-[#48291F] text-[#E29555]">
              <Database className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#FFFDFB] mt-2">{totalImported}</div>
          <div className="text-[11px] text-[#AFA196] mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E29555]" />
            Persisted into Supabase
          </div>
        </div>

        <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#34D399]">
            <span>Successful Imports</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#152B1E] border border-[#1F4D34] text-[#34D399]">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#34D399] mt-2">{successfulRuns}</div>
          <div className="text-[11px] text-[#AFA196] mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            Fully validated jobs
          </div>
        </div>

        <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#E05345]">
            <span>Rejected Records</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2E1513] border border-[#5A231E] text-[#E05345]">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#E05345] mt-2">{rejectedRecords}</div>
          <div className="text-[11px] text-[#AFA196] mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E05345]" />
            Failed schema checks
          </div>
        </div>

        <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-5 shadow-xs interactive-card">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#E29555]">
            <span>Duplicates Skipped</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#281A15] border border-[#48291F] text-[#E29555]">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-[#E29555] mt-2">{totalSkipped}</div>
          <div className="text-[11px] text-[#AFA196] mt-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E29555]" />
            Protected by deduplication
          </div>
        </div>
      </div>

      {/* Guided Dependency Sequence Banner */}
      <div className="rounded-2xl border border-[#35231C] bg-[#1E1411] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="shubh-eyebrow">
              <Layers className="h-3 w-3 text-[#E29555]" />
              Relational Architecture
            </span>
            <h3 className="text-sm font-bold text-[#FFFDFB]">Recommended Multi-File Import Order</h3>
          </div>
          <span className="text-[11px] text-[#AFA196] hidden sm:inline">6 Core Schemas</span>
        </div>
        <p className="text-xs text-[#AFA196] mt-2 max-w-3xl">
          When populating a complete workspace from relational spreadsheets, import files in this sequence.
          This ensures foreign-key references link seamlessly without database integrity violations.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {Object.values(IMPORT_SCHEMAS).map((s) => (
            <button
              key={s.type}
              onClick={() => startImportFor(s.type)}
              className="group flex flex-col items-start rounded-xl border border-[#35231C] bg-[#221612] p-3 text-left transition-all hover:border-[#E29555] hover:bg-[#281A15]"
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#281A15] border border-[#48291F] text-[10px] font-bold text-[#E29555]">
                  {s.order}
                </span>
                <span className="text-[11px] font-bold text-[#E29555] opacity-60 group-hover:opacity-100 transition-opacity">
                  ↗
                </span>
              </div>
              <div className="mt-2 text-xs font-bold text-[#FFFDFB] truncate w-full">{s.title}</div>
              <span className="text-[10px] text-[#AFA196] font-mono">{s.sampleFileName}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Embedded / Active Import Wizard */}
      {showWizard && (
        <div className="scroll-mt-6">
          <ImportWizard
            organizationId={org.id}
            userId={org.created_by || undefined}
            userEmail={userEmail}
            initialEntityType={selectedEntityForWizard}
            onClose={() => setShowWizard(false)}
            onImportComplete={() => {
              refreshHistory();
            }}
          />
        </div>
      )}

      {/* Persistent Import History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Recent Import History</h3>
            <p className="text-xs text-muted-foreground">
              Audited spreadsheet imports committed to this organization.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshHistory} className="h-8 gap-1 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh History
          </Button>
        </div>

        <ImportHistoryTable records={history} />
      </div>
    </div>
  );
}
