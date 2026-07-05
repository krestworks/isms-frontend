import { Check, ChevronDown, MapPin, UserCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sessionStore, useSession } from "@/data/sessionStore";
import { useStations } from "@/data/stationsCache";
import { useAuth } from "@/components/auth/AuthProvider";
import { canSwitchLocation } from "@/lib/permissions";
import { setActiveStationId } from "@/lib/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAppPaths } from "@/hooks/useAppPaths";

export function HeaderSwitchers() {
  const { user, activeLocation } = useSession();
  const stations   = useStations();
  const { switchRole } = useAuth();
  const navigate  = useNavigate();
  const paths     = useAppPaths();
  const canSwitch = canSwitchLocation();

  // Admins see "All Locations" + every real station. Non-admins see only their home station.
  // homeLocation is stored as an ID — resolve it to a name for display.
  const homeStationName = stations.find(s => s.id === user.homeLocation)?.name ?? user.homeLocation ?? null;
  const visibleLocations = canSwitch
    ? ["All Locations", ...stations.map(s => s.name)]
    : homeStationName ? [homeStationName] : [];

  return (
    <div className="flex items-center gap-2">
      {/* Role switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] text-muted-foreground">Role</span>
              <span className="text-xs font-semibold">{user.activeRole}</span>
            </div>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Switch role</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user.roles.map(r => (
            <DropdownMenuItem
              key={r}
              onClick={() => {
                if (r === user.activeRole) return;
                const prevRole = user.activeRole;
                switchRole(r)
                  .then(() => {
                    // Navigate to the right landing page for the new role
                    if (r === "Employee") {
                      navigate(paths.employeePortal);
                    } else if (prevRole === "Employee") {
                      navigate(paths.dashboard);
                    }
                  })
                  .catch((e: any) => toast.error(e?.message || "Role switch failed — you may not be assigned that role"));
              }}
            >
              <Check className={`h-3.5 w-3.5 mr-2 ${user.activeRole === r ? "opacity-100" : "opacity-0"}`} />
              {r}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Location switcher — disabled for non-admins */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={!canSwitch}>
          <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
            <MapPin className="h-4 w-4 text-amber-600" />
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] text-muted-foreground">Location</span>
              <span className="text-xs font-semibold max-w-[140px] truncate">{activeLocation}</span>
            </div>
            {canSwitch && <ChevronDown className="h-3 w-3 opacity-60" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs">Switch location</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {visibleLocations.map(l => (
            <DropdownMenuItem key={l} onClick={() => {
              sessionStore.switchLocation(l);
              if (l === "All Locations") {
                setActiveStationId(null);
              } else {
                const station = stations.find(s => s.name === l);
                setActiveStationId(station?.id ?? null);
              }
            }}>
              <Check className={`h-3.5 w-3.5 mr-2 ${activeLocation === l ? "opacity-100" : "opacity-0"}`} />
              {l}
              {l === homeStationName && <Badge variant="outline" className="ml-auto text-[9px]">Home</Badge>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
