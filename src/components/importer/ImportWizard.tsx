import { useState, useId } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  Sparkles,
  ShieldCheck,
  Download,
  ExternalLink,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { IMPORT_SCHEMAS } from "@/lib/importer/schemas";
import type {
  DuplicateStrategy,
  ImportEntityType,
  ImportResultSummary,
  ParsedRow,
  ValidationSummary,
} from "@/lib/importer/types";
import { autoMapColumns, parseUploadFile } from "@/lib/importer/parser";
import { downloadErrorReport, validateImportRows } from "@/lib/importer/validator";
import { executeImport } from "@/lib/importer/executor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Link } from "@tanstack/react-router";

interface ImportWizardProps {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  initialEntityType?: ImportEntityType;
  onClose?: () => void;
  onImportComplete?: (result: ImportResultSummary) => void;
}

const STEPS = [
  { id: 1, title: "Data Type" },
  { id: 2, title: "Upload File" },
  { id: 3, title: "Map Columns" },
  { id: 4, title: "Validate" },
  { id: 5, title: "Confirm" },
  { id: 6, title: "Results" },
];

export function ImportWizard({
  organizationId,
  userId,
  userEmail,
  initialEntityType = "beneficiaries",
  onClose,
  onImportComplete,
}: ImportWizardProps) {
  const queryClient = useQueryClient();
  const fileInputId = useId();

  // Step state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedEntity, setSelectedEntity] = useState<ImportEntityType>(initialEntityType);

  // File & Raw data state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Column mapping state: schemaKey -> spreadsheetHeader
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "warning" | "error" | "duplicate">("all");

  // Duplicate strategy & confirmation
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("skip");
  const [confirmed, setConfirmed] = useState(false);

  // Execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);

  const activeSchema = IMPORT_SCHEMAS[selectedEntity];

  // STEP 2: Handle file drop or selection
  const handleFileSelected = async (file: File) => {
    setIsLoadingFile(true);
    try {
      const parsed = await parseUploadFile(file);
      setUploadedFile(file);
      setFileHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Automatically map columns based on schema aliases
      const autoMapped = autoMapColumns(parsed.headers, activeSchema);
      setColumnMapping(autoMapped);

      toast.success(`Loaded "${file.name}" with ${parsed.rows.length} rows.`);
      setCurrentStep(3);
    } catch (err: any) {
      toast.error(err.message || "Failed to process file.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Quick action: load the official sample dataset for this entity
  const handleLoadSampleDataset = async () => {
    setIsLoadingFile(true);
    try {
      const response = await fetch(activeSchema.sampleFilePath);
      if (!response.ok) {
        throw new Error(`Sample file not found at ${activeSchema.sampleFilePath}`);
      }
      const text = await response.text();
      const blob = new Blob([text], { type: "text/csv" });
      const sampleFile = new File([blob], activeSchema.sampleFileName, { type: "text/csv" });
      await handleFileSelected(sampleFile);
    } catch (err: any) {
      toast.error(err.message || "Failed to load sample dataset.");
    } finally {
      setIsLoadingFile(false);
    }
  };

  // STEP 3 -> STEP 4: Run validation
  const handleProceedToValidation = async () => {
    setIsValidating(true);
    try {
      const { rows, summary } = await validateImportRows({
        organizationId,
        schema: activeSchema,
        mapping: columnMapping,
        rawRows,
      });

      setParsedRows(rows);
      setValidationSummary(summary);
      setCurrentStep(4);
    } catch (err: any) {
      toast.error(err.message || "Validation failed.");
    } finally {
      setIsValidating(false);
    }
  };

  // STEP 5 -> STEP 6: Execute Import
  const handleExecuteImport = async () => {
    if (!confirmed) {
      toast.error("Please explicitly confirm before committing the import.");
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(5);
    try {
      const result = await executeImport({
        organizationId,
        userId,
        userEmail,
        schema: activeSchema,
        rows: parsedRows,
        strategy: duplicateStrategy,
        fileName: uploadedFile?.name || activeSchema.sampleFileName,
        onProgress: (pct) => setExecutionProgress(Math.max(15, pct)),
      });

      setImportResult(result);
      setExecutionProgress(100);

      // Invalidate all query caches so dashboards and lists immediately update
      await queryClient.invalidateQueries();

      toast.success(
        `Import completed: ${result.insertedCount} inserted, ${result.updatedCount} updated, ${result.skippedCount} skipped.`,
      );

      onImportComplete?.(result);
      setCurrentStep(6);
    } catch (err: any) {
      toast.error(err.message || "Import execution encountered an error.");
    } finally {
      setIsExecuting(false);
    }
  };

  // Filtered rows for Step 4 Preview Table
  const displayRows = parsedRows.filter((r) => {
    if (previewFilter === "all") return true;
    if (previewFilter === "valid") return r._status === "valid";
    if (previewFilter === "warning") return r._status === "warning";
    if (previewFilter === "error") return r._status === "error";
    if (previewFilter === "duplicate") return r._isDuplicate;
    return true;
  });

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Wizard Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-border/70 bg-muted/40 px-6 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
              {currentStep}
            </span>
            <h2 className="text-base font-bold text-foreground">Import Wizard: {activeSchema.title}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{activeSchema.description}</p>
        </div>

        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
        )}
      </div>

      {/* Wizard Step Progression Bar */}
      <div className="border-b border-border/60 bg-card px-6 py-3">
        <div className="grid grid-cols-6 gap-2">
          {STEPS.map((s) => {
            const isPassed = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div key={s.id} className="flex flex-col gap-1.5">
                <div
                  className={`h-1.5 w-full rounded-full transition-all ${
                    isCurrent
                      ? "bg-primary shadow-xs"
                      : isPassed
                      ? "bg-primary/50"
                      : "bg-muted"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium truncate ${
                    isCurrent ? "font-bold text-primary" : isPassed ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.id}. {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Body */}
      <div className="p-6">
        {/* ================= STEP 1: SELECT DATA TYPE ================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Select the type of NGO records to import</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose the entity that matches your spreadsheet. For related datasets, follow the recommended import order.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.values(IMPORT_SCHEMAS).map((s) => {
                const isSelected = selectedEntity === s.type;
                return (
                  <div
                    key={s.type}
                    onClick={() => setSelectedEntity(s.type)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border/80 bg-background hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        #{s.order}
                      </span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="mt-2 text-sm font-bold text-foreground">{s.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <span>{s.fields.length} schema fields</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{s.sampleFileName}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <div className="text-xs text-muted-foreground">
                Step 1 of 6 • Selected: <strong className="text-foreground">{activeSchema.title}</strong>
              </div>
              <Button onClick={() => setCurrentStep(2)} className="gap-2 bg-primary text-primary-foreground font-semibold">
                Continue to Upload <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: UPLOAD FILE ================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Upload Spreadsheet for {activeSchema.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports Comma-Separated Values (<code className="font-mono font-bold text-foreground">.csv</code>) and Excel (<code className="font-mono font-bold text-foreground">.xlsx</code>).
                </p>
              </div>

              {/* Sample Dataset Shortcut Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadSampleDataset}
                disabled={isLoadingFile}
                className="gap-2 rounded-full border-[#48291F] bg-[#281A15] text-[#E29555] hover:bg-[#35211A] hover:border-[#E29555] font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Load Sample {activeSchema.sampleFileName} ↗
              </Button>
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelected(e.dataTransfer.files[0]);
                }
              }}
              className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#35231C] bg-[#1E1411] p-10 text-center transition-all hover:border-[#E29555] hover:bg-[#251914]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#281A15] border border-[#48291F] text-[#E29555] mb-4">
                <UploadCloud className="h-7 w-7" />
              </div>
              <div className="text-sm font-bold text-[#FFFDFB]">Drag and drop your spreadsheet here</div>
              <p className="mt-1 text-xs text-[#AFA196] max-w-sm">
                Or browse files from your computer. Standard CSV and Excel files up to 10MB are supported.
              </p>

              <div className="mt-5">
                <input
                  id={fileInputId}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById(fileInputId)?.click()}
                  disabled={isLoadingFile}
                  className="gap-2 rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18] hover:border-[#E29555] font-medium"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#E29555]" />
                  {isLoadingFile ? "Reading Spreadsheet..." : "Browse Spreadsheet ↗"}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)} className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: MAP COLUMNS ================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Verify & Map Columns</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  We automatically matched your spreadsheet headers to database fields. Review required fields before proceeding.
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                File: {uploadedFile?.name} ({rawRows.length} rows detected)
              </div>
            </div>

            {/* Column Mapping Table */}
            <div className="rounded-xl border border-border/70 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border/70 bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Target Field</th>
                    <th className="px-4 py-2.5 font-semibold">Requirement</th>
                    <th className="px-4 py-2.5 font-semibold">Spreadsheet Column</th>
                    <th className="px-4 py-2.5 font-semibold">Sample Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-card">
                  {activeSchema.fields.map((f) => {
                    const mappedHeader = columnMapping[f.key] || "";
                    const isMapped = !!mappedHeader && mappedHeader !== "__ignore__";
                    const sampleVal = isMapped && rawRows[0] ? String(rawRows[0][mappedHeader] ?? "") : "";

                    return (
                      <tr key={f.key} className={f.required && !isMapped ? "bg-destructive/5" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{f.label}</div>
                          <div className="text-[10px] text-muted-foreground">{f.description}</div>
                        </td>
                        <td className="px-4 py-3">
                          {f.required ? (
                            <span className="rounded bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              Required
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={mappedHeader}
                            onChange={(e) =>
                              setColumnMapping({ ...columnMapping, [f.key]: e.target.value })
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium bg-background text-foreground focus:ring-1 focus:ring-primary ${
                              f.required && !isMapped
                                ? "border-destructive text-destructive"
                                : "border-border"
                            }`}
                          >
                            <option value="">— Select Column —</option>
                            <option value="__ignore__">Ignore (Do not map)</option>
                            {fileHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground max-w-[200px] truncate">
                          {sampleVal || <span className="italic text-muted-foreground/50">Example: {f.example}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)} className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to Upload
              </Button>
              <Button
                onClick={handleProceedToValidation}
                disabled={isValidating}
                className="gap-2 bg-primary text-primary-foreground font-semibold"
              >
                {isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Validate & Preview Rows
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: PREVIEW & VALIDATE ================= */}
        {currentStep === 4 && validationSummary && (
          <div className="space-y-6">
            {/* Validation Metrics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
                <span className="text-xs text-muted-foreground">Total Rows</span>
                <div className="text-xl font-bold text-foreground mt-0.5">{validationSummary.totalRows}</div>
              </div>

              <div
                onClick={() => setPreviewFilter("valid")}
                className={`cursor-pointer rounded-xl border p-3 shadow-2xs transition-all ${
                  previewFilter === "valid" ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500" : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-emerald-600 font-medium">
                  <span>Valid Rows</span>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">{validationSummary.validRows}</div>
              </div>

              <div
                onClick={() => setPreviewFilter("warning")}
                className={`cursor-pointer rounded-xl border p-3 shadow-2xs transition-all ${
                  previewFilter === "warning" ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500" : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-amber-600 font-medium">
                  <span>Warnings</span>
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold text-amber-600 mt-0.5">{validationSummary.warningRows}</div>
              </div>

              <div
                onClick={() => setPreviewFilter("error")}
                className={`cursor-pointer rounded-xl border p-3 shadow-2xs transition-all ${
                  previewFilter === "error" ? "border-destructive bg-destructive/10 ring-1 ring-destructive" : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-destructive font-medium">
                  <span>Critical Errors</span>
                  <XCircle className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold text-destructive mt-0.5">{validationSummary.errorRows}</div>
              </div>

              <div
                onClick={() => setPreviewFilter("duplicate")}
                className={`cursor-pointer rounded-xl border p-3 shadow-2xs transition-all ${
                  previewFilter === "duplicate" ? "border-blue-500 bg-blue-500/10 ring-1 ring-blue-500" : "border-border/70 bg-card"
                }`}
              >
                <div className="flex items-center justify-between text-xs text-blue-600 font-medium">
                  <span>Duplicates</span>
                  <HelpCircle className="h-3.5 w-3.5" />
                </div>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{validationSummary.duplicateRows}</div>
              </div>
            </div>

            {/* Error or Warning Notice */}
            {validationSummary.errorRows > 0 && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
                <div className="flex items-start gap-2.5">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-destructive">
                      Validation detected {validationSummary.errorRows} rows with critical errors
                    </div>
                    <p className="text-xs text-destructive/90 mt-0.5">
                      Records with critical errors (such as missing required fields or invalid foreign keys) cannot be imported.
                      Download the error report to inspect and resolve spreadsheet issues.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadErrorReport(parsedRows, uploadedFile?.name || "import")}
                  className="gap-1.5 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download Error Report
                </Button>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter preview:</span>
              {(["all", "valid", "warning", "error", "duplicate"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setPreviewFilter(f)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    previewFilter === f
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  }`}
                >
                  {f} ({f === "all" ? parsedRows.length : parsedRows.filter((r) => (f === "duplicate" ? r._isDuplicate : r._status === f)).length})
                </button>
              ))}
            </div>

            {/* Interactive Preview Table */}
            <div className="rounded-xl border border-border/70 overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-border/70 bg-muted/80 backdrop-blur-xs text-muted-foreground font-semibold">
                  <tr>
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Status</th>
                    {activeSchema.fields.slice(0, 4).map((f) => (
                      <th key={f.key} className="px-3 py-2">
                        {f.label}
                      </th>
                    ))}
                    <th className="px-3 py-2">Validation Diagnostics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 bg-card font-mono text-[11px]">
                  {displayRows.slice(0, 50).map((r) => (
                    <tr
                      key={r._rowNumber}
                      className={
                        r._status === "error"
                          ? "bg-destructive/5"
                          : r._isDuplicate
                          ? "bg-blue-500/5"
                          : r._status === "warning"
                          ? "bg-amber-500/5"
                          : ""
                      }
                    >
                      <td className="px-3 py-2 font-bold text-foreground">{r._rowNumber}</td>
                      <td className="px-3 py-2 font-sans">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r._status === "error"
                              ? "bg-destructive/10 text-destructive"
                              : r._status === "warning"
                              ? "bg-amber-500/10 text-amber-600"
                              : r._isDuplicate
                              ? "bg-blue-500/10 text-blue-600"
                              : "bg-emerald-500/10 text-emerald-600"
                          }`}
                        >
                          {r._status.toUpperCase()}
                        </span>
                      </td>
                      {activeSchema.fields.slice(0, 4).map((f) => (
                        <td key={f.key} className="px-3 py-2 truncate max-w-[140px]">
                          {String(r._mapped[f.key] ?? "—")}
                        </td>
                      ))}
                      <td className="px-3 py-2 font-sans text-xs">
                        {r._errors.length > 0 ? (
                          <span className="text-destructive font-medium">{r._errors[0]?.message}</span>
                        ) : r._warnings.length > 0 ? (
                          <span className="text-amber-600">{r._warnings[0]?.message}</span>
                        ) : r._isDuplicate ? (
                          <span className="text-blue-600">Existing ID detected</span>
                        ) : (
                          <span className="text-emerald-600">All checks passed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)} className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Edit Column Mappings
              </Button>
              <Button
                onClick={() => setCurrentStep(5)}
                disabled={validationSummary.validRows === 0}
                className="gap-2 bg-primary text-primary-foreground font-semibold"
              >
                Proceed to Confirmation <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 5: CONFIRM & DUPLICATE STRATEGY ================= */}
        {currentStep === 5 && validationSummary && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Select Duplicate Handling Policy & Confirm</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure how the system handles rows with matching unique identifiers in the database.
              </p>
            </div>

            {/* Duplicate Strategy Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div
                onClick={() => setDuplicateStrategy("skip")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  duplicateStrategy === "skip"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-background hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Skip Duplicates</span>
                  {duplicateStrategy === "skip" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  (Recommended) Ignore existing records safely. Only new records will be inserted.
                </p>
              </div>

              <div
                onClick={() => setDuplicateStrategy("update")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  duplicateStrategy === "update"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-background hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Update Existing Records</span>
                  {duplicateStrategy === "update" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Overwrite existing records with newly imported values where the entity supports safe updates.
                </p>
              </div>

              <div
                onClick={() => setDuplicateStrategy("reject")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  duplicateStrategy === "reject"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                    : "border-border/80 bg-background hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Reject on Conflict</span>
                  {duplicateStrategy === "reject" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Abort and reject the import if any conflicting identifier is detected.
                </p>
              </div>
            </div>

            {/* Impact Calculation Preview */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="text-xs font-semibold text-foreground uppercase tracking-wider">Projected Database Impact</div>
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">New Records to Insert:</span>
                  <div className="text-base font-bold text-emerald-600 mt-0.5">
                    {validationSummary.validRows - (duplicateStrategy === "skip" ? validationSummary.duplicateRows : 0)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Records to Update:</span>
                  <div className="text-base font-bold text-blue-600 mt-0.5">
                    {duplicateStrategy === "update" ? validationSummary.duplicateRows : 0}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Records to Skip:</span>
                  <div className="text-base font-bold text-amber-600 mt-0.5">
                    {duplicateStrategy === "skip" ? validationSummary.duplicateRows : 0}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Invalid Rows Rejected:</span>
                  <div className="text-base font-bold text-destructive mt-0.5">
                    {validationSummary.errorRows}
                  </div>
                </div>
              </div>
            </div>

            {/* Explicit Confirmation Checkbox */}
            <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <input
                id="confirm-import"
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="confirm-import" className="text-xs text-foreground cursor-pointer select-none">
                <strong className="block font-bold">Explicit Import Confirmation</strong>
                I confirm that I want to import these validated records into the current organization workspace.
                This action is audited and will be permanently recorded in Supabase.
              </label>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/60">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)} className="gap-1.5 text-muted-foreground">
                <ArrowLeft className="h-4 w-4" /> Back to Validation
              </Button>
              <Button
                onClick={handleExecuteImport}
                disabled={!confirmed || isExecuting}
                className="gap-2 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90"
              >
                {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {isExecuting ? "Importing Records..." : "Commit Data Import"}
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 6: LIVE RESULTS ================= */}
        {currentStep === 6 && importResult && (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">Data Import Successfully Processed</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Records have been validated and persisted into your organization workspace in Supabase.
              </p>
            </div>

            {/* Final Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
                <span className="text-[11px] text-muted-foreground">Successfully Inserted</span>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">{importResult.insertedCount}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
                <span className="text-[11px] text-muted-foreground">Updated Records</span>
                <div className="text-xl font-bold text-blue-600 mt-0.5">{importResult.updatedCount}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
                <span className="text-[11px] text-muted-foreground">Skipped Records</span>
                <div className="text-xl font-bold text-amber-600 mt-0.5">{importResult.skippedCount}</div>
              </div>
              <div className="rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
                <span className="text-[11px] text-muted-foreground">Import Duration</span>
                <div className="text-xl font-bold text-foreground mt-0.5">{(importResult.durationMs / 1000).toFixed(1)}s</div>
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Link
                to={
                  selectedEntity === "beneficiaries"
                    ? "/beneficiaries"
                    : selectedEntity === "projects"
                    ? "/projects"
                    : selectedEntity === "assistance_records"
                    ? "/assistance"
                    : "/dashboard"
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
              >
                <span>View {activeSchema.title} in Directory</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentStep(1);
                  setUploadedFile(null);
                  setRawRows([]);
                  setParsedRows([]);
                  setValidationSummary(null);
                  setImportResult(null);
                  setConfirmed(false);
                }}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Import Another Dataset
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
