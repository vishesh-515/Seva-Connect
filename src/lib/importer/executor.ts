import { supabase } from "@/integrations/supabase/client";
import type {
  DuplicateStrategy,
  EntityImportSchema,
  ImportHistoryRecord,
  ImportResultSummary,
  ParsedRow,
  RowValidationMessage,
} from "./types";

export interface ExecutionContext {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  schema: EntityImportSchema;
  rows: ParsedRow[];
  strategy: DuplicateStrategy;
  fileName: string;
  onProgress?: (progress: number, currentBatch: number, totalBatches: number) => void;
}

const CHUNK_SIZE = 25;

/**
 * Executes the database commitment of validated rows to Supabase.
 */
export async function executeImport(context: ExecutionContext): Promise<ImportResultSummary> {
  const {
    organizationId,
    userId,
    userEmail,
    schema,
    rows,
    strategy,
    fileName,
    onProgress,
  } = context;

  const startTime = Date.now();
  const importId = `IMP-${Date.now().toString(36).toUpperCase()}`;

  // Filter only valid or warning rows
  let candidateRows = rows.filter((r) => r._status === "valid" || r._status === "warning" || r._isDuplicate);

  // If strategy is "reject" and there are duplicate rows, reject immediately
  if (strategy === "reject") {
    const duplicateRow = candidateRows.find((r) => r._isDuplicate);
    if (duplicateRow) {
      throw new Error(
        `Import rejected by policy: Conflicting duplicate records were detected (e.g. Row ${duplicateRow._rowNumber}).`,
      );
    }
  }

  // Pre-load reference maps (Code -> UUID)
  const beneficiaryMap = new Map<string, string>(); // BEN-XXXX -> uuid
  const projectMap = new Map<string, string>(); // Name/Code -> uuid

  if (
    schema.type === "assistance_records" ||
    schema.type === "cases" ||
    schema.type === "programme_matches" ||
    schema.type === "tasks" ||
    schema.type === "follow_ups"
  ) {
    const { data: bens } = await supabase
      .from("beneficiaries")
      .select("id, code")
      .eq("organization_id", organizationId);
    bens?.forEach((b) => {
      if (b.code) {
        beneficiaryMap.set(b.code.toUpperCase(), b.id);
      }
    });

    const { data: prgs } = await supabase
      .from("projects")
      .select("id, name")
      .eq("organization_id", organizationId);
    prgs?.forEach((p) => {
      if (p.name) {
        projectMap.set(p.name.toLowerCase(), p.id);
      }
    });
  }

  let insertedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let rejectedCount = rows.filter((r) => r._status === "error").length;
  const executionErrors: RowValidationMessage[] = [];

  // 1. IMPORT BENEFICIARIES
  if (schema.type === "beneficiaries") {
    const payloads = candidateRows.map((r) => {
      const m = r._mapped;
      return {
        _rowNumber: r._rowNumber,
        isDup: r._isDuplicate,
        record: {
          organization_id: organizationId,
          code: m["code"] || `BEN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          full_name: m["full_name"],
          date_of_birth: m["date_of_birth"] || null,
          gender: m["gender"] || null,
          phone: m["phone"] || null,
          email: m["email"] || null,
          address: m["address"] || null,
          city: m["city"] || null,
          region: m["region"] || null,
          household_size: m["household_size"] ? Number(m["household_size"]) : null,
          support_category: m["support_category"] || "Other",
          support_requirements: m["notes"] || null,
          notes: m["notes"] || null,
          status: (m["status"]?.toLowerCase() || "active") as any,
          registration_date: m["registration_date"] || new Date().toISOString().slice(0, 10),
        },
      };
    });

    // Handle skip
    let rowsToProcess = payloads;
    if (strategy === "skip") {
      const nonDups = payloads.filter((p) => !p.isDup);
      skippedCount += payloads.length - nonDups.length;
      rowsToProcess = nonDups;
    }

    const totalBatches = Math.ceil(rowsToProcess.length / CHUNK_SIZE);

    for (let i = 0; i < rowsToProcess.length; i += CHUNK_SIZE) {
      const batch = rowsToProcess.slice(i, i + CHUNK_SIZE);
      const batchRecords = batch.map((b) => b.record);

      try {
        if (strategy === "update") {
          const { error } = await supabase
            .from("beneficiaries")
            .upsert(batchRecords, { onConflict: "organization_id, code" });
          if (error) throw error;
          const dups = batch.filter((b) => b.isDup).length;
          updatedCount += dups;
          insertedCount += batch.length - dups;
        } else {
          const { error } = await supabase.from("beneficiaries").insert(batchRecords);
          if (error) throw error;
          insertedCount += batch.length;
        }
      } catch (err: any) {
        batch.forEach((b) => {
          executionErrors.push({
            row: b._rowNumber,
            level: "error",
            message: `Database write failed: ${err.message || "Unknown error"}`,
          });
        });
        rejectedCount += batch.length;
      }

      onProgress?.(
        Math.round(((i + batch.length) / rowsToProcess.length) * 100),
        Math.floor(i / CHUNK_SIZE) + 1,
        totalBatches,
      );
    }
  }

  // 2. IMPORT SUPPORT PROGRAMMES (PROJECTS)
  else if (schema.type === "projects") {
    const payloads = candidateRows.map((r) => {
      const m = r._mapped;
      return {
        _rowNumber: r._rowNumber,
        isDup: r._isDuplicate,
        record: {
          organization_id: organizationId,
          name: m["name"],
          description: m["description"] || null,
          objectives: m["objectives"] || null,
          location: m["location"] || null,
          target_beneficiaries: m["target_beneficiaries"] ? Number(m["target_beneficiaries"]) : null,
          status: (m["status"]?.toLowerCase() || "active") as any,
          start_date: m["start_date"] || null,
          end_date: m["end_date"] || null,
          currency: "INR",
        },
      };
    });

    let rowsToProcess = payloads;
    if (strategy === "skip") {
      const nonDups = payloads.filter((p) => !p.isDup);
      skippedCount += payloads.length - nonDups.length;
      rowsToProcess = nonDups;
    }

    for (let i = 0; i < rowsToProcess.length; i += CHUNK_SIZE) {
      const batch = rowsToProcess.slice(i, i + CHUNK_SIZE);
      const batchRecords = batch.map((b) => b.record);

      try {
        const { error } = await supabase.from("projects").insert(batchRecords);
        if (error) throw error;
        insertedCount += batch.length;
      } catch (err: any) {
        batch.forEach((b) => {
          executionErrors.push({
            row: b._rowNumber,
            level: "error",
            message: `Failed to insert programme: ${err.message}`,
          });
        });
        rejectedCount += batch.length;
      }
    }
  }

  // 3. IMPORT ASSISTANCE RECORDS
  else if (schema.type === "assistance_records") {
    const payloads = candidateRows.map((r) => {
      const m = r._mapped;
      const benCode = m["beneficiary_id"]?.toUpperCase();
      const benUuid = benCode ? beneficiaryMap.get(benCode) : null;

      const prgKey = m["programme_id"]?.toLowerCase();
      const prgUuid = prgKey ? projectMap.get(prgKey) : null;

      return {
        _rowNumber: r._rowNumber,
        isDup: r._isDuplicate,
        benUuid,
        record: {
          organization_id: organizationId,
          reference: m["reference"] || `AST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          beneficiary_id: benUuid,
          project_id: prgUuid || null,
          assistance_type: m["assistance_type"],
          quantity: Number(m["quantity"]) || 1,
          unit: m["unit"] || "kit",
          distribution_date: m["distribution_date"] || new Date().toISOString().slice(0, 10),
          notes: m["notes"] ? `${m["notes"]} (Receipt: ${m["receipt_reference"] || "N/A"})` : null,
          status: (m["status"]?.toLowerCase() === "delivered" ? "distributed" : m["status"]?.toLowerCase() || "distributed") as any,
        },
      };
    });

    // Reject rows missing foreign key
    const validFkRows: typeof payloads = [];
    payloads.forEach((p) => {
      if (!p.benUuid) {
        executionErrors.push({
          row: p._rowNumber,
          level: "error",
          message: "Could not link to beneficiary in database. Beneficiary must exist.",
        });
        rejectedCount++;
      } else {
        validFkRows.push(p);
      }
    });

    let rowsToProcess = validFkRows;
    if (strategy === "skip") {
      const nonDups = validFkRows.filter((p) => !p.isDup);
      skippedCount += validFkRows.length - nonDups.length;
      rowsToProcess = nonDups;
    }

    for (let i = 0; i < rowsToProcess.length; i += CHUNK_SIZE) {
      const batch = rowsToProcess.slice(i, i + CHUNK_SIZE);
      const batchRecords = batch.map((b) => b.record);

      try {
        if (strategy === "update") {
          const { error } = await supabase
            .from("assistance_records")
            .upsert(batchRecords, { onConflict: "organization_id, reference" });
          if (error) throw error;
          const dups = batch.filter((b) => b.isDup).length;
          updatedCount += dups;
          insertedCount += batch.length - dups;
        } else {
          const { error } = await supabase.from("assistance_records").insert(batchRecords as any);
          if (error) throw error;
          insertedCount += batch.length;
        }
      } catch (err: any) {
        batch.forEach((b) => {
          executionErrors.push({
            row: b._rowNumber,
            level: "error",
            message: `Failed to record assistance distribution: ${err.message}`,
          });
        });
        rejectedCount += batch.length;
      }
    }
  }

  // 4. IMPORT CASES (updates beneficiary case notes & priority, records activity log)
  else if (schema.type === "cases") {
    for (const r of candidateRows) {
      const m = r._mapped;
      const benCode = m["beneficiary_id"]?.toUpperCase();
      const benUuid = benCode ? beneficiaryMap.get(benCode) : null;

      if (!benUuid) {
        executionErrors.push({
          row: r._rowNumber,
          level: "error",
          message: `Beneficiary "${benCode}" not found in organization.`,
        });
        rejectedCount++;
        continue;
      }

      try {
        // Update beneficiary record with case distress requirements and urgency priority
        const updatePayload: Record<string, any> = {
          support_requirements: `[Case ${m["case_id"]}] ${m["description"] || ""}${m["next_follow_up_date"] ? ` • Follow-up due: ${m["next_follow_up_date"]}` : ""}`,
        };
        if (m["category"]) updatePayload["support_category"] = m["category"];

        await supabase
          .from("beneficiaries")
          .update(updatePayload)
          .eq("id", benUuid)
          .eq("organization_id", organizationId);

        // Record persistent case log
        await supabase.from("activity_logs").insert({
          organization_id: organizationId,
          actor_id: userId || null,
          action: "created",
          entity_type: "case",
          entity_id: benUuid,
          summary: `Case ${m["case_id"]} registered: ${m["priority"]} priority - ${m["category"] || "General"} (${m["description"]?.slice(0, 80) || ""})`,
          changes: {
            case_id: m["case_id"],
            priority: m["priority"],
            status: m["status"],
            next_follow_up_date: m["next_follow_up_date"],
            suggested_score: m["suggested_score"],
            override_reason: m["priority_override_reason"],
          },
        });

        insertedCount++;
      } catch (err: any) {
        executionErrors.push({
          row: r._rowNumber,
          level: "error",
          message: `Failed to register case: ${err.message}`,
        });
        rejectedCount++;
      }
    }
  }

  // 5. IMPORT PROGRAMME MATCHES (inserts into project_beneficiaries)
  else if (schema.type === "programme_matches") {
    for (const r of candidateRows) {
      const m = r._mapped;
      const benCode = m["beneficiary_id"]?.toUpperCase();
      const benUuid = benCode ? beneficiaryMap.get(benCode) : null;

      const prgKey = m["programme_id"]?.toLowerCase();
      const prgUuid = prgKey ? projectMap.get(prgKey) : null;

      if (!benUuid || !prgUuid) {
        executionErrors.push({
          row: r._rowNumber,
          level: "error",
          message: `Could not link match. Beneficiary (${benCode}) or Programme (${m["programme_id"]}) not found.`,
        });
        rejectedCount++;
        continue;
      }

      try {
        await supabase.from("project_beneficiaries").upsert(
          {
            organization_id: organizationId,
            project_id: prgUuid,
            beneficiary_id: benUuid,
          },
          { onConflict: "project_id, beneficiary_id" },
        );
        insertedCount++;
      } catch (err: any) {
        executionErrors.push({
          row: r._rowNumber,
          level: "error",
          message: `Failed to link programme match: ${err.message}`,
        });
        rejectedCount++;
      }
    }
  }

  // 6. IMPORT TASKS & FOLLOW-UPS (records into activity_logs & notifications)
  else {
    for (const r of candidateRows) {
      const m = r._mapped;
      const benCode = m["beneficiary_id"]?.toUpperCase();
      const benUuid = benCode ? beneficiaryMap.get(benCode) : null;

      try {
        await supabase.from("activity_logs").insert({
          organization_id: organizationId,
          actor_id: userId || null,
          action: "created",
          entity_type: schema.type,
          entity_id: benUuid || null,
          summary: `${schema.singular} registered: ${m["title"] || m["purpose"] || "Item"} (${m["due_date"] || m["scheduled_date"] || "Pending"})`,
          changes: m,
        });
        insertedCount++;
      } catch (err: any) {
        executionErrors.push({
          row: r._rowNumber,
          level: "error",
          message: `Failed to record item: ${err.message}`,
        });
        rejectedCount++;
      }
    }
  }

  const durationMs = Date.now() - startTime;
  let finalStatus: "success" | "partial" | "failed" = "success";
  if (insertedCount === 0 && updatedCount === 0 && rejectedCount > 0) {
    finalStatus = "failed";
  } else if (rejectedCount > 0 || executionErrors.length > 0) {
    finalStatus = "partial";
  }

  // Record Master Audit Log in Supabase activity_logs
  try {
    await supabase.from("activity_logs").insert({
      organization_id: organizationId,
      actor_id: userId || null,
      action: "data_import",
      entity_type: "data_import",
      summary: `Data Import [${schema.title}]: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped, ${rejectedCount} rejected (${(durationMs / 1000).toFixed(1)}s)`,
      changes: {
        importId,
        fileName,
        entityType: schema.type,
        totalRows: rows.length,
        insertedCount,
        updatedCount,
        skippedCount,
        rejectedCount,
        durationMs,
        strategy,
      },
    });
  } catch (err) {
    console.warn("Failed to log data_import activity:", err);
  }

  // Persist Import History to LocalStorage for instant reliable hydration
  saveImportHistoryRecord({
    id: importId,
    organizationId,
    fileName,
    entityType: schema.type,
    initiatedBy: userEmail || "Authorized Staff",
    totalRows: rows.length,
    successfulRows: insertedCount,
    updatedRows: updatedCount,
    skippedRows: skippedCount,
    failedRows: rejectedCount,
    status: finalStatus === "success" ? "completed" : finalStatus === "partial" ? "partial" : "failed",
    createdAt: new Date().toISOString(),
    durationMs,
    errorReport: executionErrors.length > 0 ? executionErrors : undefined,
  });

  return {
    importId,
    entityType: schema.type,
    fileName,
    totalRows: rows.length,
    insertedCount,
    updatedCount,
    skippedCount,
    rejectedCount,
    durationMs,
    completedAt: new Date().toISOString(),
    status: finalStatus,
    errors: executionErrors,
  };
}

const STORAGE_KEY = "seva_connect_import_history";

export function getImportHistory(organizationId: string): ImportHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${organizationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveImportHistoryRecord(record: ImportHistoryRecord) {
  if (typeof window === "undefined") return;
  try {
    const key = `${STORAGE_KEY}_${record.organizationId}`;
    const existing = getImportHistory(record.organizationId);
    const updated = [record, ...existing.slice(0, 49)]; // Keep up to 50 runs
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist import history to localStorage:", err);
  }
}
