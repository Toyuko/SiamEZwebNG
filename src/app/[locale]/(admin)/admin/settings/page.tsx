import { getAdminPaymentSettings, getAdminConciergeSettings } from "@/actions/admin";
import { getAdminEmailStatus } from "@/actions/admin-email";
import { getAdminVehiclePricing } from "@/actions/vehicle-leads";
import { requireStaff } from "@/lib/auth";
import { PaymentSettingsCard } from "./PaymentSettingsCard";
import { EmailSettingsCard } from "./EmailSettingsCard";
import { ConciergeSettingsCard } from "./ConciergeSettingsCard";
import { VehiclePricingCard } from "./VehiclePricingCard";

export default async function AdminSettingsPage() {
  const session = await requireStaff();
  const [paymentSettings, emailStatus, conciergeSettings, vehiclePricing] = await Promise.all([
    getAdminPaymentSettings(),
    getAdminEmailStatus(),
    getAdminConciergeSettings(),
    getAdminVehiclePricing(),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Soft-launch controls for payments, email, Ask SiamEZ, and vehicle service fees.
      </p>
      <ConciergeSettingsCard initial={conciergeSettings} />
      <EmailSettingsCard status={emailStatus} defaultTo={session.user.email} />
      <PaymentSettingsCard initial={paymentSettings} />
      <VehiclePricingCard initial={vehiclePricing} />
    </div>
  );
}
