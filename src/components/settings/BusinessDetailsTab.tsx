import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { useActiveStation } from "@/lib/useActiveStation";
import { settingsApi, BusinessConfig } from "@/lib/settingsApi";

const blank: BusinessConfig = {
  name: "", registration: "", pin: "", phone: "", email: "",
  address: "", city: "", country: "Kenya", tagline: "",
};

export function BusinessDetailsTab() {
  const { stationId } = useActiveStation();
  const [form,    setForm]    = useState<BusinessConfig>(blank);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await settingsApi.config.get<BusinessConfig>("business", stationId);
      if (res.data && Object.keys(res.data).length) setForm(res.data);
    } catch { /* no config yet — leave blank */ }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const update = (key: keyof BusinessConfig, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!stationId) return toast.error("No station selected");
    setSaving(true);
    try {
      await settingsApi.config.set("business", form, stationId);
      toast.success("Business details saved");
    } catch (e: any) { toast.error(e?.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Business Details</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
          <Button onClick={handleSave} size="sm" disabled={saving || loading}><Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">General Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Business Name</Label><Input value={form.name} onChange={e => update("name", e.target.value)} /></div>
            <div><Label>Registration Number</Label><Input value={form.registration} onChange={e => update("registration", e.target.value)} /></div>
            <div><Label>KRA PIN</Label><Input value={form.pin} onChange={e => update("pin", e.target.value)} /></div>
            <div><Label>Tagline</Label><Input value={form.tagline} onChange={e => update("tagline", e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Phone Number</Label><Input value={form.phone} onChange={e => update("phone", e.target.value)} /></div>
            <div><Label>Email Address</Label><Input value={form.email} onChange={e => update("email", e.target.value)} /></div>
            <div><Label>Physical Address</Label><Textarea value={form.address} onChange={e => update("address", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>City</Label><Input value={form.city} onChange={e => update("city", e.target.value)} /></div>
              <div><Label>Country</Label><Input value={form.country} onChange={e => update("country", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
