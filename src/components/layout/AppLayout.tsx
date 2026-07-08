import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Search, LogOut, Sun, Moon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HeaderSwitchers } from "./HeaderSwitchers";
import { NotificationsBell } from "./NotificationsBell";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSession } from "@/data/sessionStore";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";

export function AppLayout() {
  const { logout } = useAuth();
  const { activeLocation } = useSession();
  const { theme, toggle: toggleTheme } = useTheme();

  async function handleLogout() {
    await logout();
    toast.success("Signed out successfully");
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-card/50 backdrop-blur-sm px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search modules, records..."
                  className="pl-9 w-64 h-9 bg-muted/50 border-0 text-sm focus-visible:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HeaderSwitchers />
              <NotificationsBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out"
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main key={activeLocation} className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
