import QRCode from "qrcode";

/**
 * QR Code Service for Seva Connect Beneficiary ID Cards.
 * Uses the industry-standard 'qrcode' library.
 * Strictly encodes ONLY the beneficiary's unique non-sensitive public identifier (e.g. BEN-0042).
 * Never encodes PII, names, phone numbers, medical records, or sensitive personal data.
 */

export interface QRCodeOptions {
  size?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generates an SVG string representation of the beneficiary code.
 */
export async function generateBeneficiaryQRCodeSVG(
  beneficiaryCode: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const cleanCode = beneficiaryCode.trim();
  const { size = 200, margin = 2, color = { dark: "#0f172a", light: "#ffffff" } } = options;

  return QRCode.toString(cleanCode, {
    type: "svg",
    width: size,
    margin,
    color,
    errorCorrectionLevel: "M",
  });
}

/**
 * Generates a PNG Data URL representation of the beneficiary code (useful for downloads).
 */
export async function generateBeneficiaryQRCodeDataURL(
  beneficiaryCode: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const cleanCode = beneficiaryCode.trim();
  const { size = 300, margin = 2, color = { dark: "#0f172a", light: "#ffffff" } } = options;

  return QRCode.toDataURL(cleanCode, {
    width: size,
    margin,
    color,
    errorCorrectionLevel: "M",
  });
}

/**
 * Validates whether a scanned or input string is a valid Seva Connect beneficiary code format.
 * Matches patterns like BEN-XXXX, BEN-0042, etc. or alphanumeric IDs.
 */
export function isValidBeneficiaryCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  const trimmed = code.trim();
  // Allow standard Seva Connect prefix format or standard alphanumeric reference
  return /^[A-Za-z0-9_-]{3,32}$/.test(trimmed);
}

/**
 * Normalizes a scanned string (handles URL wrappers if someone encoded a link, strips whitespace)
 */
export function extractBeneficiaryCode(rawScannedData: string): string {
  if (!rawScannedData) return "";
  const trimmed = rawScannedData.trim();

  // If the QR code was formatted as a URL like https://.../beneficiaries/BEN-1234
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1];
      if (last && isValidBeneficiaryCode(last)) {
        return last.toUpperCase();
      }
    }
  } catch {}

  // Default: direct code string
  return trimmed.toUpperCase();
}
