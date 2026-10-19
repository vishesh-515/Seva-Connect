import type { Row } from "@/components/entity/types";

export interface ProgramMatch {
  project: Row;
  score: number; // 0 - 100
  reasons: string[];
  isEnrolled: boolean;
  remainingCapacity: number | null;
}

export interface BeneficiaryMatch {
  beneficiary: Row;
  score: number;
  reasons: string[];
  isEnrolled: boolean;
}

/**
 * Calculates matching active projects for a given beneficiary
 */
export function matchProgramsForBeneficiary(
  beneficiary: Row,
  projects: Row[],
  enrolledProjectIds: string[] = [],
  projectEnrollmentCounts: Record<string, number> = {},
): ProgramMatch[] {
  const beneficiaryCategory = String(beneficiary["support_category"] || "").toLowerCase();
  const beneficiaryLocation =
    `${beneficiary["city"] || ""} ${beneficiary["region"] || ""}`.toLowerCase();
  const beneficiaryNeeds = String(beneficiary["support_requirements"] || "").toLowerCase();

  const matches: ProgramMatch[] = projects
    .filter((p) => p["status"] === "active" || p["status"] === "planned")
    .map((project) => {
      let score = 15;
      const reasons: string[] = [];
      const pName = String(project["name"] || "").toLowerCase();
      const pDesc = String(project["description"] || "").toLowerCase();
      const pObj = String(project["objectives"] || "").toLowerCase();
      const pLoc = String(project["location"] || "").toLowerCase();
      const projectText = `${pName} ${pDesc} ${pObj}`;

      // 1. Direct Category Match
      if (beneficiaryCategory && projectText.includes(beneficiaryCategory)) {
        score += 45;
        reasons.push(`Direct Category Match: Supports ${beneficiary["support_category"]}`);
      } else if (
        (beneficiaryCategory.includes("food") &&
          (projectText.includes("ration") ||
            projectText.includes("meal") ||
            projectText.includes("nutrition"))) ||
        (beneficiaryCategory.includes("health") &&
          (projectText.includes("medical") ||
            projectText.includes("clinic") ||
            projectText.includes("medicine"))) ||
        (beneficiaryCategory.includes("educat") &&
          (projectText.includes("school") ||
            projectText.includes("student") ||
            projectText.includes("book"))) ||
        (beneficiaryCategory.includes("shelter") &&
          (projectText.includes("housing") || projectText.includes("home")))
      ) {
        score += 40;
        reasons.push(`Program Focus Align: Related to ${beneficiary["support_category"]}`);
      }

      // 2. Specific Requirements & Keywords
      if (beneficiaryNeeds) {
        const words = beneficiaryNeeds
          .split(/\s+/)
          .filter(
            (w) => w.length > 3 && !["with", "from", "need", "needs", "have", "been"].includes(w),
          );
        const matchedWords = words.filter((w) => projectText.includes(w));
        if (matchedWords.length > 0) {
          const boost = Math.min(25, matchedWords.length * 8);
          score += boost;
          reasons.push(`Matched Need: "${matchedWords.slice(0, 3).join(", ")}"`);
        }
      }

      // 3. Geographic Proximity
      if (beneficiaryLocation && pLoc) {
        const bCity = String(beneficiary["city"] || "").toLowerCase();
        const bRegion = String(beneficiary["region"] || "").toLowerCase();
        if ((bCity && pLoc.includes(bCity)) || (bRegion && pLoc.includes(bRegion))) {
          score += 20;
          reasons.push(`Location Match: Serving ${project["location"]}`);
        }
      }

      // 4. Capacity availability
      const target = project["target_beneficiaries"]
        ? Number(project["target_beneficiaries"])
        : null;
      const enrolled = projectEnrollmentCounts[project["id"]] || 0;
      let remainingCapacity: number | null = null;
      if (target != null) {
        remainingCapacity = Math.max(0, target - enrolled);
        if (remainingCapacity > 0) {
          score += 10;
          reasons.push(`Capacity Open: ${remainingCapacity} spots remaining`);
        } else {
          score -= 15;
          reasons.push("Target beneficiary capacity reached");
        }
      } else {
        score += 5;
      }

      score = Math.min(100, Math.max(0, score));
      const isEnrolled = enrolledProjectIds.includes(project["id"]);

      return {
        project,
        score,
        reasons,
        isEnrolled,
        remainingCapacity,
      };
    });

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Calculates matching beneficiaries for a specific project
 */
export function matchBeneficiariesForProject(
  project: Row,
  beneficiaries: Row[],
  enrolledBeneficiaryIds: string[] = [],
): BeneficiaryMatch[] {
  const pName = String(project["name"] || "").toLowerCase();
  const pDesc = String(project["description"] || "").toLowerCase();
  const pObj = String(project["objectives"] || "").toLowerCase();
  const pLoc = String(project["location"] || "").toLowerCase();
  const projectText = `${pName} ${pDesc} ${pObj}`;

  return beneficiaries
    .filter((b) => b["status"] === "active")
    .map((b) => {
      let score = 15;
      const reasons: string[] = [];
      const bCat = String(b["support_category"] || "").toLowerCase();
      const bCity = String(b["city"] || "").toLowerCase();
      const bRegion = String(b["region"] || "").toLowerCase();
      const bNeeds = String(b["support_requirements"] || "").toLowerCase();

      // Category matching
      if (bCat && projectText.includes(bCat)) {
        score += 45;
        reasons.push(`Requires ${b["support_category"]}`);
      } else if (
        (bCat.includes("food") &&
          (projectText.includes("ration") ||
            projectText.includes("meal") ||
            projectText.includes("nutrition"))) ||
        (bCat.includes("health") &&
          (projectText.includes("medical") || projectText.includes("clinic"))) ||
        (bCat.includes("educat") && (projectText.includes("school") || projectText.includes("kit")))
      ) {
        score += 40;
        reasons.push(`Aligns with ${b["support_category"]}`);
      }

      // Location matching
      if (pLoc && ((bCity && pLoc.includes(bCity)) || (bRegion && pLoc.includes(bRegion)))) {
        score += 25;
        reasons.push(`Located in ${b["city"] || b["region"]}`);
      }

      // Keyword match
      if (bNeeds) {
        const words = bNeeds
          .split(/\s+/)
          .filter((w) => w.length > 3 && !["with", "from", "need", "needs", "have"].includes(w));
        const matched = words.filter((w) => projectText.includes(w));
        if (matched.length > 0) {
          score += Math.min(20, matched.length * 6);
          reasons.push(`Stated need: ${matched.slice(0, 2).join(", ")}`);
        }
      }

      score = Math.min(100, Math.max(0, score));
      const isEnrolled = enrolledBeneficiaryIds.includes(b["id"]);

      return {
        beneficiary: b,
        score,
        reasons,
        isEnrolled,
      };
    })
    .sort((a, b) => b.score - a.score);
}
