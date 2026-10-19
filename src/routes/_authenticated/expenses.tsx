import { createFileRoute } from "@tanstack/react-router";
import { EntityPage } from "@/components/entity/EntityPage";
import { expensesConfig } from "@/lib/entities";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Seva Connect" },
      { name: "description", content: "Manage expenses in Seva Connect." },
      { property: "og:title", content: "Expenses — Seva Connect" },
      { property: "og:description", content: "Manage expenses in Seva Connect." },
    ],
  }),
  component: () => <EntityPage config={expensesConfig} />,
});
