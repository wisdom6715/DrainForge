# DrainForge

DrainForge is a resident-and-authority platform for identifying drainage blockages and flood risk across the UNILAG, Akoka, Bariga, and Iwaya pilot corridor. The product loop is **report → verify → assign → respond → resolve → document → analyze**.

## Repository layout

The repository is organized as a workspace monorepo. `client/` contains the managed preview and production surface used by the hosting runtime. `apps/web/` contains the standalone Next.js application boundary for deployments that run the web app independently. `apps/api/` contains the FastAPI service contracts and deterministic notification orchestration. `packages/shared/` contains the shared report vocabulary and TypeScript contracts. `supabase/migrations/` contains the relational schema and row-level security policies. The existing `server/` and `drizzle/` directories remain available for the managed platform authentication and database plumbing.

| Area | Responsibility | Start command |
| --- | --- | --- |
| Managed web runtime | Resident and authority experience in the hosted preview | `pnpm dev` |
| Next.js web app | Standalone web deployment boundary | `pnpm dev:web` |
| FastAPI service | Typed report/status API and notification seam | `pnpm dev:api` |
| Shared package | Cross-app report enums and payloads | Imported by workspace consumers |
| Supabase | Auth, relational records, storage metadata, RLS | Apply migration in Supabase SQL editor or CLI |

## Environment

Copy `.env.example` to `.env` at the repository root. For the standalone applications, use the same values in their deployment environments. The web app only exposes variables prefixed with `NEXT_PUBLIC_` to the browser. Never expose the Supabase service-role key to the client.

The minimum production configuration is `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` when using the managed Drizzle layer, `CORS_ORIGINS`, and `NOTIFICATION_FROM_EMAIL`. `RESEND_API_KEY` is required only if outbound email delivery is enabled; in-app notifications are stored in Supabase without it. The managed runtime also supplies its built-in auth, storage, and analytics variables automatically.

## Local development

Install Node dependencies with `pnpm install`. Run the managed web experience with `pnpm dev`. Run the standalone FastAPI service with `pnpm dev:api`; it serves `/health`, `/api/v1/reports`, and `/api/v1/reports/{report_id}/status`. Run both with `pnpm dev:all` after installing the root development dependency set. Python dependencies are listed in `apps/api/requirements.txt` and can be installed with `python -m pip install -r apps/api/requirements.txt`.

The resident UI is available at `/`, while the authority console is available at `/authority`. The hosted preview currently uses the managed platform's existing auth session and API plumbing; the standalone Next.js and FastAPI boundaries are included for independent deployment and integration tests.

## Supabase setup

Create a Supabase project, enable email or OAuth authentication, create a Storage bucket named `report-evidence`, and apply `supabase/migrations/20260831000100_drainforge.sql`. The migration creates profiles, response teams, monitored sites, reports, evidence references, status history, and notifications, together with row-level security policies. Uploads should be sent to Storage and only their `storage_path`, MIME type, and size should be written to `report_evidence`.

Promote authority users by updating `profiles.role` to `authority`, `admin`, or `super_admin`. The API must derive the role from a verified Supabase JWT in production. The development header fallback in the FastAPI scaffold exists only to make contract testing straightforward and should be disabled at the edge in production.

## Notifications

Report creation produces an acknowledgement message. Moving a report to `verified` or `resolved` produces a status message. The production adapter persists in-app notifications to the `notifications` table and can be extended with an email delivery provider using `RESEND_API_KEY`. Authority stakeholder recipients are represented by the `response_teams.stakeholder_email` field and should be resolved server-side from the assigned team rather than accepted from browser input.

## Deployment

Deploy the managed project through the hosting dashboard after creating a checkpoint. For separate deployments, build the Next.js app with `pnpm --dir apps/web build` and run it with `pnpm --dir apps/web start`. Run the API with `uvicorn app.main:app --host 0.0.0.0 --port $PORT` from `apps/api`. Configure CORS to the deployed web origin and apply the migration before accepting traffic. Use HTTPS, verify JWTs against Supabase, keep service-role credentials server-side, and configure a Storage lifecycle policy appropriate for evidence retention.

## Scope and operational notes

The MVP deliberately focuses on reporting, visibility, role-aware operational handling, evidence references, and status notifications. IoT hardware, flood prediction, payments, marketplace functionality, payroll, and government ERP integration remain outside the first release. The UI uses calm pastel gradients, muted slate-purple type, editorial serif headings, wide-spaced sans-serif labels, thin corner brackets, and generous negative space to keep incident reporting composed rather than alarmist.
