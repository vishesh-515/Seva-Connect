import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { beneficiariesConfig } from "@/lib/entities";
import { Button } from "@/components/ui/button";
import { Barcode } from "lucide-react";
import { useCurrentOrg } from "@/lib/org-context";
import { DistributionScanner } from "@/components/scanner/DistributionScanner";

export const Route = createFileRoute("/_authenticated/beneficiaries")({
  head: () => ({
    meta: [
      { title: "Beneficiaries — Seva Connect" },
      { name: "description", content: "Manage beneficiaries and case prioritization in Seva Connect." },
      { property: "og:title", content: "Beneficiaries — Seva Connect" },
      { property: "og:description", content: "Manage beneficiaries in Seva Connect." },
    ],
  }),
  component: BeneficiariesPage,
});

function BeneficiariesPage() {
  const { org, role, can } = useCurrentOrg();
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <>
      <EntityPage
        config={beneficiariesConfig}
        extraActions={
          can("assistance.write") && (
            <Button
              onClick={() => setScannerOpen(true)}
              className="gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              <Barcode className="h-4 w-4" />
              <span>Scan to Distribute</span>
            </Button>
          )
        }
      />

      <DistributionScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        orgId={org.id}
        userRole={role}
      />
    </>
  );
}
