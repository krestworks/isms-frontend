import { Flame } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CylindersTab } from "@/components/lpg/CylindersTab";
import { LpgSalesTab } from "@/components/lpg/LpgSalesTab";
import { RefillsTab } from "@/components/lpg/RefillsTab";
import { SuppliersTab } from "@/components/lpg/SuppliersTab";
import { OrdersTab } from "@/components/lpg/OrdersTab";
import { InvoicesTab } from "@/components/lpg/InvoicesTab";

export default function LpgPage() {
  return (
    <ModulePageShell title="LPG Management" description="Cylinder inventory, sales, refills, orders & invoicing" icon={Flame}>
      <Tabs defaultValue="cylinders" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="cylinders" className="text-xs">Cylinders</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs">Sales</TabsTrigger>
          <TabsTrigger value="refills" className="text-xs">Refills</TabsTrigger>
          <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">Client Orders</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Invoices & Receipts</TabsTrigger>
        </TabsList>
        <TabsContent value="cylinders"><CylindersTab /></TabsContent>
        <TabsContent value="sales"><LpgSalesTab /></TabsContent>
        <TabsContent value="refills"><RefillsTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
