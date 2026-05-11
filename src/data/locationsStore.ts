import { useEffect, useState } from "react";

export interface Location {
  id: string;
  name: string;
  type: string; // Branch | Region | Country | Depot
  parent?: string;
  country: string;
  city: string;
  address: string;
  manager: string;
  phone: string;
  modules: string[]; // which modules operate here
  status: string;
  openedOn: string;
}

const initial: Location[] = [
  { id: "LOC-001", name: "Nairobi CBD", type: "Branch", country: "Kenya", city: "Nairobi", address: "Moi Avenue", manager: "Grace Wanjiku", phone: "0700111222", modules: ["Fuel", "LPG", "Car Wash"], status: "active", openedOn: "2023-01-15" },
  { id: "LOC-002", name: "Westlands", type: "Branch", country: "Kenya", city: "Nairobi", address: "Waiyaki Way", manager: "David Kimani", phone: "0700333444", modules: ["Fuel", "Automotive", "Inventory"], status: "active", openedOn: "2023-06-01" },
  { id: "LOC-003", name: "Mombasa Road", type: "Branch", country: "Kenya", city: "Nairobi", address: "Mombasa Rd Km 12", manager: "Peter Ochieng", phone: "0700555666", modules: ["Fuel", "Car Wash", "Water"], status: "active", openedOn: "2024-02-10" },
  { id: "LOC-004", name: "Nakuru Depot", type: "Depot", country: "Kenya", city: "Nakuru", address: "Industrial Area", manager: "—", phone: "0700777888", modules: ["LPG", "Water"], status: "planned", openedOn: "2026-06-01" },
];

type Listener = () => void;
const listeners = new Set<Listener>();
let items: Location[] = [...initial];

export const locationsStore = {
  all() { return items; },
  add(rec: Omit<Location, "id">) {
    items = [...items, { id: `LOC-${String(items.length + 1).padStart(3, "0")}`, ...rec }];
    listeners.forEach(l => l());
  },
  update(id: string, patch: Partial<Location>) {
    items = items.map(i => i.id === id ? { ...i, ...patch } : i);
    listeners.forEach(l => l());
  },
  remove(id: string) {
    items = items.filter(i => i.id !== id);
    listeners.forEach(l => l());
  },
  subscribe(l: Listener) { listeners.add(l); return () => listeners.delete(l); },
};

export function useLocations(): Location[] {
  const [, force] = useState(0);
  useEffect(() => { const u = locationsStore.subscribe(() => force(n => n + 1)); return () => { u(); }; }, []);
  return locationsStore.all();
}
