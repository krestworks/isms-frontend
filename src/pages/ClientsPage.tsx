import { Users } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClientProfilesTab from "@/components/clients/ClientProfilesTab";
import ClientOrdersTab from "@/components/clients/ClientOrdersTab";
import CouponsTab from "@/components/clients/CouponsTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { usePermissions } from "@/lib/permissions";

export default function ClientsPage() {
  const can = usePermissions();
  const showAudit = can("audit.view");

  return (
    <ModulePageShell title="Clients" description="Client management, orders, coupons" icon={Users}>
      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Client Profiles</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
          <TabsTrigger value="coupons">Coupons</TabsTrigger>
          {showAudit && <TabsTrigger value="audit">History</TabsTrigger>}
        </TabsList>
        <TabsContent value="profiles"><ClientProfilesTab /></TabsContent>
        <TabsContent value="orders"><ClientOrdersTab /></TabsContent>
        <TabsContent value="coupons"><CouponsTab /></TabsContent>
        {showAudit && <TabsContent value="audit"><ModuleAuditTab module="clients" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
