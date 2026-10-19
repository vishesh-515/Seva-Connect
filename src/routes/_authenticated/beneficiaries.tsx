import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { beneficiariesConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/beneficiaries")({
  head: () => ({
    meta: [
      { title: "Beneficiaries — Seva Connect" },
      { name: "description", content: "Manage beneficiaries in Seva Connect." },
      { property: "og:title", content: "Beneficiaries — Seva Connect" },
      { property: "og:description", content: "Manage beneficiaries in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={beneficiariesConfig} />,
});
