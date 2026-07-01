import { Car } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleQueueTab from "@/components/carwash/VehicleQueueTab";
import WashPackagesTab from "@/components/carwash/WashPackagesTab";
import BookingsTab from "@/components/carwash/BookingsTab";
import CarwashSalesTab from "@/components/carwash/CarwashSalesTab";
import { ModuleStaffTab } from "@/components/shared/ModuleStaffTab";
import { ShiftScheduleTab } from "@/components/shared/ShiftScheduleTab";
import { usePermissions } from "@/lib/permissions";

export default function CarwashPage() {
  const can = usePermissions();

  const showQueue    = can("carwash.queue.view");
  const showPackages = can("carwash.packages.view");
  const showBookings = can("carwash.bookings.create");
  const showSales    = can("carwash.sales.view");
  const showStaff    = can("hr.staff.view");
  const showShifts   = can("hr.shifts.view");

  const defaultTab = showSales ? "sales" : showQueue ? "queue" : "sales";

  return (
    <ModulePageShell title="Car Wash" description="Vehicle queue, wash packages, bookings, daily sales" icon={Car}>
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
          {showQueue    && <TabsTrigger value="queue">Vehicle Queue</TabsTrigger>}
          {showPackages && <TabsTrigger value="packages">Wash Packages</TabsTrigger>}
          {showBookings && <TabsTrigger value="bookings">Bookings</TabsTrigger>}
          {showSales    && <TabsTrigger value="sales">Daily Sales</TabsTrigger>}
          {showStaff    && <TabsTrigger value="staff">Staff</TabsTrigger>}
          {showShifts   && <TabsTrigger value="shifts">Shifts</TabsTrigger>}
        </TabsList>
        {showQueue    && <TabsContent value="queue"><VehicleQueueTab /></TabsContent>}
        {showPackages && <TabsContent value="packages"><WashPackagesTab /></TabsContent>}
        {showBookings && <TabsContent value="bookings"><BookingsTab /></TabsContent>}
        {showSales    && <TabsContent value="sales"><CarwashSalesTab /></TabsContent>}
        {showStaff    && <TabsContent value="staff"><ModuleStaffTab department="Car Wash" /></TabsContent>}
        {showShifts   && <TabsContent value="shifts"><ShiftScheduleTab department="Car Wash" /></TabsContent>}
      </Tabs>
    </ModulePageShell>
  );
}
