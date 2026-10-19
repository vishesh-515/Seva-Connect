import { useState } from "react";
import { format } from "date-fns";
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Calendar,
  User,
  History,
} from "lucide-react";
import type { ImportHistoryRecord } from "@/lib/importer/types";
import { downloadErrorReport } from "@/lib/importer/validator";
import { Button } from "@/components/ui/button";

interface ImportHistoryTableProps {
  records: ImportHistoryRecord[];
}

export function ImportHistoryTable({ records }: ImportHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
          <History className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-foreground">No Import Jobs Recorded Yet</h4>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Spreadsheets imported through the Import Wizard will be permanently audited and listed here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/70 bg-muted/50 text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-3">Import ID / File</th>
              <th className="px-4 py-3">Entity Type</th>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Total Rows</th>
              <th className="px-4 py-3">Success</th>
              <th className="px-4 py-3">Skipped / Failed</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {records.map((r) => {
              const formattedDate = (() => {
                try {
                  return format(new Date(r.createdAt), "dd MMM yyyy, HH:mm");
                } catch {
                  return r.createdAt;
                }
              })();

              return (
                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[180px]">{r.fileName}</span>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground">{r.id}</div>
                  </td>

                  <td className="px-4 py-3 capitalize font-medium text-foreground">
                    <span className="rounded bg-muted px-2 py-0.5 text-[11px]">
                      {r.entityType.replace(/_/g, " ")}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] mt-0.5">
                      <User className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[120px]">{r.initiatedBy}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-semibold text-foreground">{r.totalRows}</td>

                  <td className="px-4 py-3">
                    <span className="font-bold text-emerald-600">
                      {r.successfulRows + (r.updatedRows || 0)}
                    </span>
                    {r.updatedRows > 0 && (
                      <span className="text-[10px] text-muted-foreground ml-1">({r.updatedRows} upd)</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.skippedRows > 0 && (
                        <span className="text-amber-600" title="Skipped duplicate rows">
                          {r.skippedRows} skip
                        </span>
                      )}
                      {r.failedRows > 0 && (
                        <span className="text-destructive font-bold" title="Failed validation">
                          {r.failedRows} err
                        </span>
                      )}
                      {r.skippedRows === 0 && r.failedRows === 0 && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : r.status === "partial"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {r.status === "completed" && <CheckCircle2 className="h-3 w-3" />}
                      {r.status === "partial" && <AlertTriangle className="h-3 w-3" />}
                      {r.status === "failed" && <XCircle className="h-3 w-3" />}
                      {r.status.toUpperCase()}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {r.errorReport && r.errorReport.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // generate CSV report from error records
                          const reportData = r.errorReport!.map((e) => ({
                            Row: e.row,
                            Field: e.field || "General",
                            Level: e.level,
                            Message: e.message,
                          }));
                          import("papaparse").then((Papa) => {
                            const csv = Papa.default.unparse(reportData);
                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `${r.id}_error_report.csv`;
                            a.click();
                            URL.revokeObjectURL(a.href);
                          });
                        }}
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> Errors
                      </Button>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Clean</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
