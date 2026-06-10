import { useCallback, useEffect, useState } from "react";
import { hrApi, ApiEmployee } from "./hrApi";

export function useMyEmployee(): { employee: ApiEmployee | null; loading: boolean; error: string | null; refetch: () => void } {
  const [employee, setEmployee] = useState<ApiEmployee | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.self.me();
      setEmployee(res.data ?? null);
    } catch (err: any) {
      // 404 = no employee record linked — not a real error, just show NotOnboarded
      if (err?.status !== 404 && err?.statusCode !== 404) {
        setError(err?.message || "Failed to load employee details");
      }
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { employee, loading, error, refetch: load };
}
