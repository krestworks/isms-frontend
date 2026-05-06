import { Check, ChevronDown, MapPin, UserCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sessionStore, useSession } from "@/data/sessionStore";
import { useLocations } from "@/data/locationsStore";
import { canSwitchLocation } from "@/lib/permissions";

export function HeaderSwitchers() {
  const { user, activeLocation } = useSession();
  const locations = useLocations();
  const canSwitch = canSwitchLocation();
  const visibleLocations = canSwitch
    ? ["All Locations", ...locations.map(l => l.name)]
    : user.homeLocation ? [user.homeLocation] : ["All Locations"];

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
            <DropdownMenuItem key={r} onClick={() => sessionStore.switchRole(r)}>
              <Check className={`h-3.5 w-3.5 mr-2 ${user.activeRole === r ? "opacity-100" : "opacity-0"}`} />
              {r}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Location switcher */}
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
            <DropdownMenuItem key={l} onClick={() => sessionStore.switchLocation(l)}>
              <Check className={`h-3.5 w-3.5 mr-2 ${activeLocation === l ? "opacity-100" : "opacity-0"}`} />
              {l}
              {l === user.homeLocation && <Badge variant="outline" className="ml-auto text-[9px]">Home</Badge>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
