import { useState } from "react";
import { Plus } from "lucide-react";
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
import { useLocations } from "@/data/locationsStore";

interface SubBusiness {
  id: string;
  name: string;
  type: string;
  location: string;
  manager: string;
  status: string;
  openedOn: string;
  notes: string;
}

const TYPES = ["Mini Mart", "Pharmacy", "Cafe", "Bakery", "Hardware", "Other"];

const initial: SubBusiness[] = [
  { id: "SB-001", name: "Jirani Mini Mart — CBD", type: "Mini Mart", location: "Nairobi CBD", manager: "Susan Otieno", status: "active", openedOn: "2024-04-01", notes: "Adjacent to fuel station" },
  { id: "SB-002", name: "Westlands Pharmacy", type: "Pharmacy", location: "Westlands", manager: "Kevin Njoroge", status: "active", openedOn: "2025-01-15", notes: "Licensed pharmacist on duty" },
  { id: "SB-003", name: "Mombasa Rd Cafe", type: "Cafe", location: "Mombasa Road", manager: "—", status: "planned", openedOn: "2026-07-01", notes: "Construction underway" },
];

const emptyForm: Omit<SubBusiness, "id"> = { name: "", type: "Mini Mart", location: "", manager: "", status: "active", openedOn: "", notes: "" };

export default function SubBusinessesTab() {
  const locations = useLocations();
  const [data, setData] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubBusiness | null>(null);
  const [viewing, setViewing] = useState<SubBusiness | null>(null);
  const [form, setForm] = useState(emptyForm);

  const stats = {
    total: data.length,
    active: data.filter(d => d.status === "active").length,
    types: new Set(data.map(d => d.type)).size,
  };

  const columns: Column<SubBusiness>[] = [
    { key: "id", label: "ID" },
    { key: "name", label: "Name", sortable: true },
    { key: "type", label: "Type", render: i => <Badge variant="outline">{i.type}</Badge> },
    { key: "location", label: "Location" },
    { key: "manager", label: "Manager" },
    { key: "openedOn", label: "Opened", sortable: true },
    { key: "status", label: "Status", render: i => <StatusBadge status={i.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "type", label: "Type", options: TYPES.map(t => ({ label: t, value: t })) },
    { key: "location", label: "Location", options: locations.map(l => ({ label: l.name, value: l.name })) },
  ];

  const openNew = () => { setEditing(null); setForm({ ...emptyForm, openedOn: new Date().toISOString().split("T")[0], location: locations[0]?.name || "" }); setModalOpen(true); };
  const openEdit = (i: SubBusiness) => { setEditing(i); setForm({ name: i.name, type: i.type, location: i.location, manager: i.manager, status: i.status, openedOn: i.openedOn, notes: i.notes }); setModalOpen(true); };
  const handleSave = () => {
    if (editing) setData(d => d.map(x => x.id === editing.id ? { ...x, ...form } : x));
    else setData(d => [...d, { id: `SB-${String(d.length + 1).padStart(3, "0")}`, ...form }]);
    setModalOpen(false);
  };
  const handleDelete = (i: SubBusiness) => setData(d => d.filter(x => x.id !== i.id));
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sub-Businesses</h3>
          <p className="text-sm text-muted-foreground">Mini Marts, Pharmacies & other sub-businesses on station</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Sub-Business</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "Categories", value: stats.types, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "manager"]} searchPlaceholder="Search sub-businesses..." filters={filters} onView={i => setViewing(i)} onEdit={openEdit} onDelete={handleDelete} />

      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Sub-Business" : "Add Sub-Business"} onSubmit={handleSave} submitLabel={editing ? "Update" : "Create"}>
        <div className="space-y-4">
          <div><Label>Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={v => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label>
              <Select value={form.location} onValueChange={v => set("location", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Manager</Label><Input value={form.manager} onChange={e => set("manager", e.target.value)} /></div>
            <div><Label>Opened On</Label><Input type="date" value={form.openedOn} onChange={e => set("openedOn", e.target.value)} /></div>
            <div className="col-span-2"><Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "planned", "closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} /></div>
        </div>
      </ModalForm>

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sub-Business" isView>
        {viewing && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><Badge variant="outline">{viewing.id}</Badge><StatusBadge status={viewing.status} /></div>
            <div><span className="text-muted-foreground">Name:</span> {viewing.name}</div>
            <div><span className="text-muted-foreground">Type:</span> {viewing.type}</div>
            <div><span className="text-muted-foreground">Location:</span> {viewing.location}</div>
            <div><span className="text-muted-foreground">Manager:</span> {viewing.manager}</div>
            <div><span className="text-muted-foreground">Opened:</span> {viewing.openedOn}</div>
            {viewing.notes && <div><span className="text-muted-foreground">Notes:</span> {viewing.notes}</div>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
