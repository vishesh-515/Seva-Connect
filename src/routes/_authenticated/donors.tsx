import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { donorsConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/donors")({
  head: () => ({
    meta: [
      { title: "Donors — Seva Connect" },
      { name: "description", content: "Manage donors in Seva Connect." },
      { property: "og:title", content: "Donors — Seva Connect" },
      { property: "og:description", content: "Manage donors in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={donorsConfig} />,
});
