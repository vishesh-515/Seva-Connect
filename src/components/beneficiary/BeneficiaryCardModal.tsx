import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SevaLogo } from "@/components/brand/SevaLogo";
import { generateBeneficiaryQRCodeSVG, generateBeneficiaryQRCodeDataURL } from "@/lib/qr";
import { assessUrgency } from "@/lib/prioritization";
import { Printer, Download, Copy, Check, QrCode, ShieldCheck, MapPin, Phone, UserCheck } from "lucide-react";
import { toast } from "sonner";
import type { Row } from "@/components/entity/types";

interface BeneficiaryCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiary: Row | null;
  orgName?: string;
  onQuickDistribute?: (beneficiary: Row) => void;
}

export function BeneficiaryCardModal({
  open,
  onOpenChange,
  beneficiary,
  orgName = "Seva Connect NGO",
  onQuickDistribute,
}: BeneficiaryCardModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (beneficiary?.code) {
      const code = String(beneficiary.code);
      generateBeneficiaryQRCodeSVG(code, { size: 140 }).then((svg) => {
        if (active) setQrSvg(svg);
      });
      generateBeneficiaryQRCodeDataURL(code, { size: 400 }).then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      });
    }
    return () => {
      active = false;
    };
  }, [beneficiary?.code]);

  if (!beneficiary) return null;

  const urgency = assessUrgency(beneficiary);

  const handleCopyCode = () => {
    if (beneficiary.code) {
      navigator.clipboard.writeText(String(beneficiary.code));
      setCopied(true);
      toast.success(`Copied ID ${beneficiary.code}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `QR_${beneficiary.code || "beneficiary"}.png`;
    link.href = qrDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded QR Code image");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-[#1E1411] sm:rounded-2xl border-[#35231C] text-[#FFFDFB] shadow-2xl">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#FFFDFB]">
            <QrCode className="h-5 w-5 text-[#E29555]" />
            <span>Beneficiary <span className="heading-copper">Identity Pass</span></span>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Physical ID Pass */}
        <div className="id-card-print-target my-2 overflow-hidden rounded-2xl border-2 border-[#48291F] bg-[#160E0C] p-5 shadow-lg relative print:border-black print:p-4 print:shadow-none">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[#2E1E19] pb-3">
            <div className="flex items-center gap-2">
              <SevaLogo size={24} />
              <div>
                <p className="text-xs font-bold leading-none text-[#FFFDFB]">{orgName}</p>
                <p className="text-[10px] text-[#AFA196] uppercase tracking-wider font-semibold mt-0.5">
                  Beneficiary Identity Pass
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${urgency.badgeClass}`}
            >
              {urgency.label}
            </span>
          </div>

          {/* Main Card Body */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#281A15] border border-[#48291F] text-[#E29555] font-bold text-xs uppercase">
                  {beneficiary.full_name?.slice(0, 2) || "BN"}
                </div>
                <h3 className="text-base font-extrabold text-[#FFFDFB] truncate">
                  {beneficiary.full_name || "Beneficiary"}
                </h3>
              </div>
              
              <div className="inline-block rounded-md bg-[#281A15] px-2 py-0.5 font-mono text-xs font-bold text-[#E29555] tracking-wider border border-[#48291F]">
                {beneficiary.code || "BEN-0000"}
              </div>

              <div className="pt-1 text-xs text-[#AFA196] space-y-1">
                {beneficiary.support_category && (
                  <p className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#E29555] shrink-0" />
                    <span>{beneficiary.support_category}</span>
                  </p>
                )}
                {(beneficiary.city || beneficiary.region) && (
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-[#AFA196] shrink-0" />
                    <span>{[beneficiary.city, beneficiary.region].filter(Boolean).join(", ")}</span>
                  </p>
                )}
                {beneficiary.phone && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone className="h-3.5 w-3.5 text-[#AFA196] shrink-0" />
                    <span>{beneficiary.phone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className="rounded-xl border border-[#35231C] bg-white p-1.5 shadow-xs"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <span className="mt-1 text-[9px] font-mono text-[#AFA196] font-semibold">
                SCAN TO VERIFY
              </span>
            </div>
          </div>

          {/* Card Footer Stripe */}
          <div className="mt-4 flex items-center justify-between border-t border-[#2E1E19] pt-2 text-[10px] text-[#AFA196]">
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-[#34D399]" />
              <span>Status: <strong className="text-[#FFFDFB] capitalize">{beneficiary.status || "Active"}</strong></span>
            </span>
            <span className="text-[#E29555]">Verified Identifier</span>
          </div>
        </div>

        {/* Action Controls (Hidden during print) */}
        <div className="no-print mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex-1 gap-1.5 text-xs font-semibold rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#34D399]" /> : <Copy className="h-3.5 w-3.5 text-[#E29555]" />}
              <span>{copied ? "Copied" : "Copy ID"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="flex-1 gap-1.5 text-xs font-semibold rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18]"
              disabled={!qrDataUrl}
            >
              <Download className="h-3.5 w-3.5 text-[#E29555]" />
              <span>Download QR</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 gap-1.5 text-xs font-semibold rounded-full border-[#35231C] bg-[#221612] text-[#FFFDFB] hover:bg-[#2C1D18]"
            >
              <Printer className="h-3.5 w-3.5 text-[#E29555]" />
              <span>Print Pass ↗</span>
            </Button>
          </div>

          {onQuickDistribute && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onQuickDistribute(beneficiary);
              }}
              className="w-full gap-1.5 rounded-full bg-gradient-to-r from-[#E29555] to-[#C87A38] text-[#130D0B] font-bold shadow-md hover:brightness-110"
            >
              <span>Scan / Distribute Aid to Beneficiary ↗</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
