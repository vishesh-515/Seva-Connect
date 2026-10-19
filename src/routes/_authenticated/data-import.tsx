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
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Data Import Centre
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
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
            className="gap-2 border-border/80 font-semibold text-foreground hover:bg-muted"
          >
            <Archive className="h-4 w-4 text-primary" />
            <span>Download Sample Dataset</span>
          </Button>

          {/* Download CSV Templates Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-border/80 font-semibold text-foreground hover:bg-muted">
                <FileDown className="h-4 w-4 text-primary" />
                <span>Download CSV Templates</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs">Database CSV Templates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {Object.values(IMPORT_SCHEMAS).map((s) => (
                <DropdownMenuItem
                  key={s.type}
                  onClick={() => {
                    downloadCsvTemplate(s.type);
                    toast.success(`Downloaded template for ${s.title}`);
                  }}
                  className="text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-primary" />
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
            className="gap-2 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Data</span>
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Total Records Imported</span>
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{totalImported}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Persisted into Supabase</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span>Successful Imports</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{successfulRuns}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Fully validated jobs</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-destructive">
            <span>Rejected Records</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-destructive mt-2">{rejectedRecords}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Failed schema or FK checks</div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-amber-600 dark:text-amber-400">
            <span>Duplicates Skipped</span>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{totalSkipped}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Protected by deduplication</div>
        </div>
      </div>

      {/* Guided Dependency Sequence Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Recommended Multi-File Import Order</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          When populating a complete workspace from relational spreadsheets, import files in this sequence.
          This ensures foreign-key references (e.g. beneficiary IDs in cases and assistance records) link seamlessly without errors.
        </p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {Object.values(IMPORT_SCHEMAS).map((s) => (
            <button
              key={s.type}
              onClick={() => startImportFor(s.type)}
              className="group flex flex-col items-start rounded-xl border border-border/70 bg-card p-3 text-left transition-all hover:border-primary hover:shadow-2xs"
            >
              <div className="flex w-full items-center justify-between">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {s.order}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-2 text-xs font-bold text-foreground truncate w-full">{s.title}</div>
              <span className="text-[10px] text-muted-foreground font-mono">{s.sampleFileName}</span>
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
