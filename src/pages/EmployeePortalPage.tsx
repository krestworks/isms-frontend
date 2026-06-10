import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UserCircle } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyDetailsTab from "@/components/employee/MyDetailsTab";
import MyLeaveTab from "@/components/employee/MyLeaveTab";
import MyAttendanceTab from "@/components/employee/MyAttendanceTab";
import MyShiftsTab from "@/components/employee/MyShiftsTab";
import MyPayslipsTab from "@/components/employee/MyPayslipsTab";
import MyPerformanceTab from "@/components/employee/MyPerformanceTab";
import MyDisciplinaryTab from "@/components/employee/MyDisciplinaryTab";
import MyDocumentsTab from "@/components/employee/MyDocumentsTab";

const VALID_TABS = ["details", "attendance", "shifts", "leave", "payslips", "performance", "disciplinary", "documents"];

export default function EmployeePortalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(tabParam ?? "") ? tabParam! : "details");

  // Sync tab state when URL param changes (e.g. from back-navigation or quick links)
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams(value === "details" ? {} : { tab: value }, { replace: true });
  };

  return (
    <ModulePageShell title="Employee Portal" description="Your personal workspace — details, attendance, leave, payslips, performance" icon={UserCircle}>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="details">My Details</TabsTrigger>
          <TabsTrigger value="attendance">Clock In/Out</TabsTrigger>
          <TabsTrigger value="shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="leave">My Leave</TabsTrigger>
          <TabsTrigger value="payslips">My Payslips</TabsTrigger>
          <TabsTrigger value="performance">My Performance</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="details"><MyDetailsTab /></TabsContent>
        <TabsContent value="attendance"><MyAttendanceTab /></TabsContent>
        <TabsContent value="shifts"><MyShiftsTab /></TabsContent>
        <TabsContent value="leave"><MyLeaveTab /></TabsContent>
        <TabsContent value="payslips"><MyPayslipsTab /></TabsContent>
        <TabsContent value="performance"><MyPerformanceTab /></TabsContent>
        <TabsContent value="disciplinary"><MyDisciplinaryTab /></TabsContent>
        <TabsContent value="documents"><MyDocumentsTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
