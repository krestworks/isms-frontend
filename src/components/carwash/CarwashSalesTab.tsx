import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface Sale {
  id: string; receiptNo: string; date: string; vehicleReg: string; washPackage: string; attendant: string; paymentMethod: string; amount: number; status: string;
}

const mockData: Sale[] = [
  { id: "1", receiptNo: "CWS-001", date: "2025-06-01", vehicleReg: "KDA 123A", washPackage: "Full Wash", attendant: "Peter M.", paymentMethod: "Cash", amount: 800, status: "paid" },
  { id: "2", receiptNo: "CWS-002", date: "2025-06-01", vehicleReg: "KBZ 456B", washPackage: "Premium Detail", attendant: "James K.", paymentMethod: "M-Pesa", amount: 2500, status: "paid" },
  { id: "3", receiptNo: "CWS-003", date: "2025-06-01", vehicleReg: "KCC 789C", washPackage: "Basic Rinse", attendant: "Peter M.", paymentMethod: "Cash", amount: 400, status: "paid" },
  { id: "4", receiptNo: "CWS-004", date: "2025-06-01", vehicleReg: "KAA 012D", washPackage: "Interior Clean", attendant: "James K.", paymentMethod: "Card", amount: 1200, status: "unpaid" },
];

const blank: Omit<Sale, "id"> = { receiptNo: "", date: new Date().toISOString().slice(0, 10), vehicleReg: "", washPackage: "Basic Rinse", attendant: "", paymentMethod: "Cash", amount: 0, status: "paid" };

const columns: Column<Sale>[] = [
  { key: "receiptNo", label: "Receipt #", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "vehicleReg", label: "Vehicle Reg" },
  { key: "washPackage", label: "Package" },
  { key: "attendant", label: "Attendant" },
  { key: "paymentMethod", label: "Payment" },
  { key: "amount", label: "Amount (Ksh)", render: (r) => `Ksh ${r.amount.toLocaleString()}`, sortable: true },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Unpaid", value: "unpaid" }] },
  { key: "paymentMethod", label: "Payment", options: [{ label: "Cash", value: "Cash" }, { label: "M-Pesa", value: "M-Pesa" }, { label: "Card", value: "Card" }] },
];

export default function CarwashSalesTab() {
  const [data, setData] = useState(mockData);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Omit<Sale, "id"> & { id?: string } } | null>(null);

  const open = (mode: "add" | "edit" | "view", item?: Sale) => setModal({ mode, item: item ? { ...item } : { ...blank } });
  const close = () => setModal(null);
  const save = () => { if (!modal) return; if (modal.mode === "add") setData((d) => [...d, { ...modal.item, id: crypto.randomUUID() } as Sale]); else if (modal.mode === "edit") setData((d) => d.map((r) => r.id === modal.item.id ? modal.item as Sale : r)); close(); };
  const remove = (item: Sale) => setData((d) => d.filter((r) => r.id !== item.id));
  const f = modal?.item;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" /> Record Sale</Button></div>
      <DataTable data={data} columns={columns} searchKeys={["receiptNo", "vehicleReg", "attendant"]} searchPlaceholder="Search sales..." filters={filters} onView={(r) => open("view", r)} onEdit={(r) => open("edit", r)} onDelete={remove} />
      {modal && f && (
        <ModalForm open onClose={close} title={modal.mode === "add" ? "Record Sale" : modal.mode === "edit" ? "Edit Sale" : "Sale Details"} isView={modal.mode === "view"} onSubmit={save}>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Receipt #</Label><Input value={f.receiptNo} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, receiptNo: e.target.value } })} /></div>
            <div><Label>Date</Label><Input type="date" value={f.date} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, date: e.target.value } })} /></div>
            <div><Label>Vehicle Reg</Label><Input value={f.vehicleReg} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, vehicleReg: e.target.value } })} /></div>
            <div><Label>Package</Label>
              <Select value={f.washPackage} onValueChange={(v) => setModal({ ...modal, item: { ...f, washPackage: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Basic Rinse", "Full Wash", "Premium Detail", "Interior Clean"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Attendant</Label><Input value={f.attendant} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, attendant: e.target.value } })} /></div>
            <div><Label>Payment Method</Label>
              <Select value={f.paymentMethod} onValueChange={(v) => setModal({ ...modal, item: { ...f, paymentMethod: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Cash">Cash</SelectItem><SelectItem value="M-Pesa">M-Pesa</SelectItem><SelectItem value="Card">Card</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Amount (Ksh)</Label><Input type="number" value={f.amount} readOnly={modal.mode === "view"} onChange={(e) => setModal({ ...modal, item: { ...f, amount: +e.target.value } })} /></div>
            <div><Label>Status</Label>
              <Select value={f.status} onValueChange={(v) => setModal({ ...modal, item: { ...f, status: v } })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
