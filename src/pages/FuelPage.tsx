import { Fuel } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TanksTab } from "@/components/fuel/TanksTab";
import { PumpSalesTab } from "@/components/fuel/PumpSalesTab";
import { FuelInventoryTab } from "@/components/fuel/FuelInventoryTab";
import { SalesHistoryTab } from "@/components/fuel/SalesHistoryTab";
import { ReconciliationTab } from "@/components/fuel/ReconciliationTab";
import { FuelDeliveriesTab } from "@/components/fuel/FuelDeliveriesTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { usePermissions } from "@/lib/permissions";

export default function FuelPage() {
  const can = usePermissions();

  const showTanks      = can("fuel.tanks.view");
  const showSales      = can("fuel.sales.view");
  const showInventory  = can("fuel.tanks.create") || can("fuel.tanks.edit");
  const showRecon      = can("fuel.reconciliation.view");
  const showDeliveries = can("fuel.deliveries.view") || can("fuel.inventory.receive");
  const showStaff      = can("hr.staff.view");
  const showShifts     = can("hr.shifts.view");
  const showAudit      = can("audit.view");

  const defaultTab = showSales ? "pump-sales" : showTanks ? "tanks" : "pump-sales";

  return (
    <ModulePageShell title="Fuel Management" description="Tank monitoring, pump sales, inventory & reconciliation" icon={Fuel}>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          {showTanks      && <TabsTrigger value="tanks"          className="text-xs">Tanks</TabsTrigger>}
          {showSales      && <TabsTrigger value="pump-sales"     className="text-xs">Pump Sales</TabsTrigger>}
          {showInventory  && <TabsTrigger value="inventory"      className="text-xs">Inventory</TabsTrigger>}
          {showSales      && <TabsTrigger value="sales-history"  className="text-xs">Sales History</TabsTrigger>}
          {showRecon      && <TabsTrigger value="reconciliation" className="text-xs">Reconciliation</TabsTrigger>}
          {showDeliveries && <TabsTrigger value="deliveries"     className="text-xs">Deliveries</TabsTrigger>}
          {showStaff      && <TabsTrigger value="staff"          className="text-xs">Staff</TabsTrigger>}
          {showShifts     && <TabsTrigger value="shifts"         className="text-xs">Shifts</TabsTrigger>}
          {showAudit      && <TabsTrigger value="audit"          className="text-xs">History</TabsTrigger>}
        </TabsList>
        {showTanks      && <TabsContent value="tanks"><TanksTab /></TabsContent>}
        {showSales      && <TabsContent value="pump-sales"><PumpSalesTab /></TabsContent>}
        {showInventory  && <TabsContent value="inventory"><FuelInventoryTab /></TabsContent>}
        {showSales      && <TabsContent value="sales-history"><SalesHistoryTab /></TabsContent>}
        {showRecon      && <TabsContent value="reconciliation"><ReconciliationTab /></TabsContent>}
        {showDeliveries && <TabsContent value="deliveries"><FuelDeliveriesTab /></TabsContent>}
        {showStaff      && <TabsContent value="staff"><ModuleStaffTab department="Fuel" /></TabsContent>}
        {showShifts     && <TabsContent value="shifts"><ShiftScheduleTab department="Fuel" /></TabsContent>}
        {showAudit      && <TabsContent value="audit"><ModuleAuditTab module="fuel" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
