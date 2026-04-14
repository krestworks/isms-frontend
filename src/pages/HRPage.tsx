import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StaffOnboardingTab from "@/components/hr/StaffOnboardingTab";
import LeaveManagementTab from "@/components/hr/LeaveManagementTab";
import PayrollTab from "@/components/hr/PayrollTab";
import AttendanceTab from "@/components/hr/AttendanceTab";

export default function HRPage() {
  return (
    <ModulePageShell title="HR Management" description="Staff onboarding, leave, payroll & attendance">
      <Tabs defaultValue="onboarding" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="onboarding">Staff Onboarding</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>
        <TabsContent value="onboarding"><StaffOnboardingTab /></TabsContent>
        <TabsContent value="leave"><LeaveManagementTab /></TabsContent>
        <TabsContent value="payroll"><PayrollTab /></TabsContent>
        <TabsContent value="attendance"><AttendanceTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
