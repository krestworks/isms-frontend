import { useEffect, useState } from "react";
import { sessionStore } from "@/data/sessionStore";
import { stationsApi, ApiStationFull } from "./stationsApi";

/** Returns the station that matches the user's active location scope.
 *  For managers this is their only accessible station.
 *  For admins it's the one selected in the location switcher (or the first available). */
export function useActiveStation(): { station: ApiStationFull | null; stationId: string | null; loading: boolean } {
  const [station, setStation]   = useState<ApiStationFull | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    stationsApi.list()
      .then(res => {
        if (cancelled) return;
        const stations = res.data ?? [];
        const active   = sessionStore.activeLocation();
        const match    = stations.find(s => s.name === active) ?? stations[0] ?? null;
        setStation(match);
      })
      .catch(() => setStation(null))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { station, stationId: station?.id ?? null, loading };
}
