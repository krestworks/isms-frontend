import { useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { usePermission } from "@/lib/actionPermissions";

interface Tank {
  id: string;
  name: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  lastDipReading: number;
  lastDeliveryDate: string;
  lastDeliveryAmount: number;
  status: string;
}

const initialTanks: Tank[] = [
  { id: "T001", name: "Tank 1", fuelType: "Super", capacity: 20000, currentLevel: 15600, lastDipReading: 15580, lastDeliveryDate: "2026-04-07", lastDeliveryAmount: 10000, status: "operational" },
  { id: "T002", name: "Tank 2", fuelType: "Diesel", capacity: 25000, currentLevel: 4200, lastDipReading: 4180, lastDeliveryDate: "2026-04-05", lastDeliveryAmount: 15000, status: "low" },
  { id: "T003", name: "Tank 3", fuelType: "Kerosene", capacity: 15000, currentLevel: 12800, lastDipReading: 12750, lastDeliveryDate: "2026-04-06", lastDeliveryAmount: 8000, status: "operational" },
  { id: "T004", name: "Tank 4", fuelType: "Super", capacity: 20000, currentLevel: 1800, lastDipReading: 1790, lastDeliveryDate: "2026-04-01", lastDeliveryAmount: 10000, status: "critical" },
  { id: "T005", name: "Tank 5", fuelType: "V-Power", capacity: 10000, currentLevel: 7500, lastDipReading: 7480, lastDeliveryDate: "2026-04-08", lastDeliveryAmount: 5000, status: "operational" },
];

const emptyTank: Omit<Tank, "id"> = { name: "", fuelType: "Super", capacity: 20000, currentLevel: 0, lastDipReading: 0, lastDeliveryDate: "", lastDeliveryAmount: 0, status: "operational" };

export function TanksTab() {
  const [tanks, setTanks] = useState<Tank[]>(initialTanks);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "view"; tank: Tank | null } | null>(null);
  const [form, setForm] = useState<Omit<Tank, "id">>(emptyTank);
  const [deleteConfirm, setDeleteConfirm] = useState<Tank | null>(null);
  const { toast } = useToast();
  const canCreate = usePermission("fuel.tank.create");
  const canUpdate = usePermission("fuel.tank.update");
  const canDelete = usePermission("fuel.tank.delete");

  const openCreate = () => { setForm(emptyTank); setModal({ mode: "create", tank: null }); };
  const openEdit = (t: Tank) => { setForm({ ...t }); setModal({ mode: "edit", tank: t }); };
  const openView = (t: Tank) => { setForm({ ...t }); setModal({ mode: "view", tank: t }); };

  const handleSave = () => {
    if (!form.name) { toast({ title: "Error", description: "Tank name is required", variant: "destructive" }); return; }
    if (modal?.mode === "create") {
      const newTank: Tank = { ...form, id: `T${String(tanks.length + 1).padStart(3, "0")}` };
      setTanks([...tanks, newTank]);
      toast({ title: "Tank Added", description: `${newTank.name} has been created.` });
    } else if (modal?.mode === "edit" && modal.tank) {
      setTanks(tanks.map((t) => (t.id === modal.tank!.id ? { ...modal.tank!, ...form } : t)));
      toast({ title: "Tank Updated", description: `${form.name} has been updated.` });
    }
    setModal(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      setTanks(tanks.filter((t) => t.id !== deleteConfirm.id));
      toast({ title: "Tank Deleted", description: `${deleteConfirm.name} has been removed.` });
      setDeleteConfirm(null);
    }
  };

  const levelPct = (t: Tank) => Math.round((t.currentLevel / t.capacity) * 100);

  const columns: Column<Tank>[] = [
    { key: "id", label: "ID", sortable: true },
    { key: "name", label: "Tank Name", sortable: true },
    { key: "fuelType", label: "Fuel Type", sortable: true },
    {
      key: "currentLevel", label: "Level", sortable: true,
      render: (t) => (
        <div className="flex items-center gap-2 min-w-[140px]">
          <Progress value={levelPct(t)} className="h-2 flex-1" />
          <span className="text-xs font-mono text-muted-foreground w-10 text-right">{levelPct(t)}%</span>
        </div>
      ),
    },
    { key: "capacity", label: "Capacity (L)", sortable: true, render: (t) => t.capacity.toLocaleString() },
    { key: "lastDipReading", label: "Last Dip (L)", sortable: true, render: (t) => t.lastDipReading.toLocaleString() },
    { key: "lastDeliveryDate", label: "Last Delivery", sortable: true },
    { key: "status", label: "Status", render: (t) => <StatusBadge status={t.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "fuelType", label: "Fuel Type", options: [{ label: "Super", value: "Super" }, { label: "Diesel", value: "Diesel" }, { label: "Kerosene", value: "Kerosene" }, { label: "V-Power", value: "V-Power" }] },
    { key: "status", label: "Status", options: [{ label: "Operational", value: "operational" }, { label: "Low", value: "low" }, { label: "Critical", value: "critical" }, { label: "Maintenance", value: "maintenance" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Monitor tank levels, deliveries, and dip readings</p>
        {canCreate && <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Tank</Button>}
      </div>

      <DataTable
        data={tanks}
        columns={columns}
        searchKeys={["name", "fuelType", "id"]}
        searchPlaceholder="Search tanks..."
        filters={filters}
        actions={(t) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openView(t)}><Eye className="h-3.5 w-3.5" /></Button>
            {canUpdate && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>}
            {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteConfirm(t)}><Trash2 className="h-3.5 w-3.5" /></Button>}
          </div>
        )}
      />

      {/* Create / Edit / View Modal */}
      {modal && (
        <ModalForm
          open
          onClose={() => setModal(null)}
          title={modal.mode === "create" ? "Add Tank" : modal.mode === "edit" ? "Edit Tank" : "Tank Details"}
          onSubmit={modal.mode !== "view" ? handleSave : undefined}
          isView={modal.mode === "view"}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tank Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Fuel Type</Label>
              <Select value={form.fuelType} onValueChange={(v) => setForm({ ...form, fuelType: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Super">Super</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Kerosene">Kerosene</SelectItem>
                  <SelectItem value="V-Power">V-Power</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Capacity (L)</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Current Level (L)</Label>
              <Input type="number" value={form.currentLevel} onChange={(e) => setForm({ ...form, currentLevel: +e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Last Dip Reading (L)</Label>
              <Input type="number" value={form.lastDipReading} onChange={(e) => setForm({ ...form, lastDipReading: +e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Last Delivery Date</Label>
              <Input type="date" value={form.lastDeliveryDate} onChange={(e) => setForm({ ...form, lastDeliveryDate: e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Last Delivery Amount (L)</Label>
              <Input type="number" value={form.lastDeliveryAmount} onChange={(e) => setForm({ ...form, lastDeliveryAmount: +e.target.value })} disabled={modal.mode === "view"} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <ModalForm open onClose={() => setDeleteConfirm(null)} title="Delete Tank" onSubmit={handleDelete} submitLabel="Delete">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
          </p>
        </ModalForm>
      )}
    </div>
  );
}
