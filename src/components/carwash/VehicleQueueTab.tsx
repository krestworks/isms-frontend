import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface QueueItem {
  id: string;
  ticketNo: string;
  date: string;
  vehicleReg: string;
  vehicleType: string;
  washPackage: string;
  assignedTo: string;
  status: string;
  amount: number;
}

const mockData: QueueItem[] = [
  { id: "1", ticketNo: "CW-001", date: "2025-06-01", vehicleReg: "KDA 123A", vehicleType: "Sedan", washPackage: "Full Wash", assignedTo: "Peter M.", status: "completed", amount: 800 },
  { id: "2", ticketNo: "CW-002", date: "2025-06-01", vehicleReg: "KBZ 456B", vehicleType: "SUV", washPackage: "Premium Detail", assignedTo: "James K.", status: "in_progress", amount: 2500 },
  { id: "3", ticketNo: "CW-003", date: "2025-06-01", vehicleReg: "KCC 789C", vehicleType: "Pickup", washPackage: "Basic Rinse", assignedTo: "Unassigned", status: "waiting", amount: 400 },
  { id: "4", ticketNo: "CW-004", date: "2025-06-01", vehicleReg: "KAA 012D", vehicleType: "Van", washPackage: "Interior Clean", assignedTo: "Peter M.", status: "waiting", amount: 1200 },
];

const blank: Omit<QueueItem, "id"> = { ticketNo: "", date: new Date().toISOString().slice(0, 10), vehicleReg: "", vehicleType: "Sedan", washPackage: "Basic Rinse", assignedTo: "", status: "waiting", amount: 0 };

const columns: Column<QueueItem>[] = [
  { key: "ticketNo", label: "Ticket #", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "vehicleReg", label: "Vehicle Reg" },
  { key: "vehicleType", label: "Type" },
  { key: "washPackage", label: "Package" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "amount", label: "Amount (Ksh)", render: (r) => `Ksh ${r.amount.toLocaleString()}` },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Waiting", value: "waiting" }, { label: "In Progress", value: "in_progress" }, { label: "Completed", value: "completed" }] },
  { key: "washPackage", label: "Package", options: [{ label: "Basic Rinse", value: "Basic Rinse" }, { label: "Full Wash", value: "Full Wash" }, { label: "Premium Detail", value: "Premium Detail" }, { label: "Interior Clean", value: "Interior Clean" }] },
];

export default function VehicleQueueTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<QueueItem, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: QueueItem) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);

  const save = () => {
    if (!modal) return;
    if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as QueueItem]);
    else if (modal.mode === "edit") setData((d) => d.map((r) => (r.id === modal.item.id ? (modal.item as QueueItem) : r)));
    close();
  };

  const remove = (item: QueueItem) => setData((d) => d.filter((r) => r.id !== item.id));

  const f = modal?.item;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> Add to Queue</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["ticketNo", "vehicleReg", "assignedTo"]} searchPlaceholder="Search queue..." filters={filters} onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "Add Vehicle" : modal.mode === "edit" ? "Edit Vehicle" : "Vehicle Details"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ticket #</Label><Input value={f.ticketNo} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, ticketNo: e.target.value } })} /></div>
            <div><Label>Date</Label><Input type="date" value={f.date} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, date: e.target.value } })} /></div>
            <div><Label>Vehicle Reg</Label><Input value={f.vehicleReg} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, vehicleReg: e.target.value } })} /></div>
            <div><Label>Vehicle Type</Label>
              <Select value={f.vehicleType} onValueChange={(v) => setModal({ ...modal, item: { ...f, vehicleType: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Sedan", "SUV", "Pickup", "Van", "Motorcycle", "Bus"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Wash Package</Label>
              <Select value={f.washPackage} onValueChange={(v) => setModal({ ...modal, item: { ...f, washPackage: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Basic Rinse", "Full Wash", "Premium Detail", "Interior Clean"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assigned To</Label><Input value={f.assignedTo} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, assignedTo: e.target.value } })} /></div>
            <div><Label>Amount (Ksh)</Label><Input type="number" value={f.amount} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, amount: +e.target.value } })} /></div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setModal({ ...modal, item: { ...f, status: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="waiting">Waiting</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
