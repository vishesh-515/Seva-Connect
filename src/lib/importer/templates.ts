import { IMPORT_SCHEMAS } from "./schemas";
import type { ImportEntityType } from "./types";
import Papa from "papaparse";

/**
 * Generates CSV template content with header row, documentation description row, and sample row.
 */
export function generateCsvTemplate(entityType: ImportEntityType): string {
  const schema = IMPORT_SCHEMAS[entityType];
  if (!schema) throw new Error(`Schema not found for entity: ${entityType}`);

  const headers = schema.fields.map((f) => f.key);
  const sampleRow: Record<string, string> = {};

  schema.fields.forEach((f) => {
    sampleRow[f.key] = f.example;
  });

  return Papa.unparse({
    fields: headers,
    data: [sampleRow],
  });
}

/**
 * Triggers a download of the CSV template for an entity.
 */
export function downloadCsvTemplate(entityType: ImportEntityType) {
  const schema = IMPORT_SCHEMAS[entityType];
  if (!schema) return;

  const csvContent = generateCsvTemplate(entityType);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `seva_connect_template_${entityType}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
