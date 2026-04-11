import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Booking {
  id: string; bookingRef: string; date: string; time: string; client: string; phone: string; vehicleReg: string; washPackage: string; status: string;
}

const mockData: Booking[] = [
  { id: "1", bookingRef: "BK-001", date: "2025-06-02", time: "09:00", client: "John Kamau", phone: "0712345678", vehicleReg: "KDA 123A", washPackage: "Premium Detail", status: "confirmed" },
  { id: "2", bookingRef: "BK-002", date: "2025-06-02", time: "10:30", client: "Mary Wanjiku", phone: "0723456789", vehicleReg: "KBZ 456B", washPackage: "Full Wash", status: "pending" },
  { id: "3", bookingRef: "BK-003", date: "2025-06-02", time: "14:00", client: "David Ochieng", phone: "0734567890", vehicleReg: "KCC 789C", washPackage: "Basic Rinse", status: "completed" },
  { id: "4", bookingRef: "BK-004", date: "2025-06-03", time: "11:00", client: "Alice Njeri", phone: "0745678901", vehicleReg: "KAA 012D", washPackage: "Interior Clean", status: "cancelled" },
];

const blank: Omit<Booking, "id"> = { bookingRef: "", date: "", time: "", client: "", phone: "", vehicleReg: "", washPackage: "Basic Rinse", status: "pending" };

const columns: Column<Booking>[] = [
  { key: "bookingRef", label: "Ref #", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "time", label: "Time" },
  { key: "client", label: "Client" },
  { key: "phone", label: "Phone" },
  { key: "vehicleReg", label: "Vehicle Reg" },
  { key: "washPackage", label: "Package" },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Confirmed", value: "confirmed" }, { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" }] },
];

export default function BookingsTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<Booking, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: Booking) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);
  const save = () => { if (!modal) return; if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as Booking]); else if (modal.mode === "edit") setData((d) => d.map((r) => r.id === modal.item.id ? modal.item as Booking : r)); close(); };
  const remove = (item: Booking) => setData((d) => d.filter((r) => r.id !== item.id));
  const f = modal?.item;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> New Booking</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["bookingRef", "client", "vehicleReg"]} searchPlaceholder="Search bookings..." filters={filters} onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "New Booking" : modal.mode === "edit" ? "Edit Booking" : "Booking Details"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Ref #</Label><Input value={f.bookingRef} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, bookingRef: e.target.value } })} /></div>
            <div><Label>Date</Label><Input type="date" value={f.date} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, date: e.target.value } })} /></div>
            <div><Label>Time</Label><Input type="time" value={f.time} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, time: e.target.value } })} /></div>
            <div><Label>Client</Label><Input value={f.client} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, client: e.target.value } })} /></div>
            <div><Label>Phone</Label><Input value={f.phone} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, phone: e.target.value } })} /></div>
            <div><Label>Vehicle Reg</Label><Input value={f.vehicleReg} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, vehicleReg: e.target.value } })} /></div>
            <div><Label>Package</Label>
              <Select value={f.washPackage} onValueChange={(v) => setModal({ ...modal, item: { ...f, washPackage: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Basic Rinse", "Full Wash", "Premium Detail", "Interior Clean"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setModal({ ...modal, item: { ...f, status: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
