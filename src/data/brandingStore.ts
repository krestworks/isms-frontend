import { useEffect, useState } from "react";

export interface AccountBranding {
  id: string;
  name: string;
  logo: string | null;      // base64 data URL or null
  tagline: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

const STORAGE_KEY = "isms.branding";

function load(): AccountBranding | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

let branding: AccountBranding | null = load();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export const brandingStore = {
  get: (): AccountBranding | null => branding,
  set(next: AccountBranding | null) {
    branding = next;
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
    notify();
  },
  reset() {
    branding = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    notify();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useBranding() {
  const [, force] = useState(0);
  useEffect(() => {
    const unsub = brandingStore.subscribe(() => force(n => n + 1));
    return unsub;
  }, []);
  return brandingStore.get();
}
