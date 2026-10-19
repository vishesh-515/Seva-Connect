import type { Organization } from "./org-context";
import { formatCurrency, formatDate } from "./format";

const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export function printAcknowledgment(r: Record<string, any>, org: Organization) {
  const w = window.open("", "_blank", "width=720,height=900");
  if (!w) return;
  const what =
    r["donation_type"] === "monetary"
      ? `a contribution of <strong>${esc(formatCurrency(r["amount"], r["currency"]))}</strong>`
      : `an in-kind contribution of <strong>${esc(r["quantity"])} ${esc(r["unit"] ?? "")} ${esc(r["item_name"])}</strong>`;
  w.document.write(`<!doctype html><html><head><title>Acknowledgment ${esc(r["reference"])}</title>
  <style>body{font-family:system-ui,sans-serif;max-width:620px;margin:48px auto;color:#1f2a24;line-height:1.6}h1{font-size:22px;margin:0}small{color:#666}.box{border:1px solid #ddd;border-radius:8px;padding:16px;margin:24px 0}</style></head><body>
  <h1>${esc(org.name)}</h1><small>${esc(org.address ?? "")} · ${esc(org.contact_email)}</small>
  <h2 style="margin-top:36px;font-size:18px">Donation acknowledgment</h2>
  <p>We gratefully acknowledge ${esc(r["donor"]?.name ?? "an anonymous donor")} for ${what}, recorded on ${esc(formatDate(r["donation_date"]))}.</p>
  <div class="box">Reference: ${esc(r["reference"])}<br/>Status: ${esc(r["status"])}${r["receipt_reference"] ? `<br/>Receipt ref: ${esc(r["receipt_reference"])}` : ""}</div>
  <p><small>This acknowledgment confirms the donation was recorded by ${esc(org.name)}. ${r["status"] === "confirmed" ? "" : "Payment settlement has not been confirmed."} It is not a tax receipt.</small></p>
  <script>window.print()</script></body></html>`);
  w.document.close();
}
