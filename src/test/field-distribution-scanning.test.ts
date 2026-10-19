import { describe, expect, it } from "vitest";
import {
  generateBeneficiaryQRCodeSVG,
  generateBeneficiaryQRCodeDataURL,
  isValidBeneficiaryCode,
  extractBeneficiaryCode,
} from "@/lib/qr";
import {
  playSuccessBeep,
  playWarningBeep,
  triggerHapticFeedback,
} from "@/lib/distribution-service";

describe("Beneficiary QR Code Engine", () => {
  it("generates valid SVG markup containing only the non-sensitive identifier", async () => {
    const code = "BEN-0042";
    const svg = await generateBeneficiaryQRCodeSVG(code);

    expect(svg).toBeDefined();
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    // Strict privacy verification: never encode PII
    expect(svg).not.toContain("John");
    expect(svg).not.toContain("+91");
    expect(svg).not.toContain("Aadhaar");
  });

  it("generates valid PNG Data URL for download pass", async () => {
    const code = "BEN-9912";
    const dataUrl = await generateBeneficiaryQRCodeDataURL(code);

    expect(dataUrl).toBeDefined();
    expect(dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("validates beneficiary code formats accurately", () => {
    expect(isValidBeneficiaryCode("BEN-0042")).toBe(true);
    expect(isValidBeneficiaryCode("BEN_1024")).toBe(true);
    expect(isValidBeneficiaryCode("A123")).toBe(true);

    expect(isValidBeneficiaryCode("")).toBe(false);
    expect(isValidBeneficiaryCode(" ")).toBe(false);
    expect(isValidBeneficiaryCode("AB")).toBe(false); // Too short
    expect(isValidBeneficiaryCode("<script>alert(1)</script>")).toBe(false);
  });

  it("normalizes and extracts beneficiary codes from URL QR payloads and raw inputs", () => {
    expect(extractBeneficiaryCode("  ben-0042  ")).toBe("BEN-0042");
    expect(extractBeneficiaryCode("https://sevaconnect.org/beneficiaries/BEN-5541")).toBe(
      "BEN-5541"
    );
    expect(extractBeneficiaryCode("http://localhost:8080/beneficiaries/ben-9912")).toBe(
      "BEN-9912"
    );
  });
});

describe("Field Feedback Utilities", () => {
  it("safely handles audio and haptic feedback in all runtime environments", () => {
    expect(() => playSuccessBeep()).not.toThrow();
    expect(() => playWarningBeep()).not.toThrow();
    expect(() => triggerHapticFeedback()).not.toThrow();
  });
});
