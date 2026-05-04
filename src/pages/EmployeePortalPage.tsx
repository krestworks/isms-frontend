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

export default function EmployeePortalPage() {
  return (
    <ModulePageShell title="Employee Portal" description="Your personal workspace — details, attendance, leave, payslips, performance" icon={UserCircle}>
      <Tabs defaultValue="details" className="w-full">
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
