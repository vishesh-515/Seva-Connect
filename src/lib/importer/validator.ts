import { supabase } from "@/integrations/supabase/client";
import type {
  EntityImportSchema,
  ParsedRow,
  RowValidationMessage,
  ValidationSummary,
} from "./types";
import { parseFlexibleDate, sanitizeFormulaInjection } from "./parser";
import Papa from "papaparse";

export interface ValidationContext {
  organizationId: string;
  schema: EntityImportSchema;
  mapping: Record<string, string>; // schemaKey -> spreadsheetHeader
  rawRows: Record<string, any>[];
}

/**
 * Validates the entire uploaded dataset against schema rules and existing Supabase records.
 */
export async function validateImportRows(context: ValidationContext): Promise<{
  rows: ParsedRow[];
  summary: ValidationSummary;
}> {
  const { organizationId, schema, mapping, rawRows } = context;

  // 1. Identify missing required fields
  const unmappedRequiredFields: string[] = [];
  schema.fields.forEach((field) => {
    if (field.required && (!mapping[field.key] || mapping[field.key] === "__ignore__")) {
      unmappedRequiredFields.push(field.label);
    }
  });

  // 2. Fetch existing identifiers from Supabase for duplicate & foreign key verification
  const existingBeneficiaryCodes = new Set<string>();
  const existingProjectCodesOrNames = new Set<string>();
  const existingAssistanceReferences = new Set<string>();

  try {
    if (
      schema.type === "beneficiaries" ||
      schema.type === "cases" ||
      schema.type === "assistance_records" ||
      schema.type === "programme_matches" ||
      schema.type === "tasks" ||
      schema.type === "follow_ups"
    ) {
      const { data: bens } = await supabase
        .from("beneficiaries")
        .select("code")
        .eq("organization_id", organizationId);
      bens?.forEach((b) => b.code && existingBeneficiaryCodes.add(b.code.toUpperCase()));
    }

    if (
      schema.type === "projects" ||
      schema.type === "assistance_records" ||
      schema.type === "programme_matches"
    ) {
      const { data: prgs } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", organizationId);
      prgs?.forEach((p) => {
        if (p.name) existingProjectCodesOrNames.add(p.name.toLowerCase());
      });
    }

    if (schema.type === "assistance_records") {
      const { data: asts } = await supabase
        .from("assistance_records")
        .select("reference")
        .eq("organization_id", organizationId);
      asts?.forEach((a) => a.reference && existingAssistanceReferences.add(a.reference.toUpperCase()));
    }
  } catch (err) {
    console.warn("Could not pre-fetch remote records for FK verification:", err);
  }

  // Set for tracking in-file duplicates
  const seenInFileIds = new Set<string>();

  // If importing beneficiaries, rows in this file also count as available beneficiary codes for later rows
  const inFileBeneficiaryCodes = new Set<string>();
  if (schema.type === "beneficiaries") {
    rawRows.forEach((r) => {
      const codeHeader = mapping["code"];
      const codeVal = codeHeader ? r[codeHeader]?.trim()?.toUpperCase() : "";
      if (codeVal) inFileBeneficiaryCodes.add(codeVal);
    });
  }

  const allErrors: RowValidationMessage[] = [];
  const allWarnings: RowValidationMessage[] = [];

  const parsedRows: ParsedRow[] = rawRows.map((rawRow, index) => {
    const rowNumber = index + 1; // 1-indexed for user display
    const mapped: Record<string, any> = {};
    const rowErrors: RowValidationMessage[] = [];
    const rowWarnings: RowValidationMessage[] = [];
    let isDuplicate = false;

    // Map each schema field
    schema.fields.forEach((field) => {
      const sourceHeader = mapping[field.key];
      const rawVal = sourceHeader && sourceHeader !== "__ignore__" ? rawRow[sourceHeader] : undefined;

      // Check required
      if (field.required && (rawVal === undefined || rawVal === null || String(rawVal).trim() === "")) {
        rowErrors.push({
          row: rowNumber,
          field: field.label,
          level: "error",
          message: `Missing required field: ${field.label}`,
          value: rawVal,
        });
        return;
      }

      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === "") {
        return; // Empty optional field is fine
      }

      const strVal = String(rawVal).trim();

      // Type-specific validations
      if (field.type === "number") {
        const num = Number(strVal);
        if (isNaN(num)) {
          rowErrors.push({
            row: rowNumber,
            field: field.label,
            level: "error",
            message: `${field.label} must be a valid number (got "${strVal}")`,
            value: rawVal,
          });
        } else if (field.key === "quantity" && num <= 0) {
          rowErrors.push({
            row: rowNumber,
            field: field.label,
            level: "error",
            message: `Quantity must be greater than 0 (got ${num})`,
            value: rawVal,
          });
        } else if (field.key === "household_size" && (num < 1 || num > 50)) {
          rowWarnings.push({
            row: rowNumber,
            field: field.label,
            level: "warning",
            message: `Household size of ${num} is unusual (expected 1-50)`,
            value: rawVal,
          });
        } else {
          mapped[field.key] = num;
        }
      } else if (field.type === "date") {
        const parsedDate = parseFlexibleDate(strVal);
        if (!parsedDate) {
          rowErrors.push({
            row: rowNumber,
            field: field.label,
            level: "error",
            message: `Invalid date format in ${field.label} (got "${strVal}"). Use YYYY-MM-DD or DD-MM-YYYY.`,
            value: rawVal,
          });
        } else {
          mapped[field.key] = parsedDate;
        }
      } else if (field.type === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
          rowWarnings.push({
            row: rowNumber,
            field: field.label,
            level: "warning",
            message: `Email "${strVal}" might be invalid.`,
            value: rawVal,
          });
        }
        mapped[field.key] = strVal;
      } else if (field.type === "phone") {
        const cleaned = strVal.replace(/[^0-9+]/g, "");
        if (cleaned.length < 7 || cleaned.length > 15) {
          rowWarnings.push({
            row: rowNumber,
            field: field.label,
            level: "warning",
            message: `Contact number "${strVal}" might have an unusual length.`,
            value: rawVal,
          });
        }
        mapped[field.key] = strVal;
      } else if (field.type === "enum" && field.allowedValues) {
        // Soft match allowed values
        const normalized = strVal.toLowerCase();
        const matched = field.allowedValues.find((v) => v.toLowerCase() === normalized);
        if (matched) {
          mapped[field.key] = matched;
        } else {
          // Allow value but flag warning
          rowWarnings.push({
            row: rowNumber,
            field: field.label,
            level: "warning",
            message: `"${strVal}" is not in standard options (${field.allowedValues.slice(0, 4).join(", ")}...). Will be imported as provided.`,
            value: strVal,
          });
          mapped[field.key] = strVal;
        }
      } else {
        mapped[field.key] = strVal;
      }
    });

    // Foreign-key & Relationship Checks
    const checkBenCode = (codeVal?: string, fieldName = "Beneficiary Code") => {
      if (!codeVal) return;
      const upper = codeVal.toUpperCase();
      if (!existingBeneficiaryCodes.has(upper) && !inFileBeneficiaryCodes.has(upper)) {
        rowErrors.push({
          row: rowNumber,
          field: fieldName,
          level: "error",
          message: `Referenced Beneficiary "${codeVal}" was not found in your organization records. Import beneficiaries first.`,
          value: codeVal,
        });
      }
    };

    if (schema.type === "cases") {
      checkBenCode(mapped["beneficiary_id"]);
    } else if (schema.type === "assistance_records") {
      checkBenCode(mapped["beneficiary_id"]);
    } else if (schema.type === "programme_matches") {
      checkBenCode(mapped["beneficiary_id"]);
    } else if (schema.type === "tasks") {
      if (mapped["beneficiary_id"]) checkBenCode(mapped["beneficiary_id"]);
    } else if (schema.type === "follow_ups") {
      checkBenCode(mapped["beneficiary_id"]);
    }

    // In-file duplicate ID checks
    const primaryIdKey = schema.idField;
    const idVal = mapped[primaryIdKey] ? String(mapped[primaryIdKey]).toUpperCase() : null;

    if (idVal) {
      if (seenInFileIds.has(idVal)) {
        isDuplicate = true;
        rowErrors.push({
          row: rowNumber,
          field: schema.fields.find((f) => f.key === primaryIdKey)?.label || "ID",
          level: "error",
          message: `Duplicate identifier "${idVal}" appears multiple times within this file.`,
          value: idVal,
        });
      } else {
        seenInFileIds.add(idVal);
      }

      // Existing DB duplicate checks
      if (schema.type === "beneficiaries" && existingBeneficiaryCodes.has(idVal)) {
        isDuplicate = true;
        rowWarnings.push({
          row: rowNumber,
          field: "Beneficiary ID",
          level: "warning",
          message: `Beneficiary "${idVal}" already exists in the organization database.`,
          value: idVal,
        });
      } else if (schema.type === "assistance_records" && existingAssistanceReferences.has(idVal)) {
        isDuplicate = true;
        rowWarnings.push({
          row: rowNumber,
          field: "Assistance Reference",
          level: "warning",
          message: `Assistance record "${idVal}" already exists in the organization database.`,
          value: idVal,
        });
      }
    }

    allErrors.push(...rowErrors);
    allWarnings.push(...rowWarnings);

    let status: "valid" | "warning" | "error" | "duplicate" = "valid";
    if (rowErrors.length > 0) status = "error";
    else if (isDuplicate) status = "duplicate";
    else if (rowWarnings.length > 0) status = "warning";

    return {
      _rowNumber: rowNumber,
      _raw: rawRow,
      _mapped: mapped,
      _errors: rowErrors,
      _warnings: rowWarnings,
      _isValid: rowErrors.length === 0,
      _isDuplicate: isDuplicate,
      _status: status,
    };
  });

  const totalRows = parsedRows.length;
  const errorRows = parsedRows.filter((r) => r._status === "error").length;
  const duplicateRows = parsedRows.filter((r) => r._isDuplicate).length;
  const warningRows = parsedRows.filter((r) => r._status === "warning").length;
  const validRows = parsedRows.filter((r) => r._status === "valid" || r._status === "warning").length;

  const canProceed = unmappedRequiredFields.length === 0 && errorRows === 0;

  return {
    rows: parsedRows,
    summary: {
      totalRows,
      validRows,
      warningRows,
      errorRows,
      duplicateRows,
      canProceed,
      unmappedRequiredFields,
      errors: allErrors,
      warnings: allWarnings,
    },
  };
}

