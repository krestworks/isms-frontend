import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import FuelPage from "./pages/FuelPage";
import LpgPage from "./pages/LpgPage";
import WaterPage from "./pages/WaterPage";
import AutomotivePage from "./pages/AutomotivePage";
import CarwashPage from "./pages/CarwashPage";
import FinancePage from "./pages/FinancePage";
import ClientsPage from "./pages/ClientsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import HRPage from "./pages/HRPage";
import EmployeePortalPage from "./pages/EmployeePortalPage";
import LocationsPage from "./pages/LocationsPage";
import InventoryPage from "./pages/InventoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fuel" element={<FuelPage />} />
            <Route path="/lpg" element={<LpgPage />} />
            <Route path="/water" element={<WaterPage />} />
            <Route path="/automotive" element={<AutomotivePage />} />
            <Route path="/carwash" element={<CarwashPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/hr" element={<HRPage />} />
            <Route path="/employee-portal" element={<EmployeePortalPage />} />
            <Route path="/locations" element={<LocationsPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
