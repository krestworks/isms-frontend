import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Part {
  id: string;
  name: string;
  category: string;
  partNumber: string;
  supplier: string;
  buyingPrice: number;
  sellingPrice: number;
  stockQty: number;
  reorderLevel: number;
  status: string;
}

const sample: Part[] = [
  { id: "PT001", name: "Oil Filter (Toyota)", category: "Filters", partNumber: "OF-TY-001", supplier: "AutoParts Kenya", buyingPrice: 450, sellingPrice: 1200, stockQty: 45, reorderLevel: 10, status: "in-stock" },
  { id: "PT002", name: "Front Brake Pads (Universal)", category: "Brakes", partNumber: "BP-UN-002", supplier: "Brake Masters", buyingPrice: 2500, sellingPrice: 6000, stockQty: 12, reorderLevel: 5, status: "in-stock" },
  { id: "PT003", name: "Engine Oil 5W-30 (4L)", category: "Lubricants", partNumber: "EO-5W30-4L", supplier: "Shell Lubricants", buyingPrice: 2200, sellingPrice: 3800, stockQty: 3, reorderLevel: 10, status: "low-stock" },
  { id: "PT004", name: "Spark Plugs (Set of 4)", category: "Ignition", partNumber: "SP-NGK-004", supplier: "AutoParts Kenya", buyingPrice: 1800, sellingPrice: 4500, stockQty: 0, reorderLevel: 5, status: "out-of-stock" },
];

const blank: Omit<Part, "id"> = { name: "", category: "", partNumber: "", supplier: "", buyingPrice: 0, sellingPrice: 0, stockQty: 0, reorderLevel: 5, status: "in-stock" };

export function PartsInventoryTab() {
  const [data, setData] = useState(sample);
  const [modal, setModal] = useState<{ mode: "add" | "edit" | "view"; item: Part } | null>(null);
  const [form, setForm] = useState<Omit<Part, "id">>(blank);

  const open = (mode: "add" | "edit" | "view", item?: Part) => {
    setForm(item ? { ...item } : { ...blank });
    setModal({ mode, item: item || { id: "", ...blank } });
  };
  const save = () => {
    if (modal?.mode === "add") setData([{ ...form, id: `PT${String(data.length + 1).padStart(3, "0")}` }, ...data]);
    else if (modal?.mode === "edit") setData(data.map(d => d.id === modal.item.id ? { ...form, id: modal.item.id } : d));
    setModal(null);
  };
  const remove = (item: Part) => setData(data.filter(d => d.id !== item.id));

  const columns = [
    { key: "id" as const, label: "ID" },
    { key: "name" as const, label: "Part Name" },
    { key: "partNumber" as const, label: "Part #" },
    { key: "category" as const, label: "Category" },
    { key: "supplier" as const, label: "Supplier" },
    { key: "buyingPrice" as const, label: "Cost", render: (i: Part) => `Ksh ${i.buyingPrice.toLocaleString()}` },
    { key: "sellingPrice" as const, label: "Sell Price", render: (i: Part) => `Ksh ${i.sellingPrice.toLocaleString()}` },
    { key: "stockQty" as const, label: "Stock", render: (i: Part) => <span className={i.stockQty <= i.reorderLevel ? "text-destructive font-medium" : ""}>{i.stockQty}</span> },
    { key: "status" as const, label: "Status", render: (i: Part) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Parts Inventory</h3>
        <Button size="sm" onClick={() => open("add")}><Plus className="h-4 w-4 mr-1" />Add Part</Button>
      </div>
      <DataTable data={data} columns={columns} searchKeys={["name", "partNumber", "supplier", "category"]}
        filters={[
          { key: "status", label: "Status", options: [{ label: "In Stock", value: "in-stock" }, { label: "Low Stock", value: "low-stock" }, { label: "Out of Stock", value: "out-of-stock" }] },
          { key: "category", label: "Category", options: [{ label: "Filters", value: "Filters" }, { label: "Brakes", value: "Brakes" }, { label: "Lubricants", value: "Lubricants" }, { label: "Ignition", value: "Ignition" }] },
        ]}
        onView={i => open("view", i)} onEdit={i => open("edit", i)} onDelete={remove} />
      {modal && (
        <ModalForm open title={modal.mode === "add" ? "Add Part" : modal.mode === "edit" ? "Edit Part" : "Part Details"} onClose={() => setModal(null)} onSubmit={save} isView={modal.mode === "view"}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Part Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Part Number</Label><Input value={form.partNumber} onChange={e => setForm({ ...form, partNumber: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Filters">Filters</SelectItem>
                  <SelectItem value="Brakes">Brakes</SelectItem>
                  <SelectItem value="Lubricants">Lubricants</SelectItem>
                  <SelectItem value="Ignition">Ignition</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Suspension">Suspension</SelectItem>
                  <SelectItem value="Body">Body</SelectItem>
                  <SelectItem value="Tyres">Tyres</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Buying Price (Ksh)</Label><Input type="number" value={form.buyingPrice} onChange={e => setForm({ ...form, buyingPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Selling Price (Ksh)</Label><Input type="number" value={form.sellingPrice} onChange={e => setForm({ ...form, sellingPrice: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Stock Qty</Label><Input type="number" value={form.stockQty} onChange={e => setForm({ ...form, stockQty: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Reorder Level</Label><Input type="number" value={form.reorderLevel} onChange={e => setForm({ ...form, reorderLevel: +e.target.value })} disabled={modal.mode === "view"} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })} disabled={modal.mode === "view"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </ModalForm>
      )}
    </>
  );
}
