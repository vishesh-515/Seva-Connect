import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { assistanceConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/assistance")({
  head: () => ({
    meta: [
      { title: "Assistance — Seva Connect" },
      { name: "description", content: "Manage assistance in Seva Connect." },
      { property: "og:title", content: "Assistance — Seva Connect" },
      { property: "og:description", content: "Manage assistance in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={assistanceConfig} />,
});
