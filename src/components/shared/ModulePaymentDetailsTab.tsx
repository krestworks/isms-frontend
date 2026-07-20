import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentDetailsFields } from "@/components/shared/PaymentDetailsFields";
import { settingsApi } from "@/lib/settingsApi";
import { useActiveStation } from "@/lib/useActiveStation";
import type { ApiPaymentDetails } from "@/lib/bizApi";
import { toast } from "sonner";

interface Props {
  /** Section key suffix — "fuel" | "lpg" | "water" | "carwash" | "auto". */
  module: string;
  moduleLabel: string;
}

/** Till/paybill/bank details for a module's invoices/receipts — each module
 *  registers its own, independent of every other module or sub-business
 *  (e.g. the fuel station's paybill can differ from the mart's till). */
export function ModulePaymentDetailsTab({ module, moduleLabel }: Props) {
  const { stationId } = useActiveStation();
  const [value, setValue] = useState<Partial<ApiPaymentDetails>>({ method: "none" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await settingsApi.config.get<Partial<ApiPaymentDetails>>(`payment-details-${module}`, stationId);
      setValue(res.data && Object.keys(res.data).length ? res.data : { method: "none" });
    } catch (e: any) { toast.error(e?.message || "Failed to load payment details"); }
    finally { setLoading(false); }
  }, [stationId, module]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.config.set(`payment-details-${module}`, value, stationId);
      toast.success("Payment details saved");
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading…</div>;

  return (
    <Card className="max-w-lg">
      <CardHeader><CardTitle className="text-base">{moduleLabel} Payment Details</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground -mt-2">Shown on every {moduleLabel.toLowerCase()} receipt and invoice at this station.</p>
        <PaymentDetailsFields value={value} onChange={setValue} />
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
