// Real-time cache of the station list fetched from the API.
// Populated by AuthProvider after login/session restore.
// Read by HeaderSwitchers, useActiveStation, and any component that needs the full list.

import { useEffect, useState } from "react";
import type { ApiStationFull } from "@/lib/stationsApi";

let stations: ApiStationFull[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

export const stationsCache = {
  all: () => stations,
  set: (list: ApiStationFull[]) => { stations = list; notify(); },
  clear: () => { stations = []; notify(); },
  subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); },
};

export function useStations(): ApiStationFull[] {
  const [, force] = useState(0);
  useEffect(() => {
    const u = stationsCache.subscribe(() => force(n => n + 1));
    return () => { u(); };
  }, []);
  return stationsCache.all();
}
