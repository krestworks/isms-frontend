import { Users } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientProfilesTab from "@/components/clients/ClientProfilesTab";
import ClientOrdersTab from "@/components/clients/ClientOrdersTab";
import CouponsTab from "@/components/clients/CouponsTab";

export default function ClientsPage() {
  return (
    <ModulePageShell title="Clients" description="Client management, orders, coupons" icon={Users}>
      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Client Profiles</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
        </TabsList>
        <TabsContent value="profiles"><ClientProfilesTab /></TabsContent>
        <TabsContent value="orders"><ClientOrdersTab /></TabsContent>
        <TabsContent value="coupons"><CouponsTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
