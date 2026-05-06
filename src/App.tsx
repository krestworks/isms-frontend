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
import { RouteGuard } from "./components/layout/RouteGuard";

const queryClient = new QueryClient();

const guard = (el: JSX.Element) => <RouteGuard>{el}</RouteGuard>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/fuel" element={guard(<FuelPage />)} />
            <Route path="/lpg" element={guard(<LpgPage />)} />
            <Route path="/water" element={guard(<WaterPage />)} />
            <Route path="/automotive" element={guard(<AutomotivePage />)} />
            <Route path="/carwash" element={guard(<CarwashPage />)} />
            <Route path="/finance" element={guard(<FinancePage />)} />
            <Route path="/clients" element={guard(<ClientsPage />)} />
            <Route path="/reports" element={guard(<ReportsPage />)} />
            <Route path="/settings" element={guard(<SettingsPage />)} />
            <Route path="/hr" element={guard(<HRPage />)} />
            <Route path="/employee-portal" element={<EmployeePortalPage />} />
            <Route path="/locations" element={guard(<LocationsPage />)} />
            <Route path="/inventory" element={guard(<InventoryPage />)} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
