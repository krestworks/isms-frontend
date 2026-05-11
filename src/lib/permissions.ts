// Permission helpers — gate routes, sidebar items, and tabs by the active user's
// role and module access. All checks here are client-side enforcement only;
// in a real backend the same rules must run server-side.

import { sessionStore, Role } from "@/data/sessionStore";

// Map URL paths to module names used in user.modules
export const ROUTE_TO_MODULE: Record<string, string> = {
  "/": "Dashboard",
  "/fuel": "Fuel",
  "/lpg": "LPG",
  "/water": "Water",
  "/automotive": "Automotive",
  "/carwash": "Car Wash",
  "/inventory": "Inventory",
  "/finance": "Finance",
  "/clients": "Clients",
  "/reports": "Reports",
  "/settings": "Settings",
  "/hr": "HR",
  "/employee-portal": "EmployeePortal",
  "/locations": "Locations",
};

// Always-on modules every authenticated user can see
const ALWAYS_ALLOWED = new Set(["Dashboard", "EmployeePortal"]);

// Restricted to specific roles regardless of module list
const ROLE_RESTRICTED: Record<string, Role[]> = {
  Settings: ["Admin"],
  Locations: ["Admin", "Manager", "LocationHead"],
  HR: ["Admin", "Manager", "Accountant"],
  Finance: ["Admin", "Manager", "Accountant"],
  Reports: ["Admin", "Manager", "Accountant", "LocationHead"],
};

export function canAccessModule(moduleName: string): boolean {
  const u = sessionStore.user();
  if (ALWAYS_ALLOWED.has(moduleName)) return true;

  // Role-restricted gates first
  const allowed = ROLE_RESTRICTED[moduleName];
  if (allowed && !allowed.includes(u.activeRole)) return false;

  // Admin or "All" module access wins
  if (u.activeRole === "Admin") return true;
  if (u.modules.includes("All")) return true;
  return u.modules.includes(moduleName);
}

export function canAccessRoute(path: string): boolean {
  const mod = ROUTE_TO_MODULE[path];
  if (!mod) return true;
  return canAccessModule(mod);
}

export function canSwitchLocation(): boolean {
  const u = sessionStore.user();
  return u.activeRole === "Admin" || u.activeRole === "Manager" || u.activeRole === "Accountant";
}

// Returns true if the active scope (LocationHead lock OR active loc) matches the given location.
export function isLocationVisible(locationName?: string): boolean {
  const u = sessionStore.user();
  const active = sessionStore.activeLocation();
  if (u.activeRole === "LocationHead" && u.homeLocation) return !locationName || locationName === u.homeLocation;
  if (active === "All Locations") return true;
  return !locationName || locationName === active;
}
