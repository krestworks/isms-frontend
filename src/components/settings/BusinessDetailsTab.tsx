import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save } from "lucide-react";

interface BusinessInfo {
  name: string;
  registration: string;
  pin: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  logo: string;
  tagline: string;
}

const initial: BusinessInfo = {
  name: "ISMS Petroleum Station",
  registration: "BN-2024-001234",
  pin: "P051234567A",
  phone: "+254 700 123 456",
  email: "info@isms-station.co.ke",
  address: "Kenyatta Avenue, Plot 45",
  city: "Nairobi",
  country: "Kenya",
  logo: "",
  tagline: "Your One-Stop Energy & Service Station",
};

export function BusinessDetailsTab() {
  const [form, setForm] = useState(initial);
  const update = (key: keyof BusinessInfo, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => toast.success("Business details saved successfully");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Business Details</h3>
        <Button onClick={handleSave} size="sm"><Save className="h-4 w-4 mr-1" /> Save Changes</Button>
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
