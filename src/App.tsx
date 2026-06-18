import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import DashboardPage from "./pages/DashboardPage";
import FuelPage from "./pages/FuelPage";
import LpgPage from "./pages/LpgPage";
import WaterPage from "./pages/WaterPage";
import AutomotivePage from "./pages/AutomotivePage";
import CarwashPage from "./pages/CarwashPage";
import BusinessPage from "./pages/BusinessPage";
import BusinessDetailPage from "./pages/BusinessDetailPage";
import FinancePage from "./pages/FinancePage";
import ClientsPage from "./pages/ClientsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import HRPage from "./pages/HRPage";
import EmployeePortalPage from "./pages/EmployeePortalPage";
import LocationsPage from "./pages/LocationsPage";
import InventoryPage from "./pages/InventoryPage";
import AccountsPage from "./pages/AccountsPage";
import LoginPage from "./pages/LoginPage";
import ActivatePage from "./pages/ActivatePage";
import NotFound from "./pages/NotFound";
import { RouteGuard } from "./components/layout/RouteGuard";

const queryClient = new QueryClient();

const guard = (el: JSX.Element) => <RouteGuard>{el}</RouteGuard>;

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/activate" element={<ActivatePage />} />

            {/* Protected */}
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/fuel"            element={guard(<FuelPage />)} />
              <Route path="/lpg"             element={guard(<LpgPage />)} />
              <Route path="/water"           element={guard(<WaterPage />)} />
              <Route path="/automotive"      element={guard(<AutomotivePage />)} />
              <Route path="/carwash"         element={guard(<CarwashPage />)} />
              <Route path="/business"        element={guard(<BusinessPage />)} />
              <Route path="/business/:id"    element={guard(<BusinessDetailPage />)} />
              <Route path="/finance"         element={guard(<FinancePage />)} />
              <Route path="/clients"         element={guard(<ClientsPage />)} />
              <Route path="/reports"         element={guard(<ReportsPage />)} />
              <Route path="/settings"        element={guard(<SettingsPage />)} />
              <Route path="/hr"              element={guard(<HRPage />)} />
              <Route path="/employee-portal" element={<EmployeePortalPage />} />
              <Route path="/employee-portal/:section" element={<EmployeePortalPage />} />
              <Route path="/locations"       element={guard(<LocationsPage />)} />
              <Route path="/inventory"       element={guard(<InventoryPage />)} />
              <Route path="/accounts"        element={guard(<AccountsPage />)} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
