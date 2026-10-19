import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  CameraOff,
  Barcode,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  PackagePlus,
  Printer,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  History,
  X,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  lookupBeneficiaryByCode,
  submitFieldDistribution,
  type BeneficiaryLookupResult,
} from "@/lib/distribution-service";
import { formatDate } from "@/lib/format";
import type { Row } from "@/components/entity/types";

interface DistributionScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  userRole?: string;
  initialBeneficiary?: Row | null;
}

const KIT_CATEGORIES = [
  "Food Package",
  "Hygiene Kit",
  "Winter Clothing",
  "Medical Supplies",
  "Educational Materials",
  "Financial Assistance",
  "Emergency Relief",
  "Other",
];

export function DistributionScanner({
  open,
  onOpenChange,
  orgId,
  userRole = "staff",
  initialBeneficiary = null,
}: DistributionScannerProps) {
  const qc = useQueryClient();

  // Mode: "scan" (camera/hardware) | "manual"
  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [hardwareBuffer, setHardwareBuffer] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Verified beneficiary result
  const [lookupResult, setLookupResult] = useState<BeneficiaryLookupResult | null>(null);

  // Form State
  const [assistanceType, setAssistanceType] = useState<string>("Food Package");
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>("kit(s)");
  const [projectId, setProjectId] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [overrideReason, setOverrideReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Success Receipt State
  const [committedRecord, setCommittedRecord] = useState<any | null>(null);

  // Active Projects query for project dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["org", orgId, "active-projects-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", orgId)
        .eq("status", "active")
        .order("name");
      if (error) return [];
      return data ?? [];
    },
    enabled: open && !!orgId,
  });

  // Handle Initial Beneficiary if passed from profile page
  useEffect(() => {
    if (initialBeneficiary && open) {
      handleLookupCode(String(initialBeneficiary.code || initialBeneficiary.id));
    }
  }, [initialBeneficiary, open]);

  // Stop camera on unmount or close
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setLookupResult(null);
      setCommittedRecord(null);
      setOverrideReason("");
      setNotes("");
      setManualCode("");
    }
  }, [open, stopCamera]);

  // ----------------------------------------------------
  // Hardware Barcode Scanner Listener
  // ----------------------------------------------------
  useEffect(() => {
    if (!open || lookupResult) return;

    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing into an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // Barcode scanners type very rapidly (< 50ms per key)
      if (e.key === "Enter") {
        if (buffer.trim().length >= 3) {
          e.preventDefault();
          const scannedCode = buffer.trim();
          buffer = "";
          handleLookupCode(scannedCode);
        }
      } else if (e.key.length === 1) {
        // Reset buffer if delay was too long (human typing outside input)
        if (diff > 120) {
          buffer = "";
        }
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, lookupResult]);

  // ----------------------------------------------------
  // Camera Video QR Processing Loop
  // ----------------------------------------------------
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please allow camera permissions in your browser or use Manual Lookup.");
      } else {
        setCameraError(err.message || "Unable to access camera.");
      }
      setIsCameraActive(false);
    }
  };

  const tickScan = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Decode QR code via jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code && code.data) {
      // Detected code! Stop scanning and lookup
      stopCamera();
      handleLookupCode(code.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(tickScan);
  };

  // ----------------------------------------------------
  // Beneficiary Lookup
  // ----------------------------------------------------
  const handleLookupCode = async (rawCode: string) => {
    if (!rawCode || isLookingUp) return;
    setIsLookingUp(true);
    setCameraError(null);

    try {
      const result = await lookupBeneficiaryByCode(orgId, rawCode);
      setLookupResult(result);
      // Auto-set suggested assistance category if beneficiary has preferred category
      if (result.beneficiary.support_category && KIT_CATEGORIES.includes(result.beneficiary.support_category)) {
        setAssistanceType(result.beneficiary.support_category);
      }
      toast.success(`Verified: ${result.beneficiary.full_name}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to find beneficiary.");
    } finally {
      setIsLookingUp(false);
    }
  };

  // ----------------------------------------------------
  // Submit Distribution Dispensation
  // ----------------------------------------------------
  const handleCompleteDistribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupResult) return;

    setIsSubmitting(true);
    try {
      const res = await submitFieldDistribution({
        orgId,
        beneficiaryId: String(lookupResult.beneficiary.id),
        assistanceType,
        quantity,
        unit,
        projectId: projectId || undefined,
        campaignName: campaignName || undefined,
        notes: notes || undefined,
        overrideReason: overrideReason || undefined,
        userRole,
      });

      if (res.duplicate_detected) {
        toast.warning(res.message || "Duplicate warning: assistance already delivered today.");
        return;
      }

      if (!res.success) {
        throw new Error(res.error || "Distribution could not be committed.");
      }

      // Success!
      setCommittedRecord(res.record);
      toast.success("Distribution committed successfully!");

      // Invalidate relevant queries so dashboard and tables refresh in real time
      await qc.invalidateQueries({ queryKey: ["assistance"] });
      await qc.invalidateQueries({ queryKey: ["org", orgId, "summary"] });
      await qc.invalidateQueries({ queryKey: ["org", orgId, "activity"] });
      await qc.invalidateQueries({ queryKey: ["org", orgId, "distribution-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to commit distribution.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset to scan next beneficiary
  const handleScanNext = () => {
    setLookupResult(null);
    setCommittedRecord(null);
    setOverrideReason("");
    setNotes("");
    setManualCode("");
    setQuantity(1);
    if (activeTab === "camera") {
      startCamera();
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-[#1E1411] border-[#35231C] text-[#FFFDFB] shadow-2xl sm:rounded-2xl">
        <DialogHeader className="no-print p-5 border-b border-[#2E1E19] bg-[#160E0C] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#281A15] border border-[#48291F] text-[#E29555]">
              <Barcode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-[#FFFDFB] flex items-center gap-2">
                <span>Field Distribution</span>
                <span className="heading-copper">Station</span>
              </DialogTitle>
              <p className="text-xs text-[#AFA196]">
                Rapid QR/Barcode scanning & instant kit dispensation
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 max-h-[80vh] overflow-y-auto">
          {/* STEP 3: SUCCESS RECEIPT COMMITTED */}
          {committedRecord ? (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-2 animate-bounce" />
                <h3 className="text-lg font-bold text-foreground">Distribution Confirmed!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Aid record successfully created and audited in Supabase.
                </p>

                {/* Printable Receipt Target */}
                <div className="id-card-print-target my-4 w-full max-w-sm rounded-xl border border-border bg-card p-4 text-left shadow-xs space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-2">
                    <span className="font-semibold text-muted-foreground">Reference:</span>
                    <span className="font-mono font-bold text-primary">{committedRecord.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beneficiary:</span>
                    <span className="font-semibold text-foreground">{lookupResult?.beneficiary?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beneficiary ID:</span>
                    <span className="font-mono text-foreground">{lookupResult?.beneficiary?.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Item Distributed:</span>
                    <span className="font-semibold text-foreground">
                      {committedRecord.quantity} {committedRecord.unit || "unit"} of {committedRecord.assistance_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span>{committedRecord.distribution_date || formatDate(new Date().toISOString())}</span>
                  </div>
                  {committedRecord.notes && (
                    <div className="pt-2 border-t text-[11px] text-muted-foreground">
                      Note: {committedRecord.notes}
                    </div>
                  )}
                </div>
              </div>

              <div className="no-print flex gap-3">
                <Button variant="outline" onClick={handlePrintReceipt} className="flex-1 gap-2">
                  <Printer className="h-4 w-4" />
                  <span>Print Receipt</span>
                </Button>
                <Button onClick={handleScanNext} className="flex-1 gap-2 shadow-sm shadow-primary/25">
                  <RefreshCw className="h-4 w-4" />
                  <span>Scan Next Beneficiary</span>
                </Button>
              </div>
            </div>
          ) : lookupResult ? (
            /* STEP 2: VERIFICATION & QUICK DISTRIBUTION FORM */
            <div className="space-y-5">
              {/* Beneficiary Profile Card */}
              <div className="rounded-xl border border-border/80 bg-gradient-to-r from-card to-muted/40 p-4 shadow-2xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                      {lookupResult.beneficiary.full_name?.slice(0, 2).toUpperCase() || "BN"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-foreground">
                          {lookupResult.beneficiary.full_name}
                        </h3>
                        <Badge variant="outline" className="font-mono text-[11px] bg-background">
                          {lookupResult.beneficiary.code}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[lookupResult.beneficiary.support_category, lookupResult.beneficiary.city]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${lookupResult.assessment.badgeClass}`}
                  >
                    {lookupResult.assessment.label}
                  </span>
                </div>

                {/* Anti-Duplication Warning Banner */}
                {lookupResult.hasReceivedToday && (
                  <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="font-semibold">Duplicate Distribution Notice:</strong> This beneficiary has
                      already received <strong>{lookupResult.receivedTodayTypes.join(", ")}</strong> today.
                      If this is an authorized repeat distribution, please specify an override reason below.
                    </div>
                  </div>
                )}
              </div>

              {/* Fast Distribution Form */}
              <form onSubmit={handleCompleteDistribution} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium">Aid / Kit Type *</Label>
                    <Select value={assistanceType} onValueChange={setAssistanceType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KIT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Quantity *</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        max="1000"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                        className="w-24"
                        required
                      />
                      <Input
                        type="text"
                        placeholder="Unit (kit, kg, pack)"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs font-medium">Associated Project (Optional)</Label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select active project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None / General Camp</SelectItem>
                        {projects.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium">Campaign / Location Name</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Flood Relief Camp Alpha"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Override reason field if duplicate is detected */}
                {lookupResult.hasReceivedToday && (
                  <div>
                    <Label className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Authorization Override Reason * (Required for repeat distribution)
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. Additional family member verification by camp leader"
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="mt-1 border-amber-500/40"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs font-medium">Field Notes</Label>
                  <Input
                    type="text"
                    placeholder="Optional delivery notes or observations"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLookupResult(null)}
                    className="flex-1"
                  >
                    Cancel / Scan Another
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 gap-2 shadow-md shadow-primary/25"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Committing…</span>
                      </>
                    ) : (
                      <>
                        <PackagePlus className="h-4 w-4" />
                        <span>Confirm Distribution</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* Recent History Accordion Preview */}
              {lookupResult.recentDistributions.length > 0 && (
                <div className="pt-3 border-t border-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                    <History className="h-3.5 w-3.5" />
                    <span>Past Assistance (Last 30 Days)</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {lookupResult.recentDistributions.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-foreground">{d.assistance_type}</span>
                          <span className="text-muted-foreground ml-2">
                            ({d.quantity} {d.unit || "unit"})
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {formatDate(d.distribution_date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 1: SCANNER & LOOKUP MODES */
            <div className="space-y-4">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("camera");
                    startCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "camera"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Camera className="h-4 w-4" />
                  <span>Live Camera Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("manual");
                    stopCamera();
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all ${
                    activeTab === "manual"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Search className="h-4 w-4" />
                  <span>Manual / Barcode Gun</span>
                </button>
              </div>

              {/* CAMERA MODE */}
              {activeTab === "camera" && (
                <div className="space-y-3">
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl border-2 border-dashed border-border/80 bg-black flex items-center justify-center">
                    <video
                      ref={videoRef}
                      className="absolute inset-0 h-full w-full object-cover"
                      playsInline
                    />

                    {/* Laser Scanner Reticle Overlay */}
                    {isCameraActive && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-48 w-48 rounded-xl border-2 border-primary/80 shadow-lg">
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse shadow-md" />
                          <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-primary" />
                          <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-primary" />
                          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-primary" />
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-primary" />
                        </div>
                      </div>
                    )}

                    {!isCameraActive && !cameraError && (
                      <div className="text-center p-6 space-y-3 z-10">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                          <Camera className="h-6 w-6" />
                        </div>
                        <p className="text-xs text-white/80">
                          Click below to start your device camera for instant QR recognition
                        </p>
                        <Button size="sm" onClick={startCamera} className="shadow-md">
                          Enable Camera Feed
                        </Button>
                      </div>
                    )}

                    {cameraError && (
                      <div className="p-6 text-center space-y-2.5 z-10 max-w-sm">
                        <CameraOff className="h-8 w-8 text-destructive mx-auto" />
                        <p className="text-xs text-red-200">{cameraError}</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setActiveTab("manual")}
                        >
                          Switch to Manual Entry
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-center text-[11px] text-muted-foreground">
                    Point camera steadily at the beneficiary's printed ID card or digital QR pass.
                  </p>
                </div>
              )}

              {/* MANUAL / HARDWARE SCANNER MODE */}
              {activeTab === "manual" && (
                <div className="space-y-4 py-2">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary space-y-1">
                    <div className="flex items-center gap-2 font-semibold">
                      <Barcode className="h-4 w-4" />
                      <span>Hardware Scanner Ready</span>
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      Connected USB / Bluetooth barcode guns automatically scan into this terminal.
                      You can also manually type any beneficiary identifier (e.g. <code>BEN-0042</code>).
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleLookupCode(manualCode);
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      autoFocus
                      type="text"
                      placeholder="Enter or scan Beneficiary ID (e.g. BEN-0001)..."
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="font-mono text-sm"
                      disabled={isLookingUp}
                    />
                    <Button type="submit" disabled={isLookingUp || !manualCode.trim()} className="gap-1.5 shrink-0">
                      {isLookingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span>Lookup</span>
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
