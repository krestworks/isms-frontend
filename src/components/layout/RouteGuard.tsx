import { useLocation } from "react-router-dom";
import { canAccessRoute, useStationModuleFilter, extractModulePath, SEGMENT_MODULE_KEY } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, PowerOff } from "lucide-react";

// Blocks two things: lacking the RBAC permission for a module (canAccessRoute,
// pre-existing), and — previously unenforced — the module being disabled for
// this station (Settings → HR Setup → Station Modules). Before this, a
// disabled module was only *hidden* from the sidebar; typing its URL directly
// (or a bookmark) still loaded the page in full, mirroring the same gap that
// existed on the backend (now closed via requireModuleEnabled()).
export function RouteGuard({ children }: { children: React.ReactNode }) {
  useSession();
  const location = useLocation();
  const isModuleEnabled = useStationModuleFilter();

  if (!canAccessRoute(location.pathname)) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">Your current role does not have permission to view this module. Switch role from the header or contact your administrator.</p>
        </CardContent>
      </Card>
    );
  }

  const segment = extractModulePath(location.pathname).replace(/^\//, "");
  const moduleKey = SEGMENT_MODULE_KEY[segment];
  if (moduleKey && !isModuleEnabled(moduleKey)) {
    return (
      <Card className="max-w-md mx-auto mt-12">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
            <PowerOff className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Module Not Enabled</h2>
          <p className="text-sm text-muted-foreground">This module isn't enabled for your station. Ask an Admin to enable it in HR Setup → Station Modules.</p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
