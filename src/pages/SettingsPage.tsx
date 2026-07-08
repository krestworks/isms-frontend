import { Settings } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessDetailsTab } from "@/components/settings/BusinessDetailsTab";
import { VatConfigTab } from "@/components/settings/VatConfigTab";
import { RolesTab } from "@/components/settings/RolesTab";
import { UsersTab } from "@/components/settings/UsersTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { usePermissions } from "@/lib/permissions";

export default function SettingsPage() {
  const can = usePermissions();
  const showAudit = can("audit.view");

  return (
    <ModulePageShell title="Settings" description="Business details, VAT configuration, RBAC & user management" icon={Settings}>
      <Tabs defaultValue="business" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="business">Business Details</TabsTrigger>
          <TabsTrigger value="vat">VAT & Currency</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          {showAudit && <TabsTrigger value="audit">Settings History</TabsTrigger>}
          {showAudit && <TabsTrigger value="roles-audit">Roles History</TabsTrigger>}
        </TabsList>
        <TabsContent value="business"><BusinessDetailsTab /></TabsContent>
        <TabsContent value="vat"><VatConfigTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        {showAudit && <TabsContent value="audit"><ModuleAuditTab module="settings" /></TabsContent>}
        {showAudit && <TabsContent value="roles-audit"><ModuleAuditTab module="permissions" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
