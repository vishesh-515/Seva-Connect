import { describe, it, expect } from "vitest";
import { autoMapColumns, parseFlexibleDate, sanitizeFormulaInjection } from "@/lib/importer/parser";
import { IMPORT_SCHEMAS } from "@/lib/importer/schemas";
import { generateCsvTemplate } from "@/lib/importer/templates";
import { validateImportRows } from "@/lib/importer/validator";
import fs from "fs";
import path from "path";

describe("Data Import Centre — Parser & Security", () => {
  it("sanitizes formula injection attempts", () => {
    expect(sanitizeFormulaInjection("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(sanitizeFormulaInjection("+1234567890")).toBe("'+1234567890");
    expect(sanitizeFormulaInjection("-@dangerous")).toBe("'-@dangerous");
    expect(sanitizeFormulaInjection("@malicious")).toBe("'@malicious");
    expect(sanitizeFormulaInjection("Normal Text")).toBe("Normal Text");
    expect(sanitizeFormulaInjection(123)).toBe(123);
  });

  it("safely parses flexible date formats across ISO, Indian/UK, and Excel dates", () => {
    expect(parseFlexibleDate("2026-10-19")).toBe("2026-10-19");
    expect(parseFlexibleDate("19-10-2026")).toBe("2026-10-19");
    expect(parseFlexibleDate("19/10/2026")).toBe("2026-10-19");
    expect(parseFlexibleDate("")).toBeNull();
    expect(parseFlexibleDate(null)).toBeNull();
  });

  it("automatically matches spreadsheet headers to schema fields using aliases", () => {
    const beneficiaryHeaders = [
      "beneficiary_id",
      "full_name",
      "gender",
      "date_of_birth",
      "primary_support_need",
      "priority",
      "status",
      "phone",
      "city",
      "state",
    ];

    const mapping = autoMapColumns(beneficiaryHeaders, IMPORT_SCHEMAS.beneficiaries);
    expect(mapping["code"]).toBe("beneficiary_id");
    expect(mapping["full_name"]).toBe("full_name");
    expect(mapping["support_category"]).toBe("primary_support_need");
    expect(mapping["priority"]).toBe("priority");
    expect(mapping["status"]).toBe("status");
    expect(mapping["region"]).toBe("state");
  });

  it("generates valid CSV templates with sample data for all entity types", () => {
    const entities = [
      "beneficiaries",
      "projects",
      "cases",
      "assistance_records",
      "programme_matches",
      "tasks",
      "follow_ups",
    ] as const;

    entities.forEach((ent) => {
      const csv = generateCsvTemplate(ent);
      expect(csv).toContain(IMPORT_SCHEMAS[ent].idField);
      expect(csv.length).toBeGreaterThan(20);
    });
  });
});

describe("Data Import Centre — Validation Engine", () => {
  it("catches missing required fields and in-file duplicate IDs", async () => {
    const rawRows = [
      {
        beneficiary_id: "BEN-0001",
        name: "Test User 1",
        phone: "9876543210",
      },
      {
        beneficiary_id: "BEN-0001", // Duplicate ID in same file!
        name: "", // Missing required full name!
        phone: "9876543211",
      },
    ];

    const mapping = {
      code: "beneficiary_id",
      full_name: "name",
      phone: "phone",
    };

    const { rows, summary } = await validateImportRows({
      organizationId: "00000000-0000-0000-0000-000000000000",
      schema: IMPORT_SCHEMAS.beneficiaries,
      mapping,
      rawRows,
    });

    expect(summary.totalRows).toBe(2);
    expect(summary.errorRows).toBeGreaterThan(0);
    expect(rows[0]._isValid).toBe(true);
    expect(rows[1]._isValid).toBe(false);
    expect(rows[1]._isDuplicate).toBe(true);
    expect(rows[1]._errors.some((e) => e.message.includes("Missing required field"))).toBe(true);
  });

  it("verifies bundled sample dataset files exist and are verified", () => {
    const sampleDir = path.resolve(process.cwd(), "public", "sample_dataset");
    expect(fs.existsSync(sampleDir)).toBe(true);

    const expectedFiles = [
      "assistance_records.csv",
      "beneficiaries.csv",
      "cases.csv",
      "demo_team.csv",
      "follow_ups.csv",
      "notifications.csv",
      "programme_matches.csv",
      "README.txt",
      "support_programmes.csv",
      "tasks.csv",
      "seva_connect_sample_dataset.zip",
    ];

    expectedFiles.forEach((file) => {
      const filePath = path.join(sampleDir, file);
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(0);
    });
  });
});
