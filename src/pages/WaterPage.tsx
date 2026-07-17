import { Droplets } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTab } from "@/components/water/ProductionTab";
import { EquipmentTab } from "@/components/water/EquipmentTab";
import { WaterSalesTab } from "@/components/water/WaterSalesTab";
import { WaterOrdersTab } from "@/components/water/WaterOrdersTab";
import { DistributionTab } from "@/components/water/DistributionTab";
import { WaterInvoicesTab } from "@/components/water/WaterInvoicesTab";
import { PriceListTab } from "@/components/water/PriceListTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { usePermissions } from "@/lib/permissions";

export default function WaterPage() {
  const can = usePermissions();

  const showProduction  = can("water.production.view");
  const showEquipment   = can("water.equipment.view");
  const showSales       = can("water.sales.record") || can("water.production.view");
  const showOrders      = can("water.orders.create");
  const showDistrib     = can("water.distributions.approve") || can("water.distributions.deliver");
  const showInvoices    = can("water.invoices.issue");
  const showPricing     = can("water.pricing.manage") || can("water.production.view");
  const showStaff       = can("hr.staff.view");
  const showShifts      = can("hr.shifts.view");
  const showAudit       = can("audit.view");

  const defaultTab = showProduction ? "production" : showSales ? "sales" : "production";

  return (
    <ModulePageShell title="Water Production" description="Production tracking, equipment, distribution & invoicing" icon={Droplets}>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          {showProduction && <TabsTrigger value="production"   className="text-xs">Production</TabsTrigger>}
          {showEquipment  && <TabsTrigger value="equipment"    className="text-xs">Equipment</TabsTrigger>}
          {showSales      && <TabsTrigger value="sales"        className="text-xs">Sales</TabsTrigger>}
          {showOrders     && <TabsTrigger value="orders"       className="text-xs">Orders</TabsTrigger>}
          {showDistrib    && <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>}
          {showInvoices   && <TabsTrigger value="invoices"     className="text-xs">Invoices</TabsTrigger>}
          {showPricing    && <TabsTrigger value="pricing"      className="text-xs">Pricing</TabsTrigger>}
          {showStaff      && <TabsTrigger value="staff"        className="text-xs">Staff</TabsTrigger>}
          {showShifts     && <TabsTrigger value="shifts"       className="text-xs">Shifts</TabsTrigger>}
          {showAudit      && <TabsTrigger value="audit"        className="text-xs">History</TabsTrigger>}
        </TabsList>
        {showProduction && <TabsContent value="production"><ProductionTab /></TabsContent>}
        {showEquipment  && <TabsContent value="equipment"><EquipmentTab /></TabsContent>}
        {showSales      && <TabsContent value="sales"><WaterSalesTab /></TabsContent>}
        {showOrders     && <TabsContent value="orders"><WaterOrdersTab /></TabsContent>}
        {showDistrib    && <TabsContent value="distribution"><DistributionTab /></TabsContent>}
        {showInvoices   && <TabsContent value="invoices"><WaterInvoicesTab /></TabsContent>}
        {showPricing    && <TabsContent value="pricing"><PriceListTab /></TabsContent>}
        {showStaff      && <TabsContent value="staff"><ModuleStaffTab department="Water" /></TabsContent>}
        {showShifts     && <TabsContent value="shifts"><ShiftScheduleTab department="Water" /></TabsContent>}
        {showAudit      && <TabsContent value="audit"><ModuleAuditTab module="water" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
