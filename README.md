# Seva Connect

**Seva Connect** is a complete, production-ready NGO & Non-Profit Beneficiary Management System designed to streamline charitable operations, track assistance, manage volunteers, engage donors, and provide financial transparency.

---

## Key Features

- **Beneficiary Management**: Register individuals and families, maintain profiles, verify contacts, capture support categories, and detect potential duplicate registrations.
- **Urgent-Case Prioritization**: Dynamic vulnerability assessment evaluating acute support requirements, household size, healthcare/shelter emergencies, and days since assistance was last distributed.
- **Smart Support-Program Matching**: Automated recommendation engine matching beneficiaries with active NGO programs and projects based on focus categories, location proximity, and program capacity.
- **Assistance Tracking & Audit Trail**: Record distributions (food kits, clothing, healthcare, education kits, financial aid) linked directly to beneficiaries and projects with audit timestamps and notes.
- **Project & Program Management**: Manage multi-phase initiatives, track designated budgets vs real spending, assign team members & volunteers, and track beneficiary enrollment against targets.
- **Donation Management**: Record monetary and in-kind contributions, track payment methods, generate printable donation acknowledgments, and report by currency.
- **Expense Tracking & Receipt Storage**: Record operational spending, attach expense receipts (PDF, JPG, PNG) securely to Supabase storage, and link expenses to projects.
- **Volunteer Management**: Maintain volunteer rosters, skills, availability, assignment to projects, and log volunteer hours.
- **Financial & Operational Reporting**: Real-time breakdown of donations, expenses, net balance, assistance distributions, and new beneficiary intake with CSV export and print view.
- **Multi-Tenant Workspaces & Role-Based Access Control**:
  - Roles: `owner`, `admin`, `staff`, `project_manager`, `viewer`
  - Granular permissions enforced at both the UI and database Row-Level Security (RLS) layers.
  - Team member invitations and organization profile management.

---

## Tech Stack

- **Frontend**: [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) + [React 19](https://react.dev)
- **State Management & Querying**: [TanStack Query v5](https://tanstack.com/query)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) + Modern OKLCH color design system + [Lucide Icons](https://lucide.dev)
- **Backend & Database**: [Supabase](https://supabase.com) (PostgreSQL with Row Level Security, RPC functions, and Storage)
- **Data Visualizations**: [Recharts](https://recharts.org)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) (v20+ recommended)
- `npm` or `pnpm`

### Installation

1. Clone the repository:

   ```sh
   git clone <repository-url>
   cd web
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Configure environment variables in `.env`:

   ```env
   VITE_SUPABASE_URL="https://<your-project>.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="<your-publishable-key>"
   SUPABASE_URL="https://<your-project>.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="<your-publishable-key>"
   ```

4. Start development server:

   ```sh
   npm run dev
   ```

5. Run test suite:

   ```sh
   npm run test
   ```

6. Build for production:
   ```sh
   npm run build
   ```

---

## License

Private and proprietary. Built for Seva Connect.
