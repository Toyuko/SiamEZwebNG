import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getServices } from "@/actions/admin";
import { CreateInvoiceWizard } from "./CreateInvoiceWizard";

export default async function AdminNewInvoicePage() {
  const services = await getServices();
  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <p className="font-medium">No services in the database</p>
        <p className="mt-2 text-sm">
          Add at least one service under Admin → Services before creating invoices that need a new case.
        </p>
        <Button className="mt-4" variant="outline" asChild>
          <Link href="/admin/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }
  return <CreateInvoiceWizard services={services} />;
}
