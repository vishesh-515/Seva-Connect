import type { Row } from "@/components/entity/types";

export type UrgencyLevel = "critical" | "high" | "moderate" | "standard";

export interface UrgencyAssessment {
  score: number; // 0 - 100
  level: UrgencyLevel;
  label: string;
  badgeClass: string;
  reasons: string[];
}

const CRITICAL_KEYWORDS = [
  "emergency",
  "urgent",
  "immediate",
  "critical",
  "severe",
  "starving",
  "starvation",
  "danger",
  "icu",
  "dialysis",
  "chemotherapy",
  "surgery",
  "eviction",
  "homeless",
  "disaster",
  "flood",
  "fire",
  "abandoned",
  "life-threatening",
  "trauma",
  "orphan",
];

const MODERATE_KEYWORDS = [
  "struggling",
  "malnourished",
  "unemployed",
  "chronically ill",
  "disability",
  "handicap",
  "widow",
  "debt",
  "medicine",
  "rent",
  "child",
  "elderly",
];

/**
 * Calculates a data-driven urgency assessment for a beneficiary
 * based on their demographic vulnerability, stated requirements,
 * and assistance delivery history.
 */
export function assessUrgency(beneficiary: Row, assistanceHistory: Row[] = []): UrgencyAssessment {
  let score = 10;
  const reasons: string[] = [];

  const text =
    `${beneficiary["support_requirements"] || ""} ${beneficiary["notes"] || ""}`.toLowerCase();

  // 1. Keyword analysis for stated acute distress
  const foundCritical = CRITICAL_KEYWORDS.filter((k) => text.includes(k));
  if (foundCritical.length > 0) {
    score += Math.min(45, foundCritical.length * 20);
    reasons.push(`Acute crisis keywords detected (${foundCritical.slice(0, 3).join(", ")})`);
  } else {
    const foundMod = MODERATE_KEYWORDS.filter((k) => text.includes(k));
    if (foundMod.length > 0) {
      score += Math.min(25, foundMod.length * 10);
      reasons.push(`Vulnerability indicators detected (${foundMod.slice(0, 3).join(", ")})`);
    }
  }

  // 2. High-need support category
  const category = String(beneficiary["support_category"] || "");
  if (category === "Healthcare") {
    score += 25;
    reasons.push("Healthcare support category requires immediate care");
  } else if (category === "Food") {
    score += 20;
    reasons.push("Essential nutrition support needed");
  } else if (category === "Shelter") {
    score += 20;
    reasons.push("Shelter vulnerability");
  } else if (category === "Financial assistance") {
    score += 15;
    reasons.push("Financial distress");
  }

  // 3. Household size factor
  const size = Number(beneficiary["household_size"] || 0);
  if (size >= 7) {
    score += 20;
    reasons.push(`High family dependency (${size} household members)`);
  } else if (size >= 5) {
    score += 15;
    reasons.push(`Large household size (${size} members)`);
  } else if (size >= 3) {
    score += 5;
  }

  // 4. Assistance recency / gap analysis
  const regDate = beneficiary["registration_date"]
    ? new Date(beneficiary["registration_date"])
    : null;
  const now = new Date();

  // Filter distributed assistance
  const distributedAid = assistanceHistory.filter(
    (a) => a["status"] === "distributed" || a["status"] === "confirmed",
  );

  if (distributedAid.length === 0) {
    if (regDate) {
      const daysSinceReg = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceReg > 30) {
        score += 25;
        reasons.push(`Zero aid distributed since registration (${daysSinceReg} days)`);
      } else if (daysSinceReg > 7) {
        score += 15;
        reasons.push(`Awaiting initial assistance package (${daysSinceReg} days)`);
      }
    }
  } else {
    // Check most recent assistance date
    const sorted = [...distributedAid].sort(
      (a, b) =>
        new Date(b["distribution_date"]).getTime() - new Date(a["distribution_date"]).getTime(),
    );
    const mostRecentAid = sorted[0];
    if (mostRecentAid?.["distribution_date"]) {
      const lastAidDate = new Date(mostRecentAid["distribution_date"]);
      const daysSinceLastAid = Math.floor(
        (now.getTime() - lastAidDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysSinceLastAid > 60) {
        score += 20;
        reasons.push(`Over 2 months since last assistance (${daysSinceLastAid} days)`);
      } else if (daysSinceLastAid > 30) {
        score += 10;
        reasons.push(`Over 1 month since last assistance (${daysSinceLastAid} days)`);
      }
    }
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  let level: UrgencyLevel = "standard";
  let label = "Standard";
  let badgeClass = "bg-muted text-muted-foreground border-border";

  if (score >= 70) {
    level = "critical";
    label = "Critical Urgent";
    badgeClass = "bg-destructive/15 text-destructive border-destructive/40 font-semibold";
  } else if (score >= 45) {
    level = "high";
    label = "High Priority";
    badgeClass =
      "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 font-semibold";
  } else if (score >= 25) {
    level = "moderate";
    label = "Moderate";
    badgeClass = "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40";
  }

  if (reasons.length === 0) {
    reasons.push("Standard ongoing community monitoring");
  }

  return {
    score,
    level,
    label,
    badgeClass,
    reasons,
  };
}
