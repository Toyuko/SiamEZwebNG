import { getAdminPaymentSettings, getAdminConciergeSettings } from "@/actions/admin";
import { getAdminEmailStatus } from "@/actions/admin-email";
import { getAdminVehiclePricing } from "@/actions/vehicle-leads";
import { getSession, requireStaff } from "@/lib/auth";
import { isAdminAuthBypassEnabled } from "@/lib/auth/admin-bypass";
import { PaymentSettingsCard } from "./PaymentSettingsCard";
import { EmailSettingsCard } from "./EmailSettingsCard";
import { ConciergeSettingsCard } from "./ConciergeSettingsCard";
import { VehiclePricingCard } from "./VehiclePricingCard";

export default async function AdminSettingsPage() {
  const session = isAdminAuthBypassEnabled()
    ? await getSession()
    : await requireStaff();
  const [paymentSettings, emailStatus, conciergeSettings, vehiclePricing] = await Promise.all([
    getAdminPaymentSettings(),
    getAdminEmailStatus(),
    getAdminConciergeSettings(),
    getAdminVehiclePricing(),
  ]);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-siam-ink sm:text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-siam-ink-muted">
          Configure payments, email, Ask SiamEZ, and vehicle service fees.
        </p>
      </div>
      <div className="space-y-4">
        <ConciergeSettingsCard initial={conciergeSettings} />
        <EmailSettingsCard status={emailStatus} defaultTo={session?.user.email ?? ""} />
        <PaymentSettingsCard initial={paymentSettings} />
        <VehiclePricingCard initial={vehiclePricing} />
      </div>
    </div>
  );
}
