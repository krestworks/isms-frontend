import { UserCircle } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MyLeaveTab from "@/components/employee/MyLeaveTab";
import MyAttendanceTab from "@/components/employee/MyAttendanceTab";
import MyShiftsTab from "@/components/employee/MyShiftsTab";
import MyPayslipsTab from "@/components/employee/MyPayslipsTab";

export default function EmployeePortalPage() {
  return (
    <ModulePageShell title="Employee Portal" description="Your leave, attendance, shifts & payslips" icon={UserCircle}>
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">Clock In/Out</TabsTrigger>
          <TabsTrigger value="leave">My Leave</TabsTrigger>
          <TabsTrigger value="shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="payslips">My Payslips</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance"><MyAttendanceTab /></TabsContent>
        <TabsContent value="leave"><MyLeaveTab /></TabsContent>
        <TabsContent value="shifts"><MyShiftsTab /></TabsContent>
        <TabsContent value="payslips"><MyPayslipsTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
