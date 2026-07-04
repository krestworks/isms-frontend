import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { RouteGuard } from "./components/layout/RouteGuard";

// ── Lazy page imports (route-based code splitting) ───────────────────────────
const DashboardPage            = lazy(() => import("./pages/DashboardPage"));
const FuelPage                 = lazy(() => import("./pages/FuelPage"));
const LpgPage                  = lazy(() => import("./pages/LpgPage"));
const WaterPage                = lazy(() => import("./pages/WaterPage"));
const AutomotivePage           = lazy(() => import("./pages/AutomotivePage"));
const CarwashPage              = lazy(() => import("./pages/CarwashPage"));
const BusinessPage             = lazy(() => import("./pages/BusinessPage"));
const BusinessDetailPage       = lazy(() => import("./pages/BusinessDetailPage"));
const FinancePage              = lazy(() => import("./pages/FinancePage"));
const ClientsPage              = lazy(() => import("./pages/ClientsPage"));
const ReportsPage              = lazy(() => import("./pages/ReportsPage"));
const SettingsPage             = lazy(() => import("./pages/SettingsPage"));
const HRPage                   = lazy(() => import("./pages/HRPage"));
const EmployeePortalPage       = lazy(() => import("./pages/EmployeePortalPage"));
const LocationsPage            = lazy(() => import("./pages/LocationsPage"));
const InventoryPage            = lazy(() => import("./pages/InventoryPage"));
const AccountsPage             = lazy(() => import("./pages/AccountsPage"));
const LoginPage                = lazy(() => import("./pages/LoginPage"));
const ActivatePage             = lazy(() => import("./pages/ActivatePage"));
const CareersPage              = lazy(() => import("./pages/CareersPage"));
const PublicPayrollCalculatorPage = lazy(() => import("./pages/PublicPayrollCalculatorPage"));
const NotFound                 = lazy(() => import("./pages/NotFound"));

// ── React Query — global defaults ────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 min — avoid refetch on every tab focus
      retry: 1,                    // one retry on failure, not three
      refetchOnWindowFocus: false, // don't hammer API on tab switch
    },
  },
});

const guard = (el: JSX.Element) => <RouteGuard>{el}</RouteGuard>;

// ── Page loader spinner (shown during lazy chunk load) ───────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <PageLoader />;

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login"              element={<LoginPage />} />
              <Route path="/activate"           element={<ActivatePage />} />
              <Route path="/payroll-calculator" element={<PublicPayrollCalculatorPage />} />
              <Route path="/careers/:accountId"        element={<CareersPage />} />
              <Route path="/careers/:accountId/:jobId" element={<CareersPage />} />

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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
