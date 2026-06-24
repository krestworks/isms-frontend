// Cashier session store — persisted in localStorage per business.
// A session tracks opening float, sales, closing cash, and reconciliation.

export type SessionStatus = "open" | "closed" | "committed";

export interface PayMethodTotals {
  Cash: number;
  "M-Pesa": number;
  Card: number;
  Credit: number;
  [key: string]: number;
}

export interface ClosingEntry {
  method: string;
  expected: number;
  actual: number;
  variance: number;
}

export interface CashierSession {
  id: string;
  businessId: string;
  cashier: string;
  openedAt: string;
  closedAt?: string;
  committedAt?: string;
  status: SessionStatus;
  openingFloat: number;
  closingCash?: number;
  closingNotes?: string;
  closingEntries?: ClosingEntry[];
  // totals computed on close
  totalSales?: number;
  totalTransactions?: number;
  payMethodTotals?: PayMethodTotals;
}

const KEY = (businessId: string) => `pos.session.${businessId}`;

function load(businessId: string): CashierSession | null {
  try {
    const raw = localStorage.getItem(KEY(businessId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function save(session: CashierSession | null, businessId: string) {
  if (session) localStorage.setItem(KEY(businessId), JSON.stringify(session));
  else localStorage.removeItem(KEY(businessId));
}

const listeners = new Map<string, Set<() => void>>();

function notify(businessId: string) {
  listeners.get(businessId)?.forEach(l => l());
}

export const posSessionStore = {
  get: (businessId: string): CashierSession | null => load(businessId),

  open: (businessId: string, cashier: string, openingFloat: number): CashierSession => {
    const session: CashierSession = {
      id: `SES-${Date.now().toString(36).toUpperCase()}`,
      businessId, cashier, openingFloat,
      openedAt: new Date().toISOString(),
      status: "open",
    };
    save(session, businessId);
    notify(businessId);
    return session;
  },

  close: (
    businessId: string,
    closingEntries: ClosingEntry[],
    closingNotes: string,
    totalSales: number,
    totalTransactions: number,
    payMethodTotals: PayMethodTotals,
  ): CashierSession | null => {
    const session = load(businessId);
    if (!session || session.status !== "open") return null;
    const closingCash = closingEntries.find(e => e.method === "Cash")?.actual ?? 0;
    const updated: CashierSession = {
      ...session,
      status: "closed",
      closedAt: new Date().toISOString(),
      closingCash, closingNotes, closingEntries,
      totalSales, totalTransactions, payMethodTotals,
    };
    save(updated, businessId);
    notify(businessId);
    return updated;
  },

  commit: (businessId: string): CashierSession | null => {
    const session = load(businessId);
    if (!session || session.status !== "closed") return null;
    const updated: CashierSession = { ...session, status: "committed", committedAt: new Date().toISOString() };
    save(updated, businessId);
    notify(businessId);
    return updated;
  },

  clear: (businessId: string) => {
    save(null, businessId);
    notify(businessId);
  },

  subscribe: (businessId: string, fn: () => void) => {
    if (!listeners.has(businessId)) listeners.set(businessId, new Set());
    listeners.get(businessId)!.add(fn);
    return () => { listeners.get(businessId)?.delete(fn); };
  },
};
