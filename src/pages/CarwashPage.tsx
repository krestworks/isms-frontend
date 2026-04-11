import { Car } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleQueueTab from "@/components/carwash/VehicleQueueTab";
import WashPackagesTab from "@/components/carwash/WashPackagesTab";
import BookingsTab from "@/components/carwash/BookingsTab";
import CarwashSalesTab from "@/components/carwash/CarwashSalesTab";
import CarwashStaffTab from "@/components/carwash/CarwashStaffTab";

export default function CarwashPage() {
  return (
    <ModulePageShell title="Car Wash" description="Vehicle queue, wash packages, bookings, daily sales" icon={Car}>
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Vehicle Queue</TabsTrigger>
          <TabsTrigger value="packages">Wash Packages</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="sales">Daily Sales</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
        </TabsList>
        <TabsContent value="queue"><VehicleQueueTab /></TabsContent>
        <TabsContent value="packages"><WashPackagesTab /></TabsContent>
        <TabsContent value="bookings"><BookingsTab /></TabsContent>
        <TabsContent value="sales"><CarwashSalesTab /></TabsContent>
        <TabsContent value="staff"><CarwashStaffTab /></TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}
