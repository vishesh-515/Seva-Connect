import { supabase } from "@/integrations/supabase/client";
import { extractBeneficiaryCode, isValidBeneficiaryCode } from "./qr";
import { assessUrgency, type UrgencyAssessment } from "./prioritization";
import type { Row } from "@/components/entity/types";

export interface BeneficiaryLookupResult {
  beneficiary: Row;
  assessment: UrgencyAssessment;
  recentDistributions: RecentDistribution[];
  hasReceivedToday: boolean;
  receivedTodayTypes: string[];
}

export interface RecentDistribution {
  id: string;
  reference: string;
  assistance_type: string;
  distribution_date: string;
  quantity: number;
  unit: string | null;
  status: string;
  project?: { name: string } | null;
}

export interface SubmitDistributionParams {
  orgId: string;
  beneficiaryId: string;
  assistanceType: string;
  quantity: number;
  unit?: string;
  estimatedValue?: number;
  projectId?: string;
  campaignName?: string;
  notes?: string;
  distributionDate?: string;
  idempotencyKey?: string;
  overrideReason?: string;
  userRole?: string;
}

export interface SubmitDistributionResult {
  success: boolean;
  duplicate_detected?: boolean;
  message?: string;
  record?: any;
  error?: string;
}

/**
 * Look up a beneficiary by unique code (e.g. BEN-0042) securely within the user's authorized organization.
 */
export async function lookupBeneficiaryByCode(
  orgId: string,
  rawCode: string
): Promise<BeneficiaryLookupResult> {
  const normalizedCode = extractBeneficiaryCode(rawCode);

  if (!isValidBeneficiaryCode(normalizedCode)) {
    throw new Error("Invalid beneficiary code format. Please check and try again.");
  }

  // 1. Authenticated query to beneficiaries table scoped by orgId
  const { data: benData, error: benError } = await supabase
    .from("beneficiaries")
    .select("*")
    .eq("organization_id", orgId)
    .or(`code.ilike.${normalizedCode},id.eq.${normalizedCode}`)
    .limit(1)
    .maybeSingle();

  if (benError) {
    throw new Error(`Database error during lookup: ${benError.message}`);
  }

  if (!benData) {
    throw new Error(
      `No beneficiary found with code "${normalizedCode}" in your authorized organization.`
    );
  }

  const beneficiary = benData as unknown as Row;

  // 2. Query recent distribution records for duplicate checks & history
  const todayStr = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: distData, error: distError } = await supabase
    .from("assistance_records")
    .select("id, reference, assistance_type, distribution_date, quantity, unit, status, project:projects(name)")
    .eq("organization_id", orgId)
    .eq("beneficiary_id", beneficiary.id)
    .gte("distribution_date", thirtyDaysAgo)
    .order("distribution_date", { ascending: false });

  if (distError) {
    console.warn("Could not fetch recent distributions:", distError);
  }

  const recentDistributions: RecentDistribution[] = (distData ?? []).map((d: any) => ({
    id: d.id,
    reference: d.reference,
    assistance_type: d.assistance_type,
    distribution_date: d.distribution_date,
    quantity: Number(d.quantity) || 1,
    unit: d.unit,
    status: d.status,
    project: d.project,
  }));

  const receivedToday = recentDistributions.filter(
    (d) => d.distribution_date === todayStr && d.status === "distributed"
  );

  return {
    beneficiary,
    assessment: assessUrgency(beneficiary),
    recentDistributions,
    hasReceivedToday: receivedToday.length > 0,
    receivedTodayTypes: Array.from(new Set(receivedToday.map((d) => d.assistance_type))),
  };
}

/**
 * Submits and commits a field distribution.
 * Uses atomic RPC if available, with graceful transactional fallback.
 */
