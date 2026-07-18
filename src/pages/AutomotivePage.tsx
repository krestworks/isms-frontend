import { Wrench } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceRecordsTab } from "@/components/automotive/ServiceRecordsTab";
import { ServicePricingTab } from "@/components/automotive/ServicePricingTab";
import { PartsInventoryTab } from "@/components/automotive/PartsInventoryTab";
import { BillingTab } from "@/components/automotive/BillingTab";
import { AutoInvoicesTab } from "@/components/automotive/AutoInvoicesTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { ModulePaymentDetailsTab } from "@/components/shared/ModulePaymentDetailsTab";
import { usePermissions } from "@/lib/permissions";

export default function AutomotivePage() {
  const can = usePermissions();

  const showServices = can("auto.services.view") || can("auto.services.record");
  const showPricing  = can("auto.pricing.manage");
  const showParts    = can("auto.inventory.manage");
  const showBilling  = can("auto.billing.view") || can("auto.billing.manage");
  const showInvoices = can("auto.invoices.issue") || can("auto.billing.view");
  const showStaff    = can("hr.staff.view");
  const showShifts   = can("hr.shifts.view");
  const showAudit    = can("audit.view");
  const showPayment  = can("auto.pricing.manage");

  const defaultTab = showServices ? "services" : showBilling ? "billing" : "services";

  return (
    <ModulePageShell title="Automotive Services" description="Service records, technicians, parts, billing & invoicing" icon={Wrench}>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          {showServices && <TabsTrigger value="services" className="text-xs">Service Records</TabsTrigger>}
          {showPricing  && <TabsTrigger value="pricing"  className="text-xs">Service Pricing</TabsTrigger>}
          {showParts    && <TabsTrigger value="parts"    className="text-xs">Parts Inventory</TabsTrigger>}
          {showBilling  && <TabsTrigger value="billing"  className="text-xs">Billing</TabsTrigger>}
          {showInvoices && <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>}
          {showStaff    && <TabsTrigger value="staff"    className="text-xs">Technicians</TabsTrigger>}
          {showShifts   && <TabsTrigger value="shifts"   className="text-xs">Shifts</TabsTrigger>}
          {showAudit    && <TabsTrigger value="audit"    className="text-xs">History</TabsTrigger>}
          {showPayment  && <TabsTrigger value="payment"  className="text-xs">Payment</TabsTrigger>}
        </TabsList>
        {showServices && <TabsContent value="services"><ServiceRecordsTab /></TabsContent>}
        {showPricing  && <TabsContent value="pricing"><ServicePricingTab /></TabsContent>}
        {showParts    && <TabsContent value="parts"><PartsInventoryTab /></TabsContent>}
        {showBilling  && <TabsContent value="billing"><BillingTab /></TabsContent>}
        {showInvoices && <TabsContent value="invoices"><AutoInvoicesTab /></TabsContent>}
        {showStaff    && <TabsContent value="staff"><ModuleStaffTab department="Automotive" /></TabsContent>}
        {showShifts   && <TabsContent value="shifts"><ShiftScheduleTab department="Automotive" /></TabsContent>}
        {showAudit    && <TabsContent value="audit"><ModuleAuditTab module="auto" /></TabsContent>}
        {showPayment  && <TabsContent value="payment"><ModulePaymentDetailsTab module="auto" moduleLabel="Automotive" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
