import { Wrench } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceRecordsTab } from "@/components/automotive/ServiceRecordsTab";
import { TechniciansTab } from "@/components/automotive/TechniciansTab";
import { ServicePricingTab } from "@/components/automotive/ServicePricingTab";
import { PartsInventoryTab } from "@/components/automotive/PartsInventoryTab";
import { BillingTab } from "@/components/automotive/BillingTab";
import { AutoInvoicesTab } from "@/components/automotive/AutoInvoicesTab";

export default function AutomotivePage() {
  return (
    <ModulePageShell title="Automotive Services" description="Service records, technicians, parts, billing & invoicing" icon={Wrench}>
      <Tabs defaultValue="services" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="services" className="text-xs">Service Records</TabsTrigger>
          <TabsTrigger value="technicians" className="text-xs">Technicians</TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs">Service Pricing</TabsTrigger>
          <TabsTrigger value="parts" className="text-xs">Parts Inventory</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs">Billing</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Invoices & Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="services"><ServiceRecordsTab /></TabsContent>
        <TabsContent value="technicians"><TechniciansTab /></TabsContent>
        <TabsContent value="pricing"><ServicePricingTab /></TabsContent>
        <TabsContent value="parts"><PartsInventoryTab /></TabsContent>
        <TabsContent value="billing"><BillingTab /></TabsContent>
        <TabsContent value="invoices"><AutoInvoicesTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
