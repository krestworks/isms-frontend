import { useEffect, useState } from "react";
import { approvalsApi } from "./approvalsApi";

/** Fetches entityIds of `entityType` with a pending Tier-1/Tier-2 delete-approval request.
 *  Pass the result straight into DataTable's `pendingDeleteIds` prop. Re-fetch on demand
 *  by bumping `refreshKey` (e.g. after your own `load()` call). */
export function usePendingDeleteIds(entityType: string, stationId?: string | null, refreshKey?: unknown): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    approvalsApi.pendingIds(entityType, stationId)
      .then(res => { if (!cancelled) setIds(new Set(res.data ?? [])); })
      .catch(() => { if (!cancelled) setIds(new Set()); });
    return () => { cancelled = true; };
  }, [entityType, stationId, refreshKey]);

  return ids;
}
