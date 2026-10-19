import { createFileRoute, Link } from "@tanstack/react-router";
import { volunteersConfig } from "@/lib/entities";
import { RecordDetail, Section, MiniTable, useRelated } from "@/components/entity/RecordDetail";
import { QuickAdd } from "@/components/entity/QuickAdd";
import { useCurrentOrg } from "@/lib/org-context";
import { formatDate, humanize } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/volunteers_/$id")({
  head: () => ({
    meta: [
      { title: "Volunteer profile — Seva Connect" },
      { name: "description", content: "Volunteer profile, project assignments and hours." },
      { property: "og:title", content: "Volunteer profile — Seva Connect" },
      { property: "og:description", content: "Volunteer profile, project assignments and hours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { can } = useCurrentOrg();
  const hours = useRelated(
    "volunteer_hours",
    "volunteer_id",
    id,
    "*, project:projects(id, name)",
    "activity_date",
  );
  const projects = useRelated(
    "project_members",
    "volunteer_id",
    id,
    "id, role, created_at, project:projects(id, name)",
  );
  const total = (hours.data ?? []).reduce((s, r) => s + Number(r["hours"] ?? 0), 0);
  return (
    <RecordDetail config={volunteersConfig} id={id} back="/volunteers" titleKey="full_name">
      {() => (
        <>
          <Section
            title={`Volunteer hours (${total} total)`}
            actions={
              can("volunteers.write") && (
                <QuickAdd
                  label="Log hours"
                  table="volunteer_hours"
                  fixed={{ volunteer_id: id }}
                  fields={[
                    { name: "activity_date", label: "Date", type: "date", required: true },
                    { name: "hours", label: "Hours", type: "number", required: true },
                    {
                      name: "project_id",
                      label: "Project",
                      options: { table: "projects", label: "name" },
                    },
                    { name: "description", label: "Activity" },
                  ]}
                />
              )
            }
          >
            <MiniTable
              rows={hours.data}
              empty="No hours logged yet."
              cols={[
                { label: "Date", render: (r) => formatDate(r["activity_date"]) },
                { label: "Hours", render: (r) => r["hours"] },
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
                { label: "Activity", render: (r) => r["description"] ?? "—" },
              ]}
            />
          </Section>
          <Section title="Project assignments">
            <MiniTable
              rows={projects.data}
              empty="Not assigned to any project."
              cols={[
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
                { label: "Role", render: (r) => humanize(r["role"]) },
                { label: "Since", render: (r) => formatDate(r["created_at"]) },
              ]}
            />
          </Section>
        </>
      )}
    </RecordDetail>
  );
}
