import { Fuel, Flame, Droplets, Wrench, Car, LayoutDashboard, DollarSign, Settings, Users, FileText, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
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

const modules = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Fuel Management", url: "/fuel", icon: Fuel },
  { title: "LPG Management", url: "/lpg", icon: Flame },
  { title: "Water Production", url: "/water", icon: Droplets },
  { title: "Auto Services", url: "/automotive", icon: Wrench },
  { title: "Car Wash", url: "/carwash", icon: Car },
];

const management = [
  { title: "Revenue & Finance", url: "/finance", icon: DollarSign },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

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
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">
            Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50 mb-1">
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {management.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-semibold text-sidebar-primary">AD</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-accent-foreground">Admin User</span>
              <span className="text-[10px] text-sidebar-foreground">Super Admin</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
