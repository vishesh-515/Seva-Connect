import { createFileRoute, Link } from "@tanstack/react-router";
import { donorsConfig } from "@/lib/entities";
import { RecordDetail, Section, MiniTable, useRelated } from "@/components/entity/RecordDetail";
import { StatusBadge } from "@/components/feedback/common";
import { useCurrentOrg } from "@/lib/org-context";
import {
  formatCurrency,
  formatDate,
  humanize,
  sumByCurrency,
  ELIGIBLE_DONATION_STATUSES,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/donors_/$id")({
  head: () => ({
    meta: [
      { title: "Donor profile — Seva Connect" },
      { name: "description", content: "Donor profile and giving history." },
      { property: "og:title", content: "Donor profile — Seva Connect" },
      { property: "og:description", content: "Donor profile and giving history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  useCurrentOrg();
  const gifts = useRelated(
    "donations",
    "donor_id",
    id,
    "*, project:projects(id, name)",
    "donation_date",
  );
  const eligible = (gifts.data ?? []).filter(
    (d) =>
      (ELIGIBLE_DONATION_STATUSES as readonly string[]).includes(d["status"]) &&
      d["amount"] != null,
  );
  const totals = sumByCurrency(eligible as any) as any;
  const totalText = Array.isArray(totals)
    ? totals.map((t: any) => formatCurrency(t.total ?? t.amount, t.currency)).join(" · ")
    : Object.entries(totals ?? {})
        .map(([c, v]) => formatCurrency(Number(v), c))
        .join(" · ");
  return (
    <RecordDetail config={donorsConfig} id={id} back="/donors" titleKey="name">
      {() => (
        <Section title={`Giving history${totalText ? ` — ${totalText}` : ""}`}>
          <MiniTable
            rows={gifts.data}
            empty="No donations recorded yet."
            cols={[
              { label: "Date", render: (r) => formatDate(r["donation_date"]) },
              { label: "Reference", render: (r) => r["reference"] },
              { label: "Type", render: (r) => humanize(r["donation_type"]) },
              {
                label: "Amount",
                render: (r) =>
                  r["amount"] != null
                    ? formatCurrency(Number(r["amount"]), r["currency"])
                    : (r["item_name"] ?? "—"),
              },
              {
                label: "Project",
                render: (r) =>
                  r["project"] ? (
                    <Link
                      to="/projects/$id"
                      params={{ id: r["project"].id }}
                      className="hover:underline"
                    >
                      {r["project"].name}
                    </Link>
                  ) : (
                    "—"
                  ),
              },
              { label: "Status", render: (r) => <StatusBadge status={r["status"]} /> },
            ]}
          />
        </Section>
      )}
    </RecordDetail>
  );
}
