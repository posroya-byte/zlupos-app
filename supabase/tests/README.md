# Isolated database tests

## Run

```powershell
npm ci
npm test
```

The test command starts an in-memory PostgreSQL instance in Node. It does not read `.env.local`, make network requests, start Docker, or connect to Supabase. The database is discarded when the command exits.

The harness creates only local test roles and an `auth.uid()` stub. It runs the actual historical migrations followed by `20261015030000_stabilize_tenant_access_and_sales.sql`, then tests tenant RLS, service pricing, cash/card sale records, retry behavior, trial expiry and suspension gates, direct-write grants, RPC grants, and transaction rollback after a forced sale-item failure. A separate in-memory database executes `schema.sql` twice and checks its RLS and effective privileges.

PGlite is single-connection. Repeated requests are tested sequentially; this does not prove lock behavior with two simultaneous PostgreSQL sessions. The fixture is not Supabase Auth or Storage, so it does not test real salon signup, password login, image upload, or email confirmation. A full Supabase end-to-end run needs a separate isolated Supabase instance/project and test-only credentials. Do not point those tests at the production URL or reuse production users. No remote project or database is created by these instructions.

The real integration suite is prepared separately; see [REAL_SUPABASE_TESTING.md](REAL_SUPABASE_TESTING.md). Run it only with a dedicated test project's keys:

```powershell
npm run test:supabase
```

It starts Next with test-only environment overrides, exercises Auth, Storage, PostgREST/RLS, Proxy, and concurrent RPC requests from separate Supabase clients, then removes only the generated test users and their tenant data. Remote targets require an explicit confirmation string and a matching project ref. It will refuse to run if test variables are missing.

## Migration failure and rollback

The migration is wrapped in `BEGIN`/`COMMIT`. A statement error before commit causes PostgreSQL to roll back the transaction, including the status normalization and DDL. Do not run it with a client configured to continue after SQL errors. After a successful commit, rollback is not automatic; use a separately reviewed forward-fix or a dedicated down migration, and do not restore the old sale RPC without also restoring its old grants and application compatibility.
