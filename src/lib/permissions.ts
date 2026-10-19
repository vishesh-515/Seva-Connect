export type OrgRole = "owner" | "admin" | "staff" | "project_manager" | "viewer";

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  staff: "Staff",
  project_manager: "Project manager",
  viewer: "Management / Viewer",
};

/** Mirrors the database RLS policies. The database is the source of truth; this only shapes the UI. */
export const PERMISSIONS = {
  "beneficiaries.write": ["owner", "admin", "staff", "project_manager"],
  "volunteers.write": ["owner", "admin", "staff", "project_manager"],
  "donors.read": ["owner", "admin", "staff"],
  "donors.write": ["owner", "admin", "staff"],
  "donations.write": ["owner", "admin", "staff"],
  "projects.write": ["owner", "admin", "project_manager"],
  "expenses.write": ["owner", "admin", "staff", "project_manager"],
  "assistance.write": ["owner", "admin", "staff", "project_manager"],
  "records.delete": ["owner", "admin"],
  "team.manage": ["owner", "admin"],
  "settings.manage": ["owner", "admin"],
} as const satisfies Record<string, readonly OrgRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: OrgRole | null | undefined, permission: Permission) {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly OrgRole[]).includes(role);
}
