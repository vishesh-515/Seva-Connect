export type ImportEntityType =
  | "beneficiaries"
  | "projects"
  | "cases"
  | "assistance_records"
  | "programme_matches"
  | "tasks"
  | "follow_ups";

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date" | "enum" | "email" | "phone";
  description: string;
  example: string;
  allowedValues?: string[];
  aliases: string[];
}

export interface EntityImportSchema {
  type: ImportEntityType;
  title: string;
  singular: string;
  description: string;
  order: number;
  tableName: string;
  idField: string;
  fields: FieldDefinition[];
  sampleFileName: string;
  sampleFilePath: string;
}

export type DuplicateStrategy = "skip" | "update" | "reject";

export interface RowValidationMessage {
  row: number;
  field?: string;
  level: "error" | "warning";
  message: string;
  value?: any;
}

export interface ParsedRow {
  _rowNumber: number;
  _raw: Record<string, any>;
  _mapped: Record<string, any>;
  _errors: RowValidationMessage[];
  _warnings: RowValidationMessage[];
  _isValid: boolean;
  _isDuplicate: boolean;
  _status: "valid" | "warning" | "error" | "duplicate";
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  canProceed: boolean;
  unmappedRequiredFields: string[];
  errors: RowValidationMessage[];
  warnings: RowValidationMessage[];
}

export interface ImportResultSummary {
  importId: string;
  entityType: ImportEntityType;
  fileName: string;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  rejectedCount: number;
  durationMs: number;
  completedAt: string;
  status: "success" | "partial" | "failed";
  errors: RowValidationMessage[];
}

export interface ImportHistoryRecord {
  id: string;
  organizationId: string;
  fileName: string;
  entityType: ImportEntityType;
  initiatedBy: string;
  totalRows: number;
  successfulRows: number;
  updatedRows: number;
  skippedRows: number;
  failedRows: number;
  status: "completed" | "partial" | "failed";
  createdAt: string;
  durationMs: number;
  errorReport?: RowValidationMessage[];
}
