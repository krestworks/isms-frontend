import { Fuel } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TanksTab } from "@/components/fuel/TanksTab";
import { PumpSalesTab } from "@/components/fuel/PumpSalesTab";
import { FuelInventoryTab } from "@/components/fuel/FuelInventoryTab";
import { SalesHistoryTab } from "@/components/fuel/SalesHistoryTab";
import { FuelStaffTab } from "@/components/fuel/FuelStaffTab";
import { ReconciliationTab } from "@/components/fuel/ReconciliationTab";

export default function FuelPage() {
  return (
    <ModulePageShell title="Fuel Management" description="Tank monitoring, pump sales, inventory & reconciliation" icon={Fuel}>
      <Tabs defaultValue="tanks" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="tanks" className="text-xs">Tanks</TabsTrigger>
          <TabsTrigger value="pump-sales" className="text-xs">Pump Sales</TabsTrigger>
          <TabsTrigger value="inventory" className="text-xs">Inventory</TabsTrigger>
          <TabsTrigger value="sales-history" className="text-xs">Sales History</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs">Reconciliation</TabsTrigger>
        </TabsList>
        <TabsContent value="tanks"><TanksTab /></TabsContent>
        <TabsContent value="pump-sales"><PumpSalesTab /></TabsContent>
        <TabsContent value="inventory"><FuelInventoryTab /></TabsContent>
        <TabsContent value="sales-history"><SalesHistoryTab /></TabsContent>
        <TabsContent value="staff"><FuelStaffTab /></TabsContent>
        <TabsContent value="reconciliation"><ReconciliationTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
