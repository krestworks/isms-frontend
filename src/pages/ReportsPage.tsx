import { FileText } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneratedReportsTab } from "@/components/reports/GeneratedReportsTab";
import { CrossModuleAnalyticsTab } from "@/components/reports/CrossModuleAnalyticsTab";
import { ReportTemplatesTab } from "@/components/reports/ReportTemplatesTab";
import { ExportHistoryTab } from "@/components/reports/ExportHistoryTab";

export default function ReportsPage() {
  return (
    <ModulePageShell title="Reports" description="Cross-module analytics, report generation, templates & exports" icon={FileText}>
      <Tabs defaultValue="generated" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="generated">Generated Reports</TabsTrigger>
          <TabsTrigger value="analytics">Cross-Module Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="exports">Export History</TabsTrigger>
        </TabsList>
        <TabsContent value="generated"><GeneratedReportsTab /></TabsContent>
        <TabsContent value="analytics"><CrossModuleAnalyticsTab /></TabsContent>
        <TabsContent value="templates"><ReportTemplatesTab /></TabsContent>
        <TabsContent value="exports"><ExportHistoryTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
