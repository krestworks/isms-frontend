// Action-level permission policy. Every sensitive write/delete operation should
// be gated through `can(action)`. Admin always passes. Other roles must be in
// the policy list. Unknown actions are denied for non-admins by default (safe).
//
// Naming convention: "<module>.<entity>.<verb>" — e.g. "fuel.tank.create".

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sessionStore, Role } from "@/data/sessionStore";
import { auditLog } from "@/data/auditLogStore";

export type Action = string;

// Default policy. Admin is implicit and always allowed — do NOT list it here.
// Edit this map to grant/revoke per-role action access.
export const ACTION_POLICY: Record<Action, Role[]> = {
  // HR / Staff
  "hr.staff.create": ["Manager"],
  "hr.staff.update": ["Manager"],
  "hr.staff.delete": [],
  "hr.disciplinary.create": ["Manager"],
  "hr.disciplinary.update": ["Manager"],
  "hr.payroll.run": ["Accountant"],
  "hr.attendance.correct.approve": ["Manager"],

  // Fuel
  "fuel.tank.create": ["Manager", "LocationHead"],
  "fuel.tank.update": ["Manager", "LocationHead"],
  "fuel.tank.delete": [],
  "fuel.pump.sale.create": ["Manager", "Attendant", "LocationHead"],
  "fuel.reconciliation.submit": ["Manager", "LocationHead", "Accountant"],

  // LPG
  "lpg.cylinder.create": ["Manager", "LocationHead"],
  "lpg.cylinder.update": ["Manager", "LocationHead"],
  "lpg.cylinder.delete": [],
  "lpg.sale.create": ["Manager", "Attendant", "LocationHead"],

  // Water
  "water.production.create": ["Manager", "LocationHead"],
  "water.equipment.create": ["Manager", "LocationHead"],
  "water.sale.create": ["Manager", "Attendant", "LocationHead"],

  // Automotive
  "automotive.service.create": ["Manager", "LocationHead", "Attendant"],
  "automotive.parts.create": ["Manager", "LocationHead"],
  "automotive.pricing.update": ["Manager"],

  // Carwash
  "carwash.package.create": ["Manager"],
  "carwash.booking.create": ["Manager", "Attendant", "LocationHead"],
  "carwash.sale.create": ["Manager", "Attendant", "LocationHead"],

  // Inventory
  "inventory.product.create": ["Manager", "LocationHead"],
  "inventory.product.delete": [],
  "inventory.stock.movement": ["Manager", "Attendant", "LocationHead"],
  "inventory.supplier.create": ["Manager", "Accountant"],

  // Finance
  "finance.expense.create": ["Manager", "Accountant"],
  "finance.report.generate": ["Manager", "Accountant"],

  // Locations & Settings
  "locations.create": [],   // Admin-only
  "locations.update": [],   // Admin-only
  "settings.user.create": [],
  "settings.user.update": [],
  "settings.role.update": [],
};

export function can(action: Action): boolean {
  const u = sessionStore.user();
  if (u.activeRole === "Admin") return true;
  const allowed = ACTION_POLICY[action];
  if (!allowed) return false;
  return allowed.includes(u.activeRole);
}

export function requireAction(action: Action): boolean {
  if (can(action)) return true;
  try { auditLog.log("permission.denied", action, `Blocked attempt by ${sessionStore.user().activeRole} on ${action}`); } catch {}
  return false;
}

// Subscribe to session changes so gated UIs re-render after role switching.
export function usePermission(action: Action): boolean {
  const [allowed, setAllowed] = useState<boolean>(can(action));
  useEffect(() => {
    setAllowed(can(action));
    const u = sessionStore.subscribe(() => setAllowed(can(action)));
    return () => { u(); };
  }, [action]);
  return allowed;
}

// Render-prop component to hide/replace UI based on permission.
export function RequireAction({ action, children, fallback = null }: { action: Action; children: React.ReactNode; fallback?: React.ReactNode }) {
  return usePermission(action) ? (children as any) : (fallback as any);
}
