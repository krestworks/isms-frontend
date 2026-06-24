import { Package } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InventoryDashboardTab from "@/components/inventory/InventoryDashboardTab";
import ProductsTab from "@/components/inventory/ProductsTab";
import SuppliersTab from "@/components/inventory/SuppliersTab";
import PurchaseOrdersTab from "@/components/inventory/PurchaseOrdersTab";
import GoodsReceiptsTab from "@/components/inventory/GoodsReceiptsTab";
import StockMovementsTab from "@/components/inventory/StockMovementsTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";

export default function InventoryPage() {
  return (
    <ModulePageShell
      title="Central Inventory"
      description="Manage products, stock, suppliers and procurement for all modules"
      icon={Package}
    >
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="products">Items & Stock</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn">Goods Receipts</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><InventoryDashboardTab /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="po"><PurchaseOrdersTab /></TabsContent>
        <TabsContent value="grn"><GoodsReceiptsTab /></TabsContent>
        <TabsContent value="movements"><StockMovementsTab /></TabsContent>
        <TabsContent value="staff"><ModuleStaffTab department="Inventory" /></TabsContent>
        <TabsContent value="shifts"><ShiftScheduleTab department="Inventory" /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
