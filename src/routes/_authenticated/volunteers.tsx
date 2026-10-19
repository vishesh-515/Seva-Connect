import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { volunteersConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/volunteers")({
  head: () => ({
    meta: [
      { title: "Volunteers — Seva Connect" },
      { name: "description", content: "Manage volunteers in Seva Connect." },
      { property: "og:title", content: "Volunteers — Seva Connect" },
      { property: "og:description", content: "Manage volunteers in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={volunteersConfig} />,
});
