import { UserCog } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HRSetupTab from "@/components/hr/HRSetupTab";
import StaffOnboardingTab from "@/components/hr/StaffOnboardingTab";
import LeaveManagementTab from "@/components/hr/LeaveManagementTab";
import PayrollTab from "@/components/hr/PayrollTab";
import PayrollSettingsTab from "@/components/hr/PayrollSettingsTab";
import AttendanceTab from "@/components/hr/AttendanceTab";
import ShiftsTab from "@/components/hr/ShiftsTab";
import DisciplinaryTab from "@/components/hr/DisciplinaryTab";
import PerformanceTab from "@/components/hr/PerformanceTab";
import DocumentsTab from "@/components/hr/DocumentsTab";
import HRReportsTab from "@/components/hr/HRReportsTab";
import AuditLogTab from "@/components/hr/AuditLogTab";
import RecruitmentTab from "@/components/hr/RecruitmentTab";
import { ModuleAuditTab } from "@/components/shared/ModuleAuditTab";
import { usePermissions } from "@/lib/permissions";

export default function HRPage() {
  const can = usePermissions();
  const showModuleHistory = can("audit.view");

  return (
    <ModulePageShell title="HR Management" description="Central staff hub — onboarding, leave, payroll, attendance, discipline, performance" icon={UserCog}>
      <Tabs defaultValue="onboarding" className="w-full">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="onboarding">Staff Onboarding</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="payroll-settings">Payroll Settings</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          {showModuleHistory && <TabsTrigger value="history">Deletion History</TabsTrigger>}
        </TabsList>
        <TabsContent value="setup"><HRSetupTab /></TabsContent>
        <TabsContent value="onboarding"><StaffOnboardingTab /></TabsContent>
        <TabsContent value="leave"><LeaveManagementTab /></TabsContent>
        <TabsContent value="shifts"><ShiftsTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
        <TabsContent value="payroll-settings"><PayrollSettingsTab /></TabsContent>
        <TabsContent value="disciplinary"><DisciplinaryTab /></TabsContent>
        <TabsContent value="performance"><PerformanceTab /></TabsContent>
        <TabsContent value="documents"><DocumentsTab /></TabsContent>
        <TabsContent value="recruitment"><RecruitmentTab /></TabsContent>
        <TabsContent value="reports"><HRReportsTab /></TabsContent>
        <TabsContent value="audit"><AuditLogTab /></TabsContent>
        {showModuleHistory && <TabsContent value="history"><ModuleAuditTab module="hr" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
