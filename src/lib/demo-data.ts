import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Demo Data Seeder for BIOS 2026 Hackathon Presentation.
 * Populates realistic humanitarian cases, active programmes, and prior distributions
 * directly into Supabase under the authorized organization.
 */

export async function seedDemoDataset(orgId: string): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User must be authenticated to seed demonstration data");

    // 1. Create Active Support Programmes (Projects)
    const demoProjects = [
      {
        organization_id: orgId,
        name: "Project Aahar — Acute Malnutrition & Ration Relief",
        description: "Emergency high-protein food ration kits and maternal nutrition packages for vulnerable low-income families.",
        objectives: "Eradicate severe acute malnutrition across Riverbank & Slum Clusters.",
        location: "Ward 7 East, Riverbank Colony",
        start_date: "2026-01-01",
        end_date: "2026-12-31",
        budget: 450000,
        currency: "INR",
        status: "active",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        name: "Sanjeevani Clinic — Emergency Dialysis & Chronic Care",
        description: "Subsidized life-saving dialysis sessions, insulin, and emergency medical diagnostic support.",
        objectives: "Prevent patient mortality due to lack of acute critical healthcare funds.",
        location: "Central District Hospital Zone",
        start_date: "2026-01-15",
        end_date: "2026-12-31",
        budget: 600000,
        currency: "INR",
        status: "active",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        name: "Vidya Jyoti — Child Education & Learning Kits",
        description: "School supplies, uniforms, bags, and bridge schooling for out-of-school children.",
        objectives: "Enable 200 first-generation learners to enroll in formal schooling.",
        location: "North Municipal Ward 3",
        start_date: "2026-02-01",
        end_date: "2026-11-30",
        budget: 250000,
        currency: "INR",
        status: "active",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        name: "Ashray — Flood Rehabilitation & Shelter Relief",
        description: "Waterproof tarpaulins, winter blankets, emergency dry rations, and basic home reconstruction aid.",
        objectives: "Immediate disaster shelter and winter survival kits for displaced families.",
        location: "Yamuna Floodplain Camp Alpha",
        start_date: "2026-03-01",
        end_date: "2026-09-30",
        budget: 350000,
        currency: "INR",
        status: "active",
        created_by: user.id,
      },
    ];

    // Check existing projects
    const { data: existingProjects } = await supabase
      .from("projects")
      .select("id, name")
      .eq("organization_id", orgId)
      .limit(5);

    let projectMap: Record<string, string> = {};

    if (!existingProjects || existingProjects.length < 2) {
      const { data: createdProjects, error: pErr } = await supabase
        .from("projects")
        .insert(demoProjects)
        .select("id, name");

      if (pErr) console.warn("Project seed note:", pErr);
      if (createdProjects) {
        createdProjects.forEach((p) => {
          projectMap[p.name] = p.id;
        });
      }
    } else {
      existingProjects.forEach((p) => {
        projectMap[p.name] = p.id;
      });
    }

    // 2. Create Diverse Beneficiary Records
    const demoBeneficiaries = [
      {
        organization_id: orgId,
        code: "BEN-0042",
        full_name: "Ananya Sharma",
        phone: "+91 98765 43210",
        email: "ananya.care@demo.local",
        gender: "Female",
        date_of_birth: "1988-06-14",
        household_size: 6,
        support_category: "Healthcare",
        support_requirements: "Critical emergency dialysis required bi-weekly. Displaced by recent flash flood. Household includes 3 young children and elderly bedridden mother.",
        city: "Central District",
        region: "Sector 4",
        status: "active",
        registration_date: "2026-09-10",
        notes: "Acute critical case. Requires urgent medical clearance and emergency ration kit.",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        code: "BEN-0108",
        full_name: "Rajesh Kumar Patel",
        phone: "+91 91234 56789",
        gender: "Male",
        date_of_birth: "1981-11-20",
        household_size: 5,
        support_category: "Food",
        support_requirements: "Day laborer suffering from severe spinal fracture. Zero household income for past 2 months. Facing imminent eviction.",
        city: "Ward 7 East",
        region: "Riverbank Colony",
        status: "active",
        registration_date: "2026-09-18",
        notes: "High priority. Recommended for Project Aahar monthly food packages.",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        code: "BEN-0215",
        full_name: "Sunita Devi",
        phone: "+91 98112 33445",
        gender: "Female",
        date_of_birth: "1954-03-05",
        household_size: 2,
        support_category: "Food",
        support_requirements: "Elderly widow living with disabled grandson. Stated severe acute hunger and lack of winter blankets.",
        city: "Ward 7 East",
        region: "Riverbank Colony",
        status: "active",
        registration_date: "2026-09-25",
        notes: "High priority. Eligible for food kit & warm winter clothing.",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        code: "BEN-0330",
        full_name: "Vikramjit Singh",
        phone: "+91 97654 32109",
        gender: "Male",
        date_of_birth: "1992-08-12",
        household_size: 4,
        support_category: "Education",
        support_requirements: "Street artisan seeking school admission and textbooks for two daughters (ages 7 and 10).",
        city: "North Municipal",
        region: "Ward 3",
        status: "active",
        registration_date: "2026-10-01",
        notes: "Moderate priority. Candidate for Vidya Jyoti learning kits.",
        created_by: user.id,
      },
      {
        organization_id: orgId,
        code: "BEN-0404",
        full_name: "Fatima Sheikh",
        phone: "+91 99887 76655",
        gender: "Female",
        date_of_birth: "1996-01-30",
        household_size: 3,
        support_category: "Shelter",
        support_requirements: "Temporary shelter repair and basic kitchen essentials following neighborhood fire.",
        city: "Yamuna Floodplain",
        region: "Camp Alpha",
        status: "active",
        registration_date: "2026-10-05",
        notes: "Emergency relief kit and tarpaulin delivered.",
        created_by: user.id,
      },
    ];

    const { data: createdBens, error: bErr } = await supabase
      .from("beneficiaries")
      .upsert(demoBeneficiaries, { onConflict: "organization_id, code" })
      .select("id, code, full_name");

    if (bErr) throw bErr;

    // 3. Create Sample Prior Distributions
    if (createdBens && createdBens.length > 0) {
      const fatima = createdBens.find((b) => b.code === "BEN-0404");
      const vikram = createdBens.find((b) => b.code === "BEN-0330");

      const demoDistributions: any[] = [];

      if (fatima) {
        demoDistributions.push({
          organization_id: orgId,
          beneficiary_id: fatima.id,
          reference: "AST-DEMO01",
          assistance_type: "Emergency Relief",
          description: "Waterproof tarpaulin & solar lantern",
          quantity: 1,
          unit: "kit",
          estimated_value: 1200,
          distribution_date: "2026-10-08",
          status: "distributed",
          responsible_user_id: user.id,
          created_by: user.id,
        });
      }

      if (vikram) {
        demoDistributions.push({
          organization_id: orgId,
          beneficiary_id: vikram.id,
          reference: "AST-DEMO02",
          assistance_type: "Educational Materials",
          description: "Notebooks, stationery and geometry kits for 2 students",
          quantity: 2,
          unit: "sets",
          estimated_value: 800,
          distribution_date: "2026-10-12",
          status: "distributed",
          responsible_user_id: user.id,
          created_by: user.id,
        });
      }

      if (demoDistributions.length > 0) {
        await supabase
          .from("assistance_records")
          .upsert(demoDistributions, { onConflict: "organization_id, reference" });
      }
    }

    toast.success("Competition demo dataset loaded successfully!");
    return true;
  } catch (err: any) {
    console.error("Failed to seed demo data:", err);
    toast.error(err.message || "Failed to load demo dataset");
    return false;
  }
}
