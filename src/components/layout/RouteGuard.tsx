import { Navigate, useLocation } from "react-router-dom";
import { canAccessRoute } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  useSession();
  const location = useLocation();
  if (canAccessRoute(location.pathname)) return <>{children}</>;
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
