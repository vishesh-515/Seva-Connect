import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { EntityImportSchema, FieldDefinition } from "./types";

/**
 * Sanitizes values to prevent formula injection attacks (CSV/Excel Formula Injection).
 * Any string beginning with =, +, -, @, \t, or \r is prefixed with a single quote.
 */
export function sanitizeFormulaInjection(value: any): any {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Parses safe dates from various common human / Excel formats.
 * Supports:
 * - ISO: YYYY-MM-DD
 * - Indian / UK: DD-MM-YYYY or DD/MM/YYYY
 * - US: MM/DD/YYYY
 * - Excel date serial numbers
 */
export function parseFlexibleDate(val: any): string | null {
  if (!val) return null;

  // Handle Excel numeric serial dates (e.g. 46313 -> ~2026)
  if (typeof val === "number" || (!isNaN(Number(val)) && Number(val) > 30000 && Number(val) < 80000)) {
    try {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsed = new Date(excelEpoch.getTime() + Number(val) * 86400000);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
      }
    } catch {}
  }

  const s = String(val).trim();
  if (!s) return null;

  // Check ISO format YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
    const y = parseInt(isoMatch[1], 10);
    const m = String(parseInt(isoMatch[2], 10)).padStart(2, "0");
    const d = String(parseInt(isoMatch[3], 10)).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Check DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
    const d = String(parseInt(dmyMatch[1], 10)).padStart(2, "0");
    const m = String(parseInt(dmyMatch[2], 10)).padStart(2, "0");
    const y = parseInt(dmyMatch[3], 10);
    return `${y}-${m}-${d}`;
  }

  // Fallback to native Date parser
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

export interface ParsedRawData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  fileSize: number;
  fileType: "csv" | "xlsx";
}

/**
 * Parses file from browser File object (CSV or XLSX).
 */
export async function parseUploadFile(file: File): Promise<ParsedRawData> {
  const isXLSX =
    file.name.endsWith(".xlsx") ||
    file.name.endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel";

  if (isXLSX) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("The uploaded Excel workbook contains no sheets.");
    }
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error("Could not read sheet data from Excel workbook.");
    }

    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: "",
      raw: false,
    });

    if (rawRows.length === 0) {
      throw new Error("The uploaded spreadsheet is empty.");
    }

    const headers = Object.keys(rawRows[0] || {});
    return {
      headers,
      rows: rawRows,
      fileName: file.name,
      fileSize: file.size,
      fileType: "xlsx",
    };
  }

  // Default to CSV parsing with PapaParse
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      transform: (val) => val.trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0]?.message || "Failed to parse CSV file."));
          return;
        }

        const headers = results.meta.fields || [];
        if (headers.length === 0 || results.data.length === 0) {
          reject(new Error("The CSV file has no headers or data rows."));
          return;
        }

        resolve({
          headers,
          rows: results.data,
          fileName: file.name,
          fileSize: file.size,
          fileType: "csv",
        });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

/**
 * Automatically maps spreadsheet header names to schema field definitions.
 */
export function autoMapColumns(
  headers: string[],
  schema: EntityImportSchema,
): Record<string, string> {
  const mapping: Record<string, string> = {}; // schemaKey -> spreadsheetHeader

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

  schema.fields.forEach((field: FieldDefinition) => {
    // 1. Direct match on key
    const directMatch = headers.find(
      (h) => normalize(h) === normalize(field.key) || normalize(h) === normalize(field.label),
    );
    if (directMatch) {
      mapping[field.key] = directMatch;
      return;
    }

    // 2. Match against aliases
    for (const alias of field.aliases) {
      const aliasMatch = headers.find((h) => normalize(h) === normalize(alias));
      if (aliasMatch) {
        mapping[field.key] = aliasMatch;
        return;
      }
    }
  });

  return mapping;
}
