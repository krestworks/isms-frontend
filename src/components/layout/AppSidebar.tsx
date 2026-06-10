import { Fuel, Flame, Droplets, Wrench, Car, LayoutDashboard, DollarSign, Settings, Users, FileText, UserCog, UserCircle, MapPin, Package, Store, type LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { canAccessRoute } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
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

const operations = [
  { title: "Fuel Management", url: "/fuel",       icon: Fuel },
  { title: "LPG Management",  url: "/lpg",        icon: Flame },
  { title: "Water Production", url: "/water",     icon: Droplets },
  { title: "Auto Services",   url: "/automotive", icon: Wrench },
  { title: "Car Wash",        url: "/carwash",    icon: Car },
  { title: "Business",        url: "/business",   icon: Store },
  { title: "Inventory",       url: "/inventory",  icon: Package },
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

export function AppSidebar() {
  const { user } = useSession();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

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
          end={item.url === "/"}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium shadow-glow"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderGroup = (label: string, items: typeof operations) => {
    const visible = items.filter(i => canAccessRoute(i.url));
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
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center shrink-0">
            <Fuel className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm text-sidebar-accent-foreground tracking-tight">ISMS</span>
              <span className="text-[10px] text-sidebar-foreground">Station Management</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {/* Dashboard — always first, always accessible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItem({ title: "Dashboard", url: "/", icon: LayoutDashboard })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Employee Portal — always accessible to authenticated users */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">My Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItem({ title: "Employee Portal", url: "/employee-portal", icon: UserCircle })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operations — modules filtered by permission */}
        {renderGroup("Operations", operations)}

        {/* Administration — Locations + HR (admin/manager only) */}
        {renderGroup("Administration", administration)}

        {/* Management — Finance, Clients, Reports, Settings */}
        {renderGroup("Management", management)}
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
