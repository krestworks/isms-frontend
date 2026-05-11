import { Package } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubBusinessesTab from "@/components/inventory/SubBusinessesTab";
import ProductsTab from "@/components/inventory/ProductsTab";
import StockMovementsTab from "@/components/inventory/StockMovementsTab";
import InventorySalesTab from "@/components/inventory/InventorySalesTab";
import SuppliersTab from "@/components/inventory/SuppliersTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";

export default function InventoryPage() {
  return (
    <ModulePageShell title="Inventory Management" description="Sub-businesses (Mini Mart, Pharmacy, Cafe) — products, stock, sales" icon={Package}>
      <Tabs defaultValue="sub-businesses" className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="sub-businesses">Sub-Businesses</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="sub-businesses"><SubBusinessesTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="movements"><StockMovementsTab /></TabsContent>
        <TabsContent value="sales"><InventorySalesTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="staff"><ModuleStaffTab department="Inventory" /></TabsContent>
        <TabsContent value="shifts"><ShiftScheduleTab department="Inventory" /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
