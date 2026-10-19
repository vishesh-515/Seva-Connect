import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  PackageCheck,
  Barcode,
  Users,
  AlertTriangle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { EntityPage } from "@/components/entity/EntityPage";
import { assistanceConfig } from "@/lib/entities";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/feedback/common";
import { DistributionScanner } from "@/components/scanner/DistributionScanner";

export const Route = createFileRoute("/_authenticated/assistance")({
  head: () => ({
    meta: [
      { title: "Distributions — Seva Connect" },
      { name: "description", content: "Field distributions, beneficiary scanning, and kit dispensation." },
      { property: "og:title", content: "Distributions — Seva Connect" },
      { property: "og:description", content: "Field distributions and beneficiary scanning." },
    ],
  }),
  component: AssistancePage,
});

function AssistancePage() {
  const { org, role, can } = useCurrentOrg();
  const [scannerOpen, setScannerOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Real-time daily distribution stats
  const { data: todayStats } = useQuery({
    queryKey: ["org", org.id, "today-distribution-metrics", todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistance_records")
        .select("id, quantity, beneficiary_id, status")
        .eq("organization_id", org.id)
        .eq("distribution_date", todayStr);

      if (error) return { totalToday: 0, uniqueBeneficiaries: 0, totalItems: 0 };

      const records = data || [];
      const distributed = records.filter((r) => r.status === "distributed");
      const uniqueBens = new Set(distributed.map((r) => r.beneficiary_id)).size;
      const totalItems = distributed.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);

      return {
        totalToday: distributed.length,
        uniqueBeneficiaries: uniqueBens,
        totalItems,
      };
    },
    staleTime: 1000 * 30,
  });

  return (
    <div className="space-y-6">
      {/* Daily Field Operational Overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Distributions Today"
          value={todayStats?.totalToday ?? 0}
          icon={PackageCheck}
          toneVariant="primary"
          hint={`Recorded on ${todayStr}`}
        />
        <StatCard
          label="People Reached Today"
          value={todayStats?.uniqueBeneficiaries ?? 0}
          icon={Users}
          toneVariant="emerald"
          hint="Verified distinct beneficiaries"
        />
        <StatCard
          label="Total Items Dispensed"
          value={todayStats?.totalItems ?? 0}
          icon={TrendingUp}
          toneVariant="amber"
          hint="Kits, rations & relief supplies"
        />
      </div>

      {/* Main Distributions Entity Table with Scan Action */}
      <EntityPage
        config={assistanceConfig}
        extraActions={
          can("assistance.write") && (
            <Button
              onClick={() => setScannerOpen(true)}
              className="gap-2 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Barcode className="h-4 w-4" />
              <span>Scan to Distribute</span>
            </Button>
          )
        }
      />

      {/* Distribution Scanner Modal */}
      <DistributionScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        orgId={org.id}
        userRole={role}
      />
    </div>
  );
}
