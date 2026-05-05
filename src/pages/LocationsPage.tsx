import { useState } from "react";
import { Plus, MapPin, ArrowRight } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { locationsStore, useLocations, Location } from "@/data/locationsStore";
import { useStaff } from "@/data/staffStore";
import { useShifts } from "@/data/shiftsStore";
import { sessionStore, useSession } from "@/data/sessionStore";
import { toast } from "sonner";

const TYPES = ["Branch", "Region", "Country", "Depot", "Outlet"];
const ALL_MODULES = ["Fuel", "LPG", "Water", "Automotive", "Car Wash", "Inventory"];

const emptyForm: Omit<Location, "id"> = { name: "", type: "Branch", country: "Kenya", city: "", address: "", manager: "", phone: "", modules: [], status: "active", openedOn: "" };

export default function LocationsPage() {
  const data = useLocations();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [viewing, setViewing] = useState<Location | null>(null);
  const [form, setForm] = useState<Omit<Location, "id">>(emptyForm);

  const stats = {
    total: data.length,
    active: data.filter(d => d.status === "active").length,
    branches: data.filter(d => d.type === "Branch").length,
    depots: data.filter(d => d.type === "Depot").length,
  };

  const columns: Column<Location>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", sortable: true },
    { key: "type", label: "Type", render: l => <Badge variant="outline">{l.type}</Badge> },
    { key: "city", label: "City" },
    { key: "manager", label: "Manager" },
    { key: "modules", label: "Modules", render: l => <div className="flex flex-wrap gap-1">{l.modules.map(m => <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>)}</div> },
    { key: "openedOn", label: "Opened", sortable: true },
    { key: "status", label: "Status", render: l => <StatusBadge status={l.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "type", label: "Type", options: TYPES.map(t => ({ label: t, value: t })) },
    { key: "city", label: "City", options: Array.from(new Set(data.map(d => d.city))).map(c => ({ label: c, value: c })) },
    { key: "status", label: "Status", options: ["active", "planned", "closed"].map(s => ({ label: s, value: s })) },
  ];

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, openedOn: new Date().toISOString().split("T")[0] }); setModalOpen(true); };
  const openEdit = (l: Location) => { setEditing(l); setForm({ name: l.name, type: l.type, country: l.country, city: l.city, address: l.address, manager: l.manager, phone: l.phone, modules: l.modules, status: l.status, openedOn: l.openedOn, parent: l.parent }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) locationsStore.update(editing.id, form);
    else locationsStore.add(form);
    setModalOpen(false);
  };
  const handleDelete = (l: Location) => locationsStore.remove(l.id);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const toggleModule = (m: string) => setForm(f => ({ ...f, modules: f.modules.includes(m) ? f.modules.filter(x => x !== m) : [...f.modules, m] }));

  return (
    <ModulePageShell title="Locations" description="Branches, depots & regional outlets" icon={MapPin}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">All Locations</h3>
            <p className="text-sm text-muted-foreground">Set up branches and assign modules per location</p>
          </div>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Location</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Locations", value: stats.total },
            { label: "Active", value: stats.active, color: "text-green-600" },
            { label: "Branches", value: stats.branches, color: "text-primary" },
            { label: "Depots", value: stats.depots, color: "text-amber-600" },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
          ))}
        </div>

        <DataTable data={data} columns={columns} searchKeys={["name", "city", "manager"]} searchPlaceholder="Search locations..." filters={filters} onView={l => setViewing(l)} onEdit={openEdit} onDelete={handleDelete} />

        <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Location" : "Add Location"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Country</Label><Input value={form.country} onChange={e => set("country", e.target.value)} /></div>
              <div><Label>City</Label><Input value={form.city} onChange={e => set("city", e.target.value)} /></div>
              <div className="col-span-2"><Label>Address</Label><Textarea value={form.address} onChange={e => set("address", e.target.value)} /></div>
              <div><Label>Manager</Label><Input value={form.manager} onChange={e => set("manager", e.target.value)} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
              <div><Label>Opened On</Label><Input type="date" value={form.openedOn} onChange={e => set("openedOn", e.target.value)} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["active", "planned", "closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Active Modules at this Location</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map(m => (
                  <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={form.modules.includes(m)} onCheckedChange={() => toggleModule(m)} />
                    {m}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </ModalForm>

        <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Location" isView>
          {viewing && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><Badge variant="outline">{viewing.id}</Badge><StatusBadge status={viewing.status} /></div>
              <div><span className="text-muted-foreground">Name:</span> {viewing.name} ({viewing.type})</div>
              <div><span className="text-muted-foreground">Address:</span> {viewing.address}, {viewing.city}, {viewing.country}</div>
              <div><span className="text-muted-foreground">Manager:</span> {viewing.manager} — {viewing.phone}</div>
              <div><span className="text-muted-foreground">Opened:</span> {viewing.openedOn}</div>
              <div><span className="text-muted-foreground">Modules:</span> <div className="flex flex-wrap gap-1 mt-1">{viewing.modules.map(m => <Badge key={m} variant="secondary">{m}</Badge>)}</div></div>
            </div>
          )}
        </ModalForm>
      </div>
    </ModulePageShell>
  );
}
