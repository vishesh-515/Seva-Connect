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
      <DialogContent className="max-w-md p-6 bg-card sm:rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="no-print">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold">
            <QrCode className="h-5 w-5 text-primary" />
            <span>Beneficiary Verification Card</span>
          </DialogTitle>
        </DialogHeader>

        {/* Printable Physical ID Pass */}
        <div className="id-card-print-target my-2 overflow-hidden rounded-2xl border-2 border-primary/25 bg-gradient-to-br from-card via-background to-muted/60 p-5 shadow-lg relative print:border-black print:p-4 print:shadow-none">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <SevaLogo size={24} />
              <div>
                <p className="text-xs font-bold leading-none text-foreground">{orgName}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
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
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs uppercase">
                  {beneficiary.full_name?.slice(0, 2) || "BN"}
                </div>
                <h3 className="text-base font-extrabold text-foreground truncate">
                  {beneficiary.full_name || "Beneficiary"}
                </h3>
              </div>
              
              <div className="inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary tracking-wider border border-primary/20">
                {beneficiary.code || "BEN-0000"}
              </div>

              <div className="pt-1 text-xs text-muted-foreground space-y-1">
                {beneficiary.support_category && (
                  <p className="flex items-center gap-1.5 truncate">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{beneficiary.support_category}</span>
                  </p>
                )}
                {(beneficiary.city || beneficiary.region) && (
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{[beneficiary.city, beneficiary.region].filter(Boolean).join(", ")}</span>
                  </p>
                )}
                {beneficiary.phone && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{beneficiary.phone}</span>
                  </p>
                )}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className="rounded-xl border border-border/80 bg-white p-1 shadow-xs"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <span className="mt-1 text-[9px] font-mono text-muted-foreground font-semibold">
                SCAN TO VERIFY
              </span>
            </div>
          </div>

          {/* Card Footer Stripe */}
          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-emerald-500" />
              <span>Status: <strong className="text-foreground capitalize">{beneficiary.status || "Active"}</strong></span>
            </span>
            <span>Verified Identifier</span>
          </div>
        </div>

        {/* Action Controls (Hidden during print) */}
        <div className="no-print mt-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="flex-1 gap-1.5 text-xs font-semibold"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "Copy ID"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="flex-1 gap-1.5 text-xs font-semibold"
              disabled={!qrDataUrl}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download QR</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex-1 gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Pass</span>
            </Button>
          </div>

          {onQuickDistribute && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onQuickDistribute(beneficiary);
              }}
              className="w-full gap-1.5 shadow-sm shadow-primary/20"
            >
              <span>Scan / Distribute Aid to Beneficiary</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
