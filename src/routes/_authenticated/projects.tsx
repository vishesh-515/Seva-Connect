import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { projectsConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Seva Connect" },
      { name: "description", content: "Manage projects in Seva Connect." },
      { property: "og:title", content: "Projects — Seva Connect" },
      { property: "og:description", content: "Manage projects in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={projectsConfig} />,
});