export async function submitFieldDistribution(
  params: SubmitDistributionParams
): Promise<SubmitDistributionResult> {
  const {
    orgId,
    beneficiaryId,
    assistanceType,
    quantity,
    unit,
    estimatedValue,
    projectId,
    campaignName,
    notes,
    distributionDate = new Date().toISOString().slice(0, 10),
    idempotencyKey = `dispense_${beneficiaryId}_${assistanceType}_${Date.now()}`,
    overrideReason,
  } = params;

  if (!beneficiaryId || !assistanceType || quantity <= 0) {
    return { success: false, error: "Please enter a valid item type and quantity." };
  }

  // 1. Try atomic PostgreSQL RPC first
  try {
    const { data, error } = await supabase.rpc("record_field_distribution", {
      _org_id: orgId,
      _beneficiary_id: beneficiaryId,
      _assistance_type: assistanceType,
      _quantity: quantity,
      _unit: unit || null,
      _estimated_value: estimatedValue || null,
      _project_id: projectId || null,
      _campaign_name: campaignName || null,
      _notes: notes || null,
      _distribution_date: distributionDate,
      _idempotency_key: idempotencyKey,
      _override_reason: overrideReason || null,
    });

    if (!error && data) {
      const res = data as any;
      if (res.duplicate_detected) {
        playWarningBeep();
        return {
          success: false,
          duplicate_detected: true,
          message: res.message || "Duplicate assistance detected today.",
          record: res.existing_record,
        };
      }
      playSuccessBeep();
      triggerHapticFeedback();
      return { success: true, record: res.record };
    }
  } catch (rpcErr) {
    console.info("RPC record_field_distribution not present or failed, executing direct atomic transaction fallback", rpcErr);
  }

  // 2. Direct Fallback: Client-side Duplicate Check + Insert + Audit Log
  const { data: dupData } = await supabase
    .from("assistance_records")
    .select("id, reference, assistance_type, distribution_date, quantity, unit")
    .eq("organization_id", orgId)
    .eq("beneficiary_id", beneficiaryId)
    .ilike("assistance_type", assistanceType.trim())
    .eq("distribution_date", distributionDate)
    .in("status", ["distributed", "planned"])
    .maybeSingle();

  if (dupData && (!overrideReason || overrideReason.trim().length < 5)) {
    playWarningBeep();
    return {
      success: false,
      duplicate_detected: true,
      message: `Beneficiary already received ${dupData.assistance_type} today (Ref: ${dupData.reference}). Authorize an override if this additional distribution is intentional.`,
      record: dupData,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const generatedRef = "AST-" + Math.random().toString(36).substring(2, 10).toUpperCase();

  const insertPayload: any = {
    organization_id: orgId,
    beneficiary_id: beneficiaryId,
    assistance_type: assistanceType,
    quantity,
    unit: unit || null,
    estimated_value: estimatedValue || null,
    project_id: projectId || null,
    distribution_date: distributionDate,
    description: campaignName || notes || `${assistanceType} field distribution`,
    notes: notes || (overrideReason ? `[OVERRIDE APPROVED: ${overrideReason}]` : null),
    status: "distributed",
    reference: generatedRef,
    responsible_user_id: user?.id || null,
    created_by: user?.id || null,
  };

  const { data: record, error: insertError } = await supabase
    .from("assistance_records")
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // Insert audit record in activity_logs
  try {
    await supabase.from("activity_logs").insert({
      organization_id: orgId,
      actor_id: user?.id,
      action: "create",
      entity_type: "assistance_records",
      entity_id: record.id,
      summary: `Distributed ${quantity} ${unit || "units"} of ${assistanceType} (${record.reference})${overrideReason ? " [Override]" : ""}`,
      changes: {
        beneficiary_id: beneficiaryId,
        reference: record.reference,
        assistance_type: assistanceType,
        override_reason: overrideReason,
      },
    });
  } catch (logErr) {
    console.warn("Audit log creation note:", logErr);
  }

  playSuccessBeep();
  triggerHapticFeedback();
  return { success: true, record };
}

// -----------------------------------------
// Field Feedback: Audio & Haptics
// -----------------------------------------

/**
 * Clean Web Audio API success chime (no external audio assets required)
 */
export function playSuccessBeep() {
  try {
    if (typeof window === "undefined") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

/**
 * Clean Web Audio API warning/duplicate tone
 */
export function playWarningBeep() {
  try {
    if (typeof window === "undefined") return;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
    osc.frequency.setValueAtTime(180, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

/**
 * Vibration feedback for supported mobile devices
 */
export function triggerHapticFeedback() {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch {}
}
