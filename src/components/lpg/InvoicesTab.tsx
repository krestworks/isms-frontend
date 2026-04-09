import { useState } from "react";
import { Eye, Download, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  client: string;
  clientPhone: string;
  clientAddress: string;
  items: { description: string; qty: number; unitPrice: number; total: number }[];
  subtotal: number;
  vat: number;
  vatAmount: number;
  discount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  paidDate: string;
  type: string;
}

const initialData: Invoice[] = [
  {
    id: "INV001", invoiceNo: "INV-2026-0451", date: "2026-04-09", dueDate: "2026-05-09", client: "Hotel Sapphire", clientPhone: "+254 722 111 000", clientAddress: "Westlands, Nairobi",
    items: [{ description: "50kg LPG Cylinder (Exchange)", qty: 2, unitPrice: 11000, total: 22000 }],
    subtotal: 22000, vat: 16, vatAmount: 3520, discount: 0, totalAmount: 25520, paymentStatus: "pending", paymentMethod: "Invoice", paidDate: "", type: "invoice"
  },
  {
    id: "INV002", invoiceNo: "INV-2026-0450", date: "2026-04-09", dueDate: "2026-04-09", client: "Mama Mboga Cafe", clientPhone: "+254 733 222 000", clientAddress: "Kawangware, Nairobi",
    items: [{ description: "13kg LPG Cylinder (Exchange)", qty: 3, unitPrice: 2400, total: 7200 }],
    subtotal: 7200, vat: 16, vatAmount: 1152, discount: 0, totalAmount: 8352, paymentStatus: "paid", paymentMethod: "M-Pesa", paidDate: "2026-04-09", type: "receipt"
  },
  {
    id: "INV003", invoiceNo: "INV-2026-0449", date: "2026-04-08", dueDate: "2026-04-08", client: "Quick Bites Restaurant", clientPhone: "+254 744 333 000", clientAddress: "Kilimani, Nairobi",
    items: [{ description: "25kg LPG Cylinder (Exchange)", qty: 1, unitPrice: 5200, total: 5200 }],
    subtotal: 5200, vat: 16, vatAmount: 832, discount: 200, totalAmount: 5832, paymentStatus: "paid", paymentMethod: "Cash", paidDate: "2026-04-08", type: "receipt"
  },
  {
    id: "INV004", invoiceNo: "INV-2026-0448", date: "2026-04-07", dueDate: "2026-05-07", client: "Quick Bites Restaurant", clientPhone: "+254 744 333 000", clientAddress: "Kilimani, Nairobi",
    items: [
      { description: "25kg LPG Cylinder (Exchange)", qty: 2, unitPrice: 5200, total: 10400 },
      { description: "Delivery Fee", qty: 1, unitPrice: 500, total: 500 },
    ],
    subtotal: 10900, vat: 16, vatAmount: 1744, discount: 500, totalAmount: 12144, paymentStatus: "paid", paymentMethod: "Invoice", paidDate: "2026-04-09", type: "invoice"
  },
  {
    id: "INV005", invoiceNo: "INV-2026-0447", date: "2026-04-06", dueDate: "2026-04-06", client: "Walk-in", clientPhone: "", clientAddress: "",
    items: [{ description: "6kg LPG Cylinder (New)", qty: 3, unitPrice: 1100, total: 3300 }],
    subtotal: 3300, vat: 16, vatAmount: 528, discount: 0, totalAmount: 3828, paymentStatus: "paid", paymentMethod: "Cash", paidDate: "2026-04-06", type: "receipt"
  },
];

export function InvoicesTab() {
  const [viewItem, setViewItem] = useState<Invoice | null>(null);

  const columns: Column<Invoice>[] = [
    { key: "invoiceNo", label: "Invoice #", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "client", label: "Client", sortable: true },
    { key: "type", label: "Type", render: (i) => <span className="capitalize text-xs font-medium">{i.type}</span> },
    { key: "subtotal", label: "Subtotal (Ksh)", render: (i) => i.subtotal.toLocaleString() },
    { key: "vatAmount", label: "VAT (Ksh)", render: (i) => i.vatAmount.toLocaleString() },
    { key: "totalAmount", label: "Total (Ksh)", sortable: true, render: (i) => <span className="font-mono font-bold">Ksh {i.totalAmount.toLocaleString()}</span> },
    { key: "paymentStatus", label: "Status", render: (i) => <StatusBadge status={i.paymentStatus} /> },
    { key: "paymentMethod", label: "Payment" },
  ];

  const filters: FilterOption[] = [
    { key: "paymentStatus", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }] },
    { key: "type", label: "Type", options: [{ label: "Invoice", value: "invoice" }, { label: "Receipt", value: "receipt" }] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Receipts and invoices for all LPG transactions</p>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
      </div>
      <DataTable data={initialData} columns={columns} searchKeys={["invoiceNo", "client"]} searchPlaceholder="Search invoices..." filters={filters}
        actions={(i) => (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(i)}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Printer className="h-3.5 w-3.5" /></Button>
          </div>
        )}
      />
      {viewItem && (
        <ModalForm open onClose={() => setViewItem(null)} title={viewItem.type === "invoice" ? "Invoice" : "Receipt"} isView>
          {/* Receipt / Invoice preview */}
          <div className="border border-border rounded-lg p-6 space-y-4 bg-background">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-foreground">ISMS Station</h3>
                <p className="text-xs text-muted-foreground">Integrated Station Management</p>
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-sm">{viewItem.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">{viewItem.type === "invoice" ? "TAX INVOICE" : "RECEIPT"}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground text-xs">Bill To</Label>
                <p className="font-medium">{viewItem.client}</p>
                {viewItem.clientPhone && <p className="text-xs text-muted-foreground">{viewItem.clientPhone}</p>}
                {viewItem.clientAddress && <p className="text-xs text-muted-foreground">{viewItem.clientAddress}</p>}
              </div>
              <div className="text-right">
                <div><Label className="text-muted-foreground text-xs">Date:</Label> <span className="text-sm">{viewItem.date}</span></div>
                {viewItem.type === "invoice" && <div><Label className="text-muted-foreground text-xs">Due:</Label> <span className="text-sm">{viewItem.dueDate}</span></div>}
                <div className="mt-1"><StatusBadge status={viewItem.paymentStatus} /></div>
              </div>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50"><th className="text-left p-2 text-xs font-semibold">Description</th><th className="text-right p-2 text-xs font-semibold">Qty</th><th className="text-right p-2 text-xs font-semibold">Price</th><th className="text-right p-2 text-xs font-semibold">Total</th></tr></thead>
                <tbody>
                  {viewItem.items.map((item, idx) => (
                    <tr key={idx} className="border-t"><td className="p-2">{item.description}</td><td className="p-2 text-right">{item.qty}</td><td className="p-2 text-right font-mono">Ksh {item.unitPrice.toLocaleString()}</td><td className="p-2 text-right font-mono">Ksh {item.total.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="w-48 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-mono">Ksh {viewItem.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">VAT ({viewItem.vat}%)</span><span className="font-mono">Ksh {viewItem.vatAmount.toLocaleString()}</span></div>
                {viewItem.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="font-mono text-success">-Ksh {viewItem.discount.toLocaleString()}</span></div>}
                <Separator />
                <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono">Ksh {viewItem.totalAmount.toLocaleString()}</span></div>
              </div>
            </div>
            {viewItem.paidDate && (
              <p className="text-xs text-muted-foreground text-center">Paid on {viewItem.paidDate} via {viewItem.paymentMethod}</p>
            )}
          </div>
        </ModalForm>
      )}
    </div>
  );
}
