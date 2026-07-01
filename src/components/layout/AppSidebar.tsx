import {
  Fuel, Flame, Droplets, Wrench, Car, LayoutDashboard,
  DollarSign, Settings, Users, FileText, UserCog, UserCircle,
  MapPin, Package, Store, Building2, Clock, Calendar, Umbrella,
  Receipt, TrendingUp, AlertTriangle, X, type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { canAccessRoute, useStationModuleFilter } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { useBranding } from "@/data/brandingStore";
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

// Map URL → module key (for StationModule enabled/disabled check)
const ROUTE_MODULE_KEY: Record<string, string> = {
  "/fuel":       "fuel",
  "/lpg":        "lpg",
  "/water":      "water",
  "/automotive": "auto",
  "/carwash":    "carwash",
  "/business":   "pos",
  "/inventory":  "pos",
  "/finance":    "finance",
  "/hr":         "hr",
};

const operations = [
  { title: "Fuel Management",  url: "/fuel",       icon: Fuel },
  { title: "LPG Management",   url: "/lpg",        icon: Flame },
  { title: "Water Production", url: "/water",      icon: Droplets },
  { title: "Auto Services",    url: "/automotive", icon: Wrench },
  { title: "Car Wash",         url: "/carwash",    icon: Car },
  { title: "Business",         url: "/business",   icon: Store },
  { title: "Inventory",        url: "/inventory",  icon: Package },
];

const administration = [
  { title: "Locations",     url: "/locations", icon: MapPin },
  { title: "HR Management", url: "/hr",        icon: UserCog },
];

const management = [
  { title: "Revenue & Finance", url: "/finance",  icon: DollarSign },
  { title: "Clients",           url: "/clients",  icon: Users },
  { title: "Reports",           url: "/reports",  icon: FileText },
  { title: "Settings",          url: "/settings", icon: Settings },
];

const employeeItems = [
  { title: "My Overview",    url: "/employee-portal",              icon: LayoutDashboard },
  { title: "My Details",     url: "/employee-portal/details",      icon: UserCircle },
  { title: "Clock In / Out", url: "/employee-portal/attendance",   icon: Clock },
  { title: "My Shifts",      url: "/employee-portal/shifts",       icon: Calendar },
  { title: "My Leave",       url: "/employee-portal/leave",        icon: Umbrella },
  { title: "My Payslips",    url: "/employee-portal/payslips",     icon: Receipt },
  { title: "My Performance", url: "/employee-portal/performance",  icon: TrendingUp },
  { title: "Disciplinary",   url: "/employee-portal/disciplinary", icon: AlertTriangle },
  { title: "My Documents",   url: "/employee-portal/documents",    icon: FileText },
];

export function AppSidebar() {
  const { user } = useSession();
  const branding = useBranding();
  const isModuleEnabled = useStationModuleFilter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed  = state === "collapsed";
  const location   = useLocation();
  const isSuperAdmin = user.activeRole === "SuperAdmin";
  const isEmployee   = user.activeRole === "Employee";

  // isActive: exact match for root and employee portal overview; prefix match for everything else
  const isActive = (url: string) => {
    if (url === "/" || url === "/employee-portal") return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + "/");
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
          end={item.url === "/" || item.url === "/employee-portal"}
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
    const visible = items.filter(i =>
      canAccessRoute(i.url) &&
      isModuleEnabled(ROUTE_MODULE_KEY[i.url] ?? "")
    );
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
                  {renderItem({ title: "Dashboard", url: "/", icon: LayoutDashboard })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* SuperAdmin: Accounts Management */}
            {isSuperAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderItem({ title: "Accounts", url: "/accounts", icon: Building2 })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Non-SuperAdmin regular sections */}
            {!isSuperAdmin && (
              <>
                {/* Employee Portal quick link — for users who also have an employee record */}
                {user.isEmployee && (
                  <SidebarGroup>
                    <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">My Portal</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {renderItem({ title: "Employee Portal", url: "/employee-portal", icon: UserCircle })}
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
