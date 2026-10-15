import { extendTenantTrial, toggleTenantStatus } from "./actions";
import { requireSuperAdmin } from "./auth";
import Image from "next/image";
import "./admin.css";

type TenantRow = {
  id: string;
  name: string;
  owner_id: string;
  status: string;
  trial_ends_at: string;
};

type SubscriptionRow = { tenant_id: string; plan: string; status: string };
type OwnerRow = { id: string; email: string };
type ProfileRow = { tenant_id: string };
type SaleRow = { total_amount: number | string };

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : dateFormatter.format(date);
}

export default async function AdminPage() {
  const admin = await requireSuperAdmin();
  const [tenantResult, subscriptionResult, profileResult, ownerResult, saleResult] = await Promise.all([
    admin.from("tenants").select("id,name,owner_id,status,trial_ends_at").order("created_at", { ascending: false }),
    admin.from("subscriptions").select("tenant_id,plan,status"),
    admin.from("profiles").select("tenant_id"),
    admin.from("profiles").select("id,email").eq("role", "owner"),
    admin.from("sales").select("total_amount").eq("status", "completed"),
  ]);

  const queryError = tenantResult.error ?? subscriptionResult.error ?? profileResult.error ?? ownerResult.error ?? saleResult.error;
  if (queryError) throw new Error("Could not load the admin dashboard data.");

  const tenants = (tenantResult.data ?? []) as TenantRow[];
  const subscriptions = (subscriptionResult.data ?? []) as SubscriptionRow[];
  const profiles = (profileResult.data ?? []) as ProfileRow[];
  const owners = (ownerResult.data ?? []) as OwnerRow[];
  const sales = (saleResult.data ?? []) as SaleRow[];
  const ownersById = new Map(owners.map((owner) => [owner.id, owner.email]));
  const subscriptionsByTenant = new Map(subscriptions.map((subscription) => [subscription.tenant_id, subscription]));
  const usersByTenant = new Map<string, number>();

  for (const profile of profiles) {
    usersByTenant.set(profile.tenant_id, (usersByTenant.get(profile.tenant_id) ?? 0) + 1);
  }

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status === "active").length;
  const trialAccounts = tenants.filter((tenant) => tenant.status === "trialing").length;
  const totalRevenue = sales.reduce((total, sale) => total + Number(sale.total_amount || 0), 0);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <a href="/admin" aria-label="ZLUPOS"><Image src="/logo.svg" alt="ZLUPOS" width={132} height={38} /></a>
          <p className="admin-eyebrow">PLATFORM CONTROL</p>
          <h1>Super Admin</h1>
          <p className="admin-description">Salon accounts, subscriptions, and platform performance.</p>
        </div>
        <div className="admin-account-count">
          <span className="count-indicator" />
          <span>{profiles.length.toLocaleString()} platform users</span>
        </div>
      </header>

      <section className="admin-metrics" aria-label="Platform metrics">
        <article className="metric-card metric-salons">
          <span className="metric-label">Total Salons</span>
          <strong>{tenants.length.toLocaleString()}</strong>
          <span className="metric-note">Registered workspaces</span>
        </article>
        <article className="metric-card metric-subscriptions">
          <span className="metric-label">Active Subscriptions</span>
          <strong>{activeSubscriptions.toLocaleString()}</strong>
          <span className="metric-note">Currently active plans</span>
        </article>
        <article className="metric-card metric-trials">
          <span className="metric-label">Trial Accounts</span>
          <strong>{trialAccounts.toLocaleString()}</strong>
          <span className="metric-note">Accounts in evaluation</span>
        </article>
        <article className="metric-card metric-revenue">
          <span className="metric-label">Total Revenue</span>
          <strong>{currency.format(totalRevenue)}</strong>
          <span className="metric-note">Completed sales</span>
        </article>
      </section>

      <section className="salons-section" aria-labelledby="salons-heading">
        <div className="section-heading">
          <div>
            <p className="admin-eyebrow">ACCOUNT DIRECTORY</p>
            <h2 id="salons-heading">Salons</h2>
          </div>
          <span className="salon-count">{tenants.length.toLocaleString()} accounts</span>
        </div>

        <div className="table-scroll">
          <table className="salons-table">
            <thead>
              <tr>
                <th scope="col">Salon Name</th>
                <th scope="col">Owner Email</th>
                <th scope="col">Plan Type</th>
                <th scope="col">Status</th>
                <th scope="col">Trial End Date</th>
                <th scope="col">Users</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const subscription = subscriptionsByTenant.get(tenant.id);
                const isSuspended = tenant.status === "suspended";

                return (
                  <tr key={tenant.id}>
                    <td className="salon-name">{tenant.name}</td>
                    <td className="owner-email">{ownersById.get(tenant.owner_id) ?? "No owner email"}</td>
                    <td><span className="plan-name">{subscription?.plan ?? "No plan"}</span></td>
                    <td>
                      <span className={`status-badge ${isSuspended ? "status-suspended" : "status-active"}`}>
                        <span className="status-dot" />
                        {isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>
                    <td>{formatDate(tenant.trial_ends_at)}</td>
                    <td>{(usersByTenant.get(tenant.id) ?? 0).toLocaleString()}</td>
                    <td>
                      <div className="row-actions">
                        <form action={toggleTenantStatus}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <button className="action-button" type="submit">
                            {isSuspended ? "Activate" : "Suspend"}
                          </button>
                        </form>
                        <form action={extendTenantTrial}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <button className="action-button action-secondary" type="submit">Extend Trial +14d</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {tenants.length === 0 && (
                <tr><td className="empty-table" colSpan={7}>No salon accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}