import { Droplets } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductionTab } from "@/components/water/ProductionTab";
import { EquipmentTab } from "@/components/water/EquipmentTab";
import { WaterSalesTab } from "@/components/water/WaterSalesTab";
import { WaterOrdersTab } from "@/components/water/WaterOrdersTab";
import { DistributionTab } from "@/components/water/DistributionTab";
import { WaterInvoicesTab } from "@/components/water/WaterInvoicesTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";

export default function WaterPage() {
  return (
    <ModulePageShell title="Water Production" description="Production tracking, equipment, distribution & invoicing" icon={Droplets}>
      <Tabs defaultValue="production" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">Equipment</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
          <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
          <TabsTrigger value="staff" className="text-xs">Staff</TabsTrigger>
          <TabsTrigger value="shifts" className="text-xs">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="production"><ProductionTab /></TabsContent>
        <TabsContent value="equipment"><EquipmentTab /></TabsContent>
        <TabsContent value="sales"><WaterSalesTab /></TabsContent>
        <TabsContent value="orders"><WaterOrdersTab /></TabsContent>
        <TabsContent value="distribution"><DistributionTab /></TabsContent>
        <TabsContent value="invoices"><WaterInvoicesTab /></TabsContent>
        <TabsContent value="staff"><ModuleStaffTab department="Water" /></TabsContent>
        <TabsContent value="shifts"><ShiftScheduleTab department="Water" /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
