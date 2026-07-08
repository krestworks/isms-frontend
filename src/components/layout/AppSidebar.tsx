import {
  Fuel, Flame, Droplets, Wrench, Car, LayoutDashboard,
  DollarSign, Settings, Users, FileText, UserCog, UserCircle,
  MapPin, Package, Store, Building2, Clock, Calendar, Umbrella,
  Receipt, TrendingUp, AlertTriangle, X, type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { canAccessRoute, useStationModuleFilter, hasAnyBusinessAssignment } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { useBranding } from "@/data/brandingStore";
import { useAppPaths } from "@/hooks/useAppPaths";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

// Module key by last URL segment — used by useStationModuleFilter.
const SEGMENT_MODULE_KEY: Record<string, string> = {
  "fuel":       "fuel",
  "lpg":        "lpg",
  "water":      "water",
  "automotive": "auto",
  "carwash":    "carwash",
  "business":   "pos",
  "inventory":  "pos",
  "finance":    "finance",
  "hr":         "hr",
};

export function AppSidebar() {
  const { user } = useSession();
  const branding = useBranding();
  const paths = useAppPaths();
  const navigate = useNavigate();
  const { switchRole } = useAuth();
  const isModuleEnabled = useStationModuleFilter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed  = state === "collapsed";
  const location   = useLocation();
  const isSuperAdmin = user.activeRole === "SuperAdmin";
  const isEmployee   = user.activeRole === "Employee";

  // "My Portal" — switches into the Employee role (not just navigation) so
  // permissions/UI chrome match what's actually being viewed. Only offered to
  // users who have a real HR Employee record (user.isEmployee), not everyone —
  // the base "Employee" role is auto-assigned to all accounts as a permissions
  // floor and isn't the same thing as actually being HR-onboarded staff.
  const goToMyPortal = () => {
    switchRole("Employee")
      .then(() => navigate(paths.employeePortal))
      .catch((e: any) => toast.error(e?.message || "Could not open My Portal"));
  };

  // URL arrays depend on the current slug + station param, so defined here.
  // "Business" is dropped entirely for operational roles with no business
  // assignment — managerial roles (Admin/Manager/LocationHead) always keep it.
  const operations = [
    { title: "Fuel Management",  url: paths.fuel,       icon: Fuel },
    { title: "LPG Management",   url: paths.lpg,        icon: Flame },
    { title: "Water Production", url: paths.water,      icon: Droplets },
    { title: "Auto Services",    url: paths.automotive, icon: Wrench },
    { title: "Car Wash",         url: paths.carwash,    icon: Car },
    ...(hasAnyBusinessAssignment() ? [{ title: "Business", url: paths.business, icon: Store }] : []),
    { title: "Inventory",        url: paths.inventory,  icon: Package },
  ];

  const administration = [
    { title: "Locations",     url: paths.locations, icon: MapPin },
    { title: "HR Management", url: paths.hr,        icon: UserCog },
  ];

  const management = [
    { title: "Revenue & Finance", url: paths.finance,  icon: DollarSign },
    { title: "Clients",           url: paths.clients,  icon: Users },
    { title: "Reports",           url: paths.reports,  icon: FileText },
    { title: "Settings",          url: paths.settings, icon: Settings },
  ];

  const employeeItems = [
    { title: "My Overview",    url: paths.employeePortal,                         icon: LayoutDashboard },
    { title: "My Details",     url: paths.employeePortalSection("details"),       icon: UserCircle },
    { title: "Clock In / Out", url: paths.employeePortalSection("attendance"),    icon: Clock },
    { title: "My Shifts",      url: paths.employeePortalSection("shifts"),        icon: Calendar },
    { title: "My Leave",       url: paths.employeePortalSection("leave"),         icon: Umbrella },
    { title: "My Payslips",    url: paths.employeePortalSection("payslips"),      icon: Receipt },
    { title: "My Performance", url: paths.employeePortalSection("performance"),   icon: TrendingUp },
    { title: "Disciplinary",   url: paths.employeePortalSection("disciplinary"),  icon: AlertTriangle },
    { title: "My Documents",   url: paths.employeePortalSection("documents"),     icon: FileText },
  ];

  // isActive: strip query params before comparing; exact match for dashboard and
  // employee portal overview, prefix match for everything else.
  const isActive = (url: string) => {
    const urlPath = url.split("?")[0];
    if (urlPath === paths.base || urlPath === paths.employeePortal) {
      return location.pathname === urlPath || location.pathname === urlPath + "/";
    }
    return location.pathname === urlPath || location.pathname.startsWith(urlPath + "/");
  };

  const initials = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const renderItem = (item: { title: string; url: string; icon: LucideIcon }) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
        <NavLink
          to={item.url}
          end={item.url === paths.base || item.url === paths.employeePortal}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-glow"
          onClick={() => { if (isMobile) setOpenMobile(false); }}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderGroup = (label: string, items: typeof operations) => {
    const visible = items.filter(i => {
      const segment = i.url.split("?")[0].split("/").filter(Boolean).at(-1) ?? "";
      return canAccessRoute(i.url) && isModuleEnabled(SEGMENT_MODULE_KEY[segment] ?? "");
    });
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{visible.map(renderItem)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shrink-0 overflow-hidden">
              {branding?.logo ? (
                <img src={branding.logo} alt={branding.name} className="h-full w-full object-cover" />
              ) : (
                <Fuel className="h-5 w-5 text-primary-foreground" />
              )}
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-sm text-sidebar-accent-foreground tracking-tight">
                  {branding?.name ?? "ISMS"}
                </span>
                <span className="text-[10px] text-sidebar-foreground">
                  {branding?.tagline ?? "Station Management"}
                </span>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setOpenMobile(false)}
              className="h-7 w-7 flex items-center justify-center rounded-md text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">

        {/* ── Employee workspace ──────────────────────────────────────────────── */}
        {isEmployee && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">
              My Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{employeeItems.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* ── Non-employee layout ─────────────────────────────────────────────── */}
        {!isEmployee && (
          <>
            {/* Dashboard */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderItem({ title: "Dashboard", url: paths.base, icon: LayoutDashboard })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* SuperAdmin: Accounts Management */}
            {isSuperAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderItem({ title: "Accounts", url: paths.accounts, icon: Building2 })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Non-SuperAdmin regular sections */}
            {!isSuperAdmin && (
              <>
                {/* My Portal — only for users who actually have an HR employee record.
                    Clicking it switches the active role to Employee (see goToMyPortal). */}
                {user.isEmployee && (
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">My Portal</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton tooltip="My Portal" onClick={() => { goToMyPortal(); if (isMobile) setOpenMobile(false); }}>
                            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent transition-colors">
                              <UserCircle className="h-4 w-4 shrink-0" />
                              {!collapsed && <span>My Portal</span>}
                            </div>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}

                {renderGroup("Operations", operations)}
                {renderGroup("Administration", administration)}
                {renderGroup("Management", management)}
              </>
            )}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-semibold text-sidebar-primary">{initials}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-sidebar-accent-foreground truncate">{user.name}</span>
              <span className="text-[10px] text-sidebar-foreground truncate">{user.activeRole}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
