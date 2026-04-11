import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface ClientOrder {
  id: string; orderRef: string; date: string; client: string; module: string; description: string; amount: number; status: string;
}

const mockData: ClientOrder[] = [
  { id: "1", orderRef: "ORD-001", date: "2025-06-01", client: "Wanjiku Enterprises", module: "Fuel", description: "Diesel 500L delivery", amount: 85000, status: "completed" },
  { id: "2", orderRef: "ORD-002", date: "2025-06-01", client: "Wanjiku Enterprises", module: "LPG", description: "6kg cylinders x20", amount: 24000, status: "pending" },
  { id: "3", orderRef: "ORD-003", date: "2025-06-02", client: "Mama Njeri Stores", module: "Water", description: "20L bottles x50", amount: 5000, status: "processing" },
  { id: "4", orderRef: "ORD-004", date: "2025-06-02", client: "John Kamau", module: "Car Wash", description: "Premium Detail booking", amount: 2500, status: "completed" },
  { id: "5", orderRef: "ORD-005", date: "2025-06-03", client: "David Ochieng", module: "Automotive", description: "Full Service - Toyota Hilux", amount: 8500, status: "pending" },
];

const columns: Column<ClientOrder>[] = [
  { key: "orderRef", label: "Order Ref", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "client", label: "Client" },
  { key: "module", label: "Module", render: (r) => <Badge variant="secondary">{r.module}</Badge> },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (Ksh)", render: (r) => `Ksh ${r.amount.toLocaleString()}`, sortable: true },
  { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const filters: FilterOption[] = [
  { key: "module", label: "Module", options: [{ label: "Fuel", value: "Fuel" }, { label: "LPG", value: "LPG" }, { label: "Water", value: "Water" }, { label: "Car Wash", value: "Car Wash" }, { label: "Automotive", value: "Automotive" }] },
  { key: "status", label: "Status", options: [{ label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Completed", value: "completed" }] },
];

export default function ClientOrdersTab() {
  const [modal, setModal] = useState<{ item: ClientOrder } | null>(null);

  return (
    <div className="space-y-4">
      <DataTable data={mockData} columns={columns} searchKeys={["orderRef", "client", "description"]} searchPlaceholder="Search orders..." filters={filters} onView={(r) => setModal({ item: r })} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title="Order Details" isView>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Order Ref</Label><Input value={modal.item.orderRef} readOnly /></div>
            <div><Label>Date</Label><Input value={modal.item.date} readOnly /></div>
            <div><Label>Client</Label><Input value={modal.item.client} readOnly /></div>
            <div><Label>Module</Label><Input value={modal.item.module} readOnly /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={modal.item.description} readOnly /></div>
            <div><Label>Amount</Label><Input value={`Ksh ${modal.item.amount.toLocaleString()}`} readOnly /></div>
            <div><Label>Status</Label><Input value={modal.item.status} readOnly /></div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
