import { DollarSign } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueTab } from "@/components/finance/RevenueTab";
import { ExpensesTab } from "@/components/finance/ExpensesTab";
import { ProfitLossTab } from "@/components/finance/ProfitLossTab";
import { VarianceTab } from "@/components/finance/VarianceTab";
import { ScheduledReportsTab } from "@/components/finance/ScheduledReportsTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { usePermissions } from "@/lib/permissions";

export default function FinancePage() {
  const can = usePermissions();
  const showAudit = can("audit.view");

  return (
    <ModulePageShell title="Revenue & Finance" description="All-station revenue, expenses, P&L" icon={DollarSign}>
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pnl">P&L Summary</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
          {showAudit && <TabsTrigger value="audit">History</TabsTrigger>}
        </TabsList>
        <TabsContent value="revenue"><RevenueTab /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="pnl"><ProfitLossTab /></TabsContent>
        <TabsContent value="variance"><VarianceTab /></TabsContent>
        <TabsContent value="reports"><ScheduledReportsTab /></TabsContent>
        {showAudit && <TabsContent value="audit"><ModuleAuditTab module="finance" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
