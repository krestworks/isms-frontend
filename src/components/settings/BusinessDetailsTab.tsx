import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, RefreshCw, Upload, X, Building2 } from "lucide-react";
import { useActiveStation } from "@/lib/useActiveStation";
import { settingsApi, BusinessConfig } from "@/lib/settingsApi";
import { authService } from "@/lib/authService";
import { brandingStore, useBranding } from "@/data/brandingStore";
import type { AccountBranding } from "@/data/brandingStore";

const blank: BusinessConfig = {
  name: "", registration: "", pin: "", phone: "", email: "",
  address: "", city: "", country: "Kenya", tagline: "",
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function BusinessDetailsTab() {
  const { stationId } = useActiveStation();
  const branding = useBranding();

  // ── Brand identity state (account-level) ─────────────────────────────────
  const [brand, setBrand] = useState<Partial<AccountBranding>>({});
  const [brandSaving, setBrandSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Station config state ──────────────────────────────────────────────────
  const [form,    setForm]    = useState<BusinessConfig>(blank);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Populate brand form from store on mount / store change
  useEffect(() => {
    if (branding) {
      setBrand({
        name:         branding.name,
        tagline:      branding.tagline ?? "",
        website:      branding.website ?? "",
        address:      branding.address ?? "",
        country:      branding.country ?? "Kenya",
        contactEmail: branding.contactEmail ?? "",
        contactPhone: branding.contactPhone ?? "",
      });
      setLogoPreview(branding.logo ?? null);
    }
  }, [branding]);

  const load = useCallback(async () => {
    if (!stationId) return;
    setLoading(true);
    try {
      const res = await settingsApi.config.get<BusinessConfig>("business", stationId);
      if (res.data && Object.keys(res.data).length) setForm(res.data);
    } catch { /* no config yet */ }
    finally { setLoading(false); }
  }, [stationId]);

  useEffect(() => { load(); }, [load]);

  const update = (key: keyof BusinessConfig, value: string) => setForm(f => ({ ...f, [key]: value }));

  // ── Logo upload ───────────────────────────────────────────────────────────
  const handleLogoFile = async (file: File) => {
    if (file.size > 1.5 * 1024 * 1024) return toast.error("Logo must be under 1.5 MB");
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    const b64 = await fileToBase64(file);
    setLogoPreview(b64);
    setBrand(b => ({ ...b, logo: b64 }));
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  };

  const clearLogo = () => {
    setLogoPreview(null);
    setBrand(b => ({ ...b, logo: null }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // ── Save brand identity ───────────────────────────────────────────────────
  const handleSaveBrand = async () => {
    setBrandSaving(true);
    try {
      const updated = await authService.updateMyAccount(brand);
      brandingStore.set(updated);
      toast.success("Brand identity saved");
    } catch (e: any) { toast.error(e?.message || "Failed to save brand identity"); }
    finally { setBrandSaving(false); }
  };

  // ── Save station config ───────────────────────────────────────────────────
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
    <div className="space-y-8">

      {/* ── Brand Identity (account-level) ─────────────────────────────────── */}
      {branding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-base font-semibold text-foreground">Brand Identity</h3>
            </div>
            <Button onClick={handleSaveBrand} size="sm" disabled={brandSaving}>
              <Save className="h-4 w-4 mr-1" />{brandSaving ? "Saving…" : "Save Brand"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground -mt-2">
            This brand appears on all documents, reports, payslips, and emails across all stations.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logo upload */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Business Logo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="relative border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleLogoDrop}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo preview" className="max-h-24 max-w-full object-contain rounded" />
                      <button
                        className="absolute top-1 right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                        onClick={e => { e.stopPropagation(); clearLogo(); }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground text-center">Drag & drop or click to upload<br />PNG, JPG, SVG — max 1.5 MB</p>
                    </>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }} />
              </CardContent>
            </Card>

            {/* Brand details */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Brand Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Business / Brand Name</Label>
                  <Input value={brand.name ?? ""} onChange={e => setBrand(b => ({ ...b, name: e.target.value }))} />
                </div>
                <div>
                  <Label>Tagline</Label>
                  <Input placeholder="e.g. Powering Every Journey" value={brand.tagline ?? ""}
                    onChange={e => setBrand(b => ({ ...b, tagline: e.target.value }))} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input placeholder="https://example.com" value={brand.website ?? ""}
                    onChange={e => setBrand(b => ({ ...b, website: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Email</Label>
                    <Input value={brand.contactEmail ?? ""}
                      onChange={e => setBrand(b => ({ ...b, contactEmail: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input value={brand.contactPhone ?? ""}
                      onChange={e => setBrand(b => ({ ...b, contactPhone: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Head Office Address</Label>
                  <Textarea rows={2} value={brand.address ?? ""}
                    onChange={e => setBrand(b => ({ ...b, address: e.target.value }))} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={brand.country ?? ""}
                    onChange={e => setBrand(b => ({ ...b, country: e.target.value }))} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <hr className="border-border" />

      {/* ── Station / Branch Details ────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Station / Branch Details</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={handleSave} size="sm" disabled={saving || loading}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          These details are specific to the currently active station and appear on station-level documents.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">General Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Station Name</Label><Input value={form.name} onChange={e => update("name", e.target.value)} /></div>
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
    </div>
  );
}
