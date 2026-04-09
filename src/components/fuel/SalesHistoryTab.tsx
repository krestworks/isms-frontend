import { useState } from "react";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Label } from "@/components/ui/label";

interface SaleRecord {
  id: string;
  date: string;
  receiptNo: string;
  customer: string;
  fuelType: string;
  litres: number;
  unitPrice: number;
  amount: number;
  discount: number;
  netAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  attendant: string;
  pumpNumber: number;
}

const initialData: SaleRecord[] = Array.from({ length: 25 }, (_, i) => {
  const fuels = ["Super", "Diesel", "Kerosene", "V-Power"];
  const payments = ["Cash", "M-Pesa", "Card", "Invoice"];
  const customers = ["Walk-in", "KenTrans Ltd", "SafariCom Fleet", "John Kamau", "Matatu SACCO", "Jane Muthoni", "Quick Deliveries"];
  const attendants = ["James Ochieng", "Mary Wanjiku", "Peter Mutua", "Grace Akinyi"];
  const statuses = ["paid", "paid", "paid", "pending", "paid"];
  const fuel = fuels[i % fuels.length];
  const prices: Record<string, number> = { Super: 179.5, Diesel: 165, Kerosene: 155, "V-Power": 195 };
  const litres = [20, 30, 45, 50, 80, 100, 120, 200][i % 8];
  const unitPrice = prices[fuel];
  const amount = litres * unitPrice;
  const discount = i % 7 === 0 ? 500 : 0;
  const day = 9 - Math.floor(i / 4);
  return {
    id: `SH${String(i + 1).padStart(3, "0")}`,
    date: `2026-04-${String(Math.max(1, day)).padStart(2, "0")}`,
    receiptNo: `R-${10450 + i + 1}`,
    customer: customers[i % customers.length],
    fuelType: fuel,
    litres,
    unitPrice,
    amount,
    discount,
    netAmount: amount - discount,
    paymentMethod: payments[i % payments.length],
    paymentStatus: statuses[i % statuses.length],
    attendant: attendants[i % attendants.length],
    pumpNumber: (i % 4) + 1,
  };
});

export function SalesHistoryTab() {
  const [viewItem, setViewItem] = useState<SaleRecord | null>(null);

  const columns: Column<SaleRecord>[] = [
    { key: "receiptNo", label: "Receipt #", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "customer", label: "Customer", sortable: true },
    { key: "fuelType", label: "Fuel", sortable: true },
    { key: "litres", label: "Litres", sortable: true, render: (s) => s.litres.toLocaleString() },
    { key: "netAmount", label: "Amount (Ksh)", sortable: true, render: (s) => <span className="font-mono">Ksh {s.netAmount.toLocaleString()}</span> },
    { key: "paymentMethod", label: "Payment" },
    { key: "paymentStatus", label: "Status", render: (s) => <StatusBadge status={s.paymentStatus} /> },
    { key: "attendant", label: "Attendant" },
  ];

  const filters: FilterOption[] = [
    { key: "fuelType", label: "Fuel Type", options: [{ label: "Super", value: "Super" }, { label: "Diesel", value: "Diesel" }, { label: "Kerosene", value: "Kerosene" }, { label: "V-Power", value: "V-Power" }] },
    { key: "paymentStatus", label: "Payment Status", options: [{ label: "Paid", value: "paid" }, { label: "Pending", value: "pending" }] },
    { key: "paymentMethod", label: "Payment Method", options: [{ label: "Cash", value: "Cash" }, { label: "M-Pesa", value: "M-Pesa" }, { label: "Card", value: "Card" }, { label: "Invoice", value: "Invoice" }] },
  ];

  const totalRevenue = initialData.reduce((s, r) => s + r.netAmount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Complete sales transaction history</p>
          <p className="text-xs text-primary font-semibold mt-1">Total Revenue: Ksh {totalRevenue.toLocaleString()}</p>
        </div>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1.5" />Export</Button>
      </div>

      <DataTable
        data={initialData}
        columns={columns}
        searchKeys={["receiptNo", "customer", "attendant", "fuelType"]}
        searchPlaceholder="Search sales history..."
        filters={filters}
        actions={(s) => (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(s)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
      />

      {viewItem && (
        <ModalForm open onClose={() => setViewItem(null)} title="Sale Details" isView>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-muted-foreground text-xs">Receipt #</Label><p className="font-mono text-sm">{viewItem.receiptNo}</p></div>
            <div><Label className="text-muted-foreground text-xs">Date</Label><p className="text-sm">{viewItem.date}</p></div>
            <div><Label className="text-muted-foreground text-xs">Customer</Label><p className="text-sm">{viewItem.customer}</p></div>
            <div><Label className="text-muted-foreground text-xs">Attendant</Label><p className="text-sm">{viewItem.attendant}</p></div>
            <div><Label className="text-muted-foreground text-xs">Fuel Type</Label><p className="text-sm">{viewItem.fuelType}</p></div>
            <div><Label className="text-muted-foreground text-xs">Pump</Label><p className="text-sm">Pump {viewItem.pumpNumber}</p></div>
            <div><Label className="text-muted-foreground text-xs">Litres</Label><p className="text-sm font-mono">{viewItem.litres}</p></div>
            <div><Label className="text-muted-foreground text-xs">Unit Price</Label><p className="text-sm font-mono">Ksh {viewItem.unitPrice}</p></div>
            <div><Label className="text-muted-foreground text-xs">Gross Amount</Label><p className="text-sm font-mono">Ksh {viewItem.amount.toLocaleString()}</p></div>
            <div><Label className="text-muted-foreground text-xs">Discount</Label><p className="text-sm font-mono">Ksh {viewItem.discount.toLocaleString()}</p></div>
            <div><Label className="text-muted-foreground text-xs">Net Amount</Label><p className="text-sm font-mono font-bold">Ksh {viewItem.netAmount.toLocaleString()}</p></div>
            <div><Label className="text-muted-foreground text-xs">Payment</Label><p className="text-sm">{viewItem.paymentMethod} · <StatusBadge status={viewItem.paymentStatus} /></p></div>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
