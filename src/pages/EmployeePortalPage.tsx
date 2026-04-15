import { UserCircle } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import MyLeaveTab from "@/components/employee/MyLeaveTab";
import MyAttendanceTab from "@/components/employee/MyAttendanceTab";
import MyShiftsTab from "@/components/employee/MyShiftsTab";

export default function EmployeePortalPage() {
  return (
    <ModulePageShell title="Employee Portal" description="Your leave, attendance & shift management">
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="attendance">Clock In/Out</TabsTrigger>
          <TabsTrigger value="leave">My Leave</TabsTrigger>
          <TabsTrigger value="shifts">My Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="attendance"><MyAttendanceTab /></TabsContent>
        <TabsContent value="leave"><MyLeaveTab /></TabsContent>
        <TabsContent value="shifts"><MyShiftsTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
