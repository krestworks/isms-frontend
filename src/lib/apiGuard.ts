// Mock "backend" enforcement layer. Every store/data accessor that returns
// records about employees, shifts, attendance, documents, etc. should pipe
// reads through `scopeByLocation` and gate writes through `requireModule`.
//
// In a real backend the same predicates would run server-side as RLS / policy.

import { sessionStore } from "@/data/sessionStore";
import { auditLog } from "@/data/auditLogStore";
import { canAccessModule } from "@/lib/permissions";

// Filter a list of records by the active location scope.
export function scopeByLocation<T extends { location?: string }>(rows: T[]): T[] {
  const u = sessionStore.user();
  const active = sessionStore.activeLocation();
  if (u.activeRole === "LocationHead" && u.homeLocation) {
    return rows.filter(r => !r.location || r.location === u.homeLocation);
  }
  if (active === "All Locations") return rows;
  return rows.filter(r => !r.location || r.location === active);
}

// Throw a guard error and audit-log a denial when the active user lacks the module.
export function requireModule(moduleName: string, action: string): boolean {
  if (canAccessModule(moduleName)) return true;
  auditLog.log("permission.denied", moduleName, `Blocked attempt to ${action}`);
  if (typeof window !== "undefined") {
    // Soft warn — UIs already gate, this is a defence-in-depth backstop.
    console.warn(`[apiGuard] ${sessionStore.user().name} blocked from ${action} on ${moduleName}`);
  }
  return false;
}

// Verify a write touches a location the user can manage.
export function requireLocation(loc?: string): boolean {
  if (!loc) return true;
  const u = sessionStore.user();
  if (u.activeRole === "Admin") return true;
  if (u.activeRole === "LocationHead") return loc === u.homeLocation;
  const active = sessionStore.activeLocation();
  if (active === "All Locations") return true;
  return loc === active;
}
