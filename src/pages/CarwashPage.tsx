import { Car } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleQueueTab from "@/components/carwash/VehicleQueueTab";
import WashPackagesTab from "@/components/carwash/WashPackagesTab";
import BookingsTab from "@/components/carwash/BookingsTab";
import CarwashSalesTab from "@/components/carwash/CarwashSalesTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";

export default function CarwashPage() {
  return (
    <ModulePageShell title="Car Wash" description="Vehicle queue, wash packages, bookings, daily sales" icon={Car}>
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          <TabsTrigger value="queue">Vehicle Queue</TabsTrigger>
          <TabsTrigger value="packages">Wash Packages</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="sales">Daily Sales</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>
        <TabsContent value="queue"><VehicleQueueTab /></TabsContent>
        <TabsContent value="packages"><WashPackagesTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
        <TabsContent value="sales"><CarwashSalesTab /></TabsContent>
        <TabsContent value="staff"><ModuleStaffTab department="Car Wash" /></TabsContent>
        <TabsContent value="shifts"><ShiftScheduleTab department="Car Wash" /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
