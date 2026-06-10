import { useEffect, useState } from "react";
import { sessionStore } from "@/data/sessionStore";
import { stationsCache } from "@/data/stationsCache";
import { stationsApi, ApiStationFull } from "./stationsApi";

/** Resolve the "active" station from the cache given current session state.
 *  Non-admins are always resolved to their homeLocation station.
 *  Admins are resolved to whichever station is selected in the switcher
 *  (or the first station when "All Locations" is active). */
function resolveFromCache(): ApiStationFull | null {
  const stations = stationsCache.all();
  if (stations.length === 0) return null;

  const user = sessionStore.user();
  const active = sessionStore.activeLocation();

  // Non-admins can only ever see their home station
  if (!user.permissions.includes("stations.view")) {
    if (!user.homeLocation) return null;
    return stations.find(s => s.name === user.homeLocation) ?? null;
  }

  // Admins: match the selected location name, fall back to first
  if (active === "All Locations") return stations[0] ?? null;
  return stations.find(s => s.name === active) ?? stations[0] ?? null;
}

export function useActiveStation(): { station: ApiStationFull | null; stationId: string | null; loading: boolean } {
  const [station, setStation] = useState<ApiStationFull | null>(() => resolveFromCache());
  const [loading, setLoading]  = useState(stationsCache.all().length === 0);

  useEffect(() => {
    let cancelled = false;

    async function loadIfEmpty() {
      if (stationsCache.all().length > 0) {
        setStation(resolveFromCache());
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await stationsApi.list();
        if (cancelled) return;
        stationsCache.set(res.data ?? []);
        setStation(resolveFromCache());
      } catch {
        if (!cancelled) setStation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadIfEmpty();

    // Re-resolve whenever the user session or the station list changes
    const unsub1 = sessionStore.subscribe(() => { if (!cancelled) setStation(resolveFromCache()); });
    const unsub2 = stationsCache.subscribe(() => { if (!cancelled) setStation(resolveFromCache()); });

    return () => { cancelled = true; unsub1(); unsub2(); };
  }, []);

  return { station, stationId: station?.id ?? null, loading };
}