/**
 * Generates an exportable CSV error report with row numbers, issue details, and original data,
 * fully sanitised against formula injection.
 */
export function generateErrorReportCsv(
  rows: ParsedRow[],
  fileName: string,
): string {
  const problemRows = rows.filter((r) => r._errors.length > 0 || r._warnings.length > 0);

  const reportData = problemRows.map((r) => {
    const errorMessages = r._errors.map((e) => e.message).join(" | ");
    const warningMessages = r._warnings.map((w) => w.message).join(" | ");

    const sanitizedRaw: Record<string, any> = {};
    Object.entries(r._raw).forEach(([k, v]) => {
      sanitizedRaw[k] = sanitizeFormulaInjection(v);
    });

    return {
      "Row Number": r._rowNumber,
      Status: r._status.toUpperCase(),
      "Critical Errors": sanitizeFormulaInjection(errorMessages || "None"),
      Warnings: sanitizeFormulaInjection(warningMessages || "None"),
      ...sanitizedRaw,
    };
  });

  return Papa.unparse(reportData);
}

/**
 * Triggers a browser file download of the CSV error report.
 */
export function downloadErrorReport(rows: ParsedRow[], originalFileName: string) {
  const csvContent = generateErrorReportCsv(rows, originalFileName);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const baseName = originalFileName.replace(/\.[^/.]+$/, "");
  link.setAttribute("download", `${baseName}_import_validation_errors.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
