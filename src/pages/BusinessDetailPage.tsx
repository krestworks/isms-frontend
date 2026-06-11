import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Store, ShoppingCart, Pill, UtensilsCrossed, Croissant, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness } from "@/lib/bizApi";

import { POSTab }            from "@/components/business/POSTab";
import { ProductsTab }       from "@/components/business/ProductsTab";
import { CategoriesTab }     from "@/components/business/CategoriesTab";
import { SuppliersTab }      from "@/components/business/SuppliersTab";
import { PurchaseOrdersTab } from "@/components/business/PurchaseOrdersTab";
import { SalesTab }          from "@/components/business/SalesTab";
import { StockMovementsTab } from "@/components/business/StockMovementsTab";
import { ExpensesTab }       from "@/components/business/ExpensesTab";
import { ReportsTab }        from "@/components/business/ReportsTab";
import { SetupTab }          from "@/components/business/SetupTab";

const ICONS: Record<string, React.ElementType> = {
  mart: ShoppingCart, pharmacy: Pill, restaurant: UtensilsCrossed, Tyre Centre: Croissant,
};

const TYPE_COLORS: Record<string, string> = {
  mart:       "bg-blue-500/10 text-blue-600 border-blue-200",
  pharmacy:   "bg-green-500/10 text-green-600 border-green-200",
  restaurant: "bg-orange-500/10 text-orange-600 border-orange-200",
  Tyre Centre:     "bg-yellow-500/10 text-yellow-600 border-yellow-200",
};

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<ApiBizBusiness | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!id) return;
    bizApi.businesses.get(id)
      .then(r => setBusiness(r.data))
      .catch(e => { toast.error(e?.message || "Failed to load business"); navigate("/business"); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) return null;

  const Icon        = ICONS[business.type] ?? Store;
  const isRestaurant = business.type === "restaurant";
  const colorCls    = TYPE_COLORS[business.type] ?? "";

  return (
    <ModulePageShell
      title={business.name}
      description={`${business.type.charAt(0).toUpperCase() + business.type.slice(1)} · Tax ${business.taxRate}% · ${business.currency}`}
      icon={Icon}
    >
      <div className="space-y-4">
        {/* Back + status badge */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" className="-ml-1 text-muted-foreground" onClick={() => navigate("/business")}>
            <ArrowLeft className="h-4 w-4 mr-1" />All Businesses
          </Button>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium ${colorCls}`}>
            <Icon className="h-3.5 w-3.5" />
            <span>{business.type.charAt(0).toUpperCase() + business.type.slice(1)}</span>
            <Badge variant={business.status === "active" ? "default" : "secondary"} className="text-[10px] h-4 px-1.5">
              {business.status}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="pos" className="space-y-4">
          <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-0.5">
            <TabsTrigger value="pos"        className="text-xs px-3">POS</TabsTrigger>
            <TabsTrigger value="sales"      className="text-xs px-3">Sales History</TabsTrigger>
            <TabsTrigger value="products"   className="text-xs px-3">Products</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs px-3">Categories</TabsTrigger>
            <TabsTrigger value="suppliers"  className="text-xs px-3">Suppliers</TabsTrigger>
            <TabsTrigger value="orders"     className="text-xs px-3">Purchase Orders</TabsTrigger>
            <TabsTrigger value="stock"      className="text-xs px-3">Stock Movements</TabsTrigger>
            <TabsTrigger value="expenses"   className="text-xs px-3">Expenses</TabsTrigger>
            <TabsTrigger value="reports"    className="text-xs px-3">Reports</TabsTrigger>
            <TabsTrigger value="setup"      className="text-xs px-3">Setup</TabsTrigger>
          </TabsList>

          <TabsContent value="pos">        <POSTab             business={business} /></TabsContent>
          <TabsContent value="sales">      <SalesTab           business={business} /></TabsContent>
          <TabsContent value="products">   <ProductsTab        business={business} /></TabsContent>
          <TabsContent value="categories"> <CategoriesTab      business={business} /></TabsContent>
          <TabsContent value="suppliers">  <SuppliersTab       business={business} /></TabsContent>
          <TabsContent value="orders">     <PurchaseOrdersTab  business={business} /></TabsContent>
          <TabsContent value="stock">      <StockMovementsTab  business={business} /></TabsContent>
          <TabsContent value="expenses">   <ExpensesTab        business={business} /></TabsContent>
          <TabsContent value="reports">    <ReportsTab         business={business} /></TabsContent>
          <TabsContent value="setup">      <SetupTab           business={business} isRestaurant={isRestaurant} onUpdate={setBusiness} /></TabsContent>
        </Tabs>
      </div>
    </ModulePageShell>
  );
}
