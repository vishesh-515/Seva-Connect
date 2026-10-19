import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { donationsConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/donations")({
  head: () => ({
    meta: [
      { title: "Donations — Seva Connect" },
      { name: "description", content: "Manage donations in Seva Connect." },
      { property: "og:title", content: "Donations — Seva Connect" },
      { property: "og:description", content: "Manage donations in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={donationsConfig} />,
});
