import { Flame } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CylindersTab } from "@/components/lpg/CylindersTab";
import { LpgSalesTab } from "@/components/lpg/LpgSalesTab";
import { RefillsTab } from "@/components/lpg/RefillsTab";
import { SuppliersTab } from "@/components/lpg/SuppliersTab";
import { OrdersTab } from "@/components/lpg/OrdersTab";
import { InvoicesTab } from "@/components/lpg/InvoicesTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";
import { usePermissions } from "@/lib/permissions";

export default function LpgPage() {
  const can = usePermissions();

  const showCylinders = can("lpg.cylinders.view");
  const showSales     = can("lpg.sales.view");
  const showRefills   = can("lpg.refills.record") || can("lpg.cylinders.manage");
  const showSuppliers = can("lpg.suppliers.manage");
  const showOrders    = can("lpg.orders.create");
  const showInvoices  = can("lpg.invoices.issue");
  const showStaff     = can("hr.staff.view");
  const showShifts    = can("hr.shifts.view");

  const defaultTab = showSales ? "sales" : showCylinders ? "cylinders" : "sales";

  return (
    <ModulePageShell title="LPG Management" description="Cylinder inventory, sales, refills, orders & invoicing" icon={Flame}>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          {showCylinders && <TabsTrigger value="cylinders" className="text-xs">Cylinders</TabsTrigger>}
          {showSales     && <TabsTrigger value="sales"     className="text-xs">Sales</TabsTrigger>}
          {showRefills   && <TabsTrigger value="refills"   className="text-xs">Refills</TabsTrigger>}
          {showSuppliers && <TabsTrigger value="suppliers" className="text-xs">Suppliers</TabsTrigger>}
          {showOrders    && <TabsTrigger value="orders"    className="text-xs">Client Orders</TabsTrigger>}
          {showInvoices  && <TabsTrigger value="invoices"  className="text-xs">Invoices</TabsTrigger>}
          {showStaff     && <TabsTrigger value="staff"     className="text-xs">Staff</TabsTrigger>}
          {showShifts    && <TabsTrigger value="shifts"    className="text-xs">Shifts</TabsTrigger>}
        </TabsList>
        {showCylinders && <TabsContent value="cylinders"><CylindersTab /></TabsContent>}
        {showSales     && <TabsContent value="sales"><LpgSalesTab /></TabsContent>}
        {showRefills   && <TabsContent value="refills"><RefillsTab /></TabsContent>}
        {showSuppliers && <TabsContent value="suppliers"><SuppliersTab /></TabsContent>}
        {showOrders    && <TabsContent value="orders"><OrdersTab /></TabsContent>}
        {showInvoices  && <TabsContent value="invoices"><InvoicesTab /></TabsContent>}
        {showStaff     && <TabsContent value="staff"><ModuleStaffTab department="LPG" /></TabsContent>}
        {showShifts    && <TabsContent value="shifts"><ShiftScheduleTab department="LPG" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
