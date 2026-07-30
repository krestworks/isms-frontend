// Permission helpers — gate routes, sidebar items, and dashboard sections
// by the effective permission codes loaded from the backend for the active role.

import { useEffect, useState } from "react";
import { sessionStore, useSession } from "@/data/sessionStore";
import { stationsApi } from "@/lib/stationsApi";

export const ROUTE_TO_MODULE: Record<string, string> = {
  "/": "Dashboard",
  "/fuel": "Fuel",
  "/lpg": "LPG",
  "/water": "Water",
  "/automotive": "Automotive",
  "/carwash": "Car Wash",
  "/business": "Business",
  "/inventory": "Inventory",
  "/finance": "Finance",
  "/clients": "Clients",
  "/reports": "Reports",
  "/settings": "Settings",
  "/hr": "HR",
  "/employee-portal": "EmployeePortal",
  "/locations": "Locations",
  "/accounts": "Accounts",
};

// Module key by last URL segment — matches the backend's StationModule keys
// ("fuel", "lpg", "water", "carwash", "auto", "pos", "finance", "hr") and the
// requireModuleEnabled() gate applied to each module's routes on the backend.
// Shared by AppSidebar (hides disabled links) and RouteGuard (blocks direct
// navigation to a disabled module, not just permission checks).
export const SEGMENT_MODULE_KEY: Record<string, string> = {
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

// Minimum permission code required to access each module
const MODULE_PERMISSION: Record<string, string> = {
  Fuel:          "fuel.sales.view",
  LPG:           "lpg.sales.view",
  Water:         "water.production.view",
  Automotive:    "auto.services.view",
  "Car Wash":    "carwash.sales.view",
  Business:      "pos.sales.view",
  Inventory:     "pos.sales.view",
  Finance:       "finance.reports.view",
  Clients:       "clients.view",
  Reports:       "finance.reports.view",
  Settings:      "settings.view",
  HR:            "hr.staff.view",
  Locations:     "stations.view",
  Accounts:      "accounts.view",
};

// Alternate (OR) permission that also grants access — used for modules
// accessible by operational roles (e.g. Attendant → Business via POS permission).
const MODULE_ALT_PERMISSION: Record<string, string> = {
  Business: "business.pos.record",
};

// These modules are always accessible to authenticated users
const ALWAYS_ALLOWED = new Set(["Dashboard", "EmployeePortal"]);

/** Returns true if the current user holds the given permission code. */
export function hasPermission(code: string): boolean {
  return sessionStore.user().permissions.includes(code);
}

/**
 * Reactive permission checker for use inside React components.
 * Returns a checker function that re-evaluates whenever the active role changes.
 * Use this instead of hasPermission() anywhere a role switch should instantly
 * update the UI without a page reload.
 *
 * const can = usePermissions();
 * const canCreate = can("hr.staff.create");
 */
export function usePermissions(): (code: string) => boolean {
  useSession(); // subscribe — forces re-render on role/permission change
  return (code: string) => sessionStore.user().permissions.includes(code);
}

export function canAccessModule(moduleName: string): boolean {
  if (ALWAYS_ALLOWED.has(moduleName)) return true;
  const permCode = MODULE_PERMISSION[moduleName];
  if (!permCode) return true;
  if (hasPermission(permCode)) return true;
  const alt = MODULE_ALT_PERMISSION[moduleName];
  return !!alt && hasPermission(alt);
}

/**
 * Strip the leading /:businessSlug segment from a pathname so it can be
 * looked up in ROUTE_TO_MODULE, which uses module-relative paths (/fuel, /hr, …).
 * Also strips query params before splitting.
 */
export function extractModulePath(fullPath: string): string {
  const path = fullPath.split("?")[0];
  const parts = path.split("/").filter(Boolean); // ["slug", "fuel"] or ["slug"]
  if (parts.length <= 1) return "/";             // root index = dashboard
  return "/" + parts.slice(1).join("/");          // "/fuel" or "/business/123"
}

export function canAccessRoute(path: string): boolean {
  const modulePath = extractModulePath(path);
  const mod = ROUTE_TO_MODULE[modulePath];
  if (!mod) return true;
  return canAccessModule(mod);
}

/** Only users with stations.view can see the location switcher. */
export function canSwitchLocation(): boolean {
  return hasPermission("stations.view");
}

// ── StationModule filter hook ──────────────────────────────────────────────────
// Caches enabled modules per stationId (module-level, persists until page reload).
// Admins bypass all module restrictions.

const _moduleCache: Record<string, Set<string>> = {};

/**
 * Returns a function `isModuleEnabled(moduleKey)` — true if the module is
 * enabled at the user's home station. Admins always get true. Falls back to
 * true (fail-open) while loading or on error.
 */
export function useStationModuleFilter(): (moduleKey: string) => boolean {
  const { user } = useSession();
  const [, refresh] = useState(0);

  const isAdmin = user.activeRole === "Admin" || user.activeRole === "SuperAdmin";
  const stationId = user.homeLocation;

  useEffect(() => {
    if (isAdmin || !stationId) return;
    if (_moduleCache[stationId]) return; // already cached

    stationsApi.modules.list(stationId)
      .then(res => {
        const enabled = new Set(
          (res.data ?? []).filter(m => m.isEnabled).map(m => m.module)
        );
        _moduleCache[stationId] = enabled;
        refresh(n => n + 1);
      })
      .catch(() => {
        // On error, let everything through so users aren't locked out
        _moduleCache[stationId] = new Set(["hr", "fuel", "lpg", "water", "carwash", "auto", "pos", "finance", "compliance"]);
        refresh(n => n + 1);
      });
  }, [isAdmin, stationId]);

  return (moduleKey: string) => {
    if (isAdmin) return true;
    if (!stationId) return true; // global admin view — show all
    const cached = _moduleCache[stationId];
    if (!cached) return true; // not yet loaded — fail-open
    return cached.has(moduleKey);
  };
}

// ── Business assignment scoping ────────────────────────────────────────────────
// Managerial roles see every business at their station regardless of individual
// assignment (matching how Fuel/LPG/etc. already work for them). Operational
// roles (Attendant, plain Employee, ...) are scoped to only the specific
// business(es) they were assigned to in Staff Onboarding.

const UNRESTRICTED_BUSINESS_ROLES = new Set(["SuperAdmin", "Admin", "Manager", "LocationHead"]);
const GENERIC_WORK_MODULES = new Set(["Fuel", "LPG", "Water", "Car Wash", "Automotive", "Inventory", "Finance", "HR"]);

export function hasUnrestrictedBusinessAccess(): boolean {
  return UNRESTRICTED_BUSINESS_ROLES.has(sessionStore.user().activeRole);
}

/** True if the current user can see/use the given business — always true for
 * managerial roles, otherwise only if they were individually assigned to it. */
export function canAccessBusiness(businessName: string): boolean {
  if (hasUnrestrictedBusinessAccess()) return true;
  return !!sessionStore.user().workModules?.includes(businessName);
}

/** True if an operational-role user has been assigned to at least one business
 * — used to decide whether the "Business" nav link should appear at all. */
export function hasAnyBusinessAssignment(): boolean {
  if (hasUnrestrictedBusinessAccess()) return true;
  const modules = sessionStore.user().workModules;
  return !!modules?.some(m => !GENERIC_WORK_MODULES.has(m));
}

export function isLocationVisible(locationName?: string): boolean {
  const u = sessionStore.user();
  const active = sessionStore.activeLocation();
  if (u.activeRole === "LocationHead" && u.homeLocation)
    return !locationName || locationName === u.homeLocation;
  if (active === "All Locations") return true;
  return !locationName || locationName === active;
}
