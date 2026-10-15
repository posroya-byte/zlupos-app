# ZLUPOS Production

Salon operations starter built with Next.js 14 App Router, TypeScript, Tailwind CSS, and Supabase.

## Local setup

1. Set the Supabase project URL, anon key, and service-role key in `.env.local`, using `.env.example` as a reference. Keep the service-role key server-only.
2. Run `supabase/schema.sql` in the Supabase SQL editor. The onboarding API creates the public `salon-assets` storage bucket when a logo is first uploaded.
3. Run `npm install` and `npm run dev`, then open `http://localhost:3000`.

The schema enables row-level security on every application table and defines no public policies. The service-role key is only used by the onboarding API; add tenant-scoped policies before enabling direct browser database access. The POS catalog and payment flow currently use sample services and are not persisted as sales.

## Routes

- `/onboarding`: four-step Arabic account, salon, branding, and plan setup. Creates a confirmed Supabase Auth user, tenant, owner profile, main branch, and 14-day trial subscription.
- `/login`: returning owner sign-in.
- `/dashboard/pos`: cashier POS with sample services, cart, cash/card confirmation, and printable receipt.
- `/api/onboarding`: server-only account and tenant provisioning endpoint.

## Checks

- `npm run lint`
- `npm run build`
