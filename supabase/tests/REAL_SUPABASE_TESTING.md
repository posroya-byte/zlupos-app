# Real Supabase integration tests

These tests exercise the actual Supabase Auth, PostgREST, Storage, and the Next.js onboarding API. They are deliberately separate from `npm test`; the local PGlite suite remains safe to run without credentials.

## Environment requirements

Do not reuse `.env.local` or production credentials. Obtain a dedicated, empty Supabase test project only after approval, then provide its URL, anon key, service-role key, and project ref in the current terminal environment. The service-role key is passed only to the local server/test process and is never written to a file or printed.

On Windows PowerShell, set values directly in the terminal (do not paste them into chat):

```powershell
$env:SUPABASE_TEST_URL = "https://<test-project-ref>.supabase.co"
$env:SUPABASE_TEST_ANON_KEY = "<test-project-anon-key>"
$env:SUPABASE_TEST_SERVICE_ROLE_KEY = "<test-project-service-role-key>"
$env:SUPABASE_TEST_PROJECT_REF = "<test-project-ref>"
$env:SUPABASE_TEST_ALLOW_REMOTE = "I_CONFIRM_THIS_IS_A_DEDICATED_TEST_PROJECT"
npm run test:supabase
```

For a loopback Supabase endpoint, the remote confirmation and project ref are not required. This repository does not install or start Docker/Supabase CLI. PGlite alone cannot provide Supabase Auth or Storage.

The runner refuses remote URLs unless they are HTTPS `*.supabase.co`, the hostname ref equals `SUPABASE_TEST_PROJECT_REF`, and the explicit confirmation value is present. It starts Next on a temporary loopback port and overrides the app Supabase variables for that process only; `.env.local` is not read as the source of test credentials. It does not create cloud projects or apply migrations.

## Prepare the isolated project

1. Create a new, dedicated, empty Supabase project manually after approval. Never use the production project ref or keys.
2. After separately approving the database operation, apply the SQL files in this order to that test project only: `20261015000000_init.sql`, `20261015010000_onboarding_service_role_grants.sql`, `20261015020000_trialling_status.sql`, `20261015030000_stabilize_tenant_access_and_sales.sql`. Do not apply `schema.sql` as well as the migration chain; it is the consolidated fresh-schema reference.
3. Review and run `supabase/operations/provision_platform_admin.sql` only if the test needs an admin user. First create and verify a dedicated operator in Supabase Auth, then replace the email placeholder. This SQL is not called by signup, the test runner, or any public endpoint.
4. Set only the dedicated test project's environment values in the current terminal and run `npm run test:supabase`.

The integration test creates two owners through `/api/onboarding`, signs them in, uploads and fetches a test logo, adds services, checks cross-tenant PostgREST reads/updates, tests employee and anonymous platform-admin access, performs cash/card sales, retries the same key concurrently through two Supabase clients, and checks expired/suspended/reactivated subscription gates. It tracks generated test users and tenant IDs and removes only those test rows and logo objects in `finally`. The `salon-assets` bucket is intentionally retained.

If a process is forcibly terminated before cleanup, remove only records whose owner emails start with `zlupos-it-` and tenant names start with `ZLUPOS Integration`; verify their generated run ID before deletion. Never run broad cleanup queries.

## Platform-admin provisioning

`platform_admins` has RLS enabled and no access for `anon` or `authenticated`; only `service_role` has table privileges, and that key stays server-side. Salon staff roles remain `owner`, `manager`, and `cashier` in `profiles`; they cannot self-assign platform access. The SQL file is an explicit database-owner operation and must be reviewed before use, even on the test project.

## Known limits

The real integration suite has not been run because no dedicated test project or test-only credentials are configured. The local suite (`npm test`) executes SQL with PGlite but does not emulate GoTrue/Auth, Supabase Storage policies, or independent Postgres sessions. The real suite's two concurrent RPCs use separate Supabase clients, so when run against the isolated project they exercise separate HTTP requests and pooled database sessions.