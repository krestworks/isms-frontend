import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Eye, Ban, Printer, TrendingUp, ShoppingBag, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizSale, ApiBizSaleItem } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";

interface Props { business: ApiBizBusiness; }

const today       = () => new Date().toISOString().split("T")[0];
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };

const PAY_COLORS: Record<string, string> = {
  Cash:          "bg-green-100 text-green-700 border-green-200",
  "M-Pesa":      "bg-emerald-100 text-emerald-700 border-emerald-200",
  Card:          "bg-blue-100 text-blue-700 border-blue-200",
  Credit:        "bg-amber-100 text-amber-700 border-amber-200",
};

function exportSalesCsv(records: ApiBizSale[], from: string, to: string) {
  const rows = [
    ["Ref", "Date", "Cashier", "Items", "Subtotal", "Discount", "Tax", "Total", "Payment", "Paid", "Change", "Status"].join(","),
    ...records.map(s => [
      s.saleRef, s.date, s.cashier ?? "",
      (s.items ?? []).length,
      s.subtotal, s.discount, s.taxAmount, s.totalAmount,
      s.paymentMethod, s.amountPaid, s.change, s.status,
    ].join(",")),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sales-${from}-to-${to}.csv`;
  a.click();
}

export function SalesTab({ business }: Props) {
  const can = usePermissions();
  const canVoid = can("business.pos.void");

  const [records,   setRecords]   = useState<ApiBizSale[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [fromDate,  setFromDate]  = useState(firstOfMonth());
  const [toDate,    setToDate]    = useState(today());
  const [viewing,   setViewing]   = useState<ApiBizSale | null>(null);
  const [pendingVoidSale, setPendingVoidSale] = useState<ApiBizSale | null>(null);
  const [requestingVoid, setRequestingVoid]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bizApi.sales.list(business.id, { from: fromDate, to: toDate });
      setRecords(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load sales"); }
    finally { setLoading(false); }
  }, [business.id, fromDate, toDate]);

  useEffect(() => { load(); }, [load]);

  const handleVoid = (s: ApiBizSale) => setPendingVoidSale(s);

  const requestVoid = async () => {
    if (!pendingVoidSale) return;
    setRequestingVoid(true);
    try {
      await bizApi.sales.void(pendingVoidSale.id);
      toast.success("Void requested — a different user must approve it before it takes effect");
      setPendingVoidSale(null);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to request void"); }
    finally { setRequestingVoid(false); }
  };

  const activeSales  = records.filter(s => s.status !== "void");
  const totalRevenue = activeSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalTax     = activeSales.reduce((sum, s) => sum + s.taxAmount, 0);
  const avgOrder     = activeSales.length ? totalRevenue / activeSales.length : 0;

  const columns: Column<ApiBizSale>[] = [
    { key: "saleRef",       label: "Ref",     render: s => <span className="font-mono text-xs">{s.saleRef}</span> },
    { key: "date",          label: "Date",    sortable: true },
    { key: "items",         label: "Items",   render: s => `${(s.items ?? []).length} item${(s.items ?? []).length !== 1 ? "s" : ""}` },
    { key: "totalAmount",   label: "Total",   render: s => <span className="font-bold">Ksh {s.totalAmount.toLocaleString()}</span>, sortable: true },
    { key: "paymentMethod", label: "Payment", render: s => (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PAY_COLORS[s.paymentMethod] ?? "bg-muted text-foreground"}`}>
        {s.paymentMethod}
      </span>
    )},
    { key: "cashier",       label: "Cashier", render: s => s.cashier || "—" },
    { key: "status",        label: "Status",  render: s => (
      <Badge variant={s.status === "void" ? "secondary" : "default"} className="text-xs">
        {s.status}
      </Badge>
    )},
  ];

  const filters: FilterOption[] = [
    { key: "paymentMethod", label: "Payment", options: ["Cash","M-Pesa","Card","Credit"].map(v => ({ label: v, value: v })) },
    { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Void", value: "void" }] },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Transactions",  value: activeSales.length,                  sub: "active sales",   icon: ShoppingBag,  color: "text-primary" },
          { label: "Revenue",       value: `Ksh ${totalRevenue.toLocaleString()}`, sub: "incl. tax",   icon: TrendingUp,   color: "text-green-600" },
          { label: "Tax Collected", value: `Ksh ${totalTax.toLocaleString()}`,  sub: `${business.taxRate}% VAT`, icon: CreditCard, color: "text-amber-600" },
          { label: "Avg Order",     value: `Ksh ${Math.round(avgOrder).toLocaleString()}`, sub: "per transaction", icon: TrendingUp, color: "text-blue-600" },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Actions */}
      <div className="flex items-end gap-3 flex-wrap">
        <div><Label className="text-xs">From</Label><Input type="date" className="h-8 text-xs w-36" value={fromDate} onChange={e => setFromDate(e.target.value)} /></div>
        <div><Label className="text-xs">To</Label><Input type="date" className="h-8 text-xs w-36" value={toDate} onChange={e => setToDate(e.target.value)} /></div>
        <Button size="sm" variant="outline" onClick={load}>Apply</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportSalesCsv(records, fromDate, toDate)}>
            Export CSV
          </Button>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <DataTable
        data={records} columns={columns} filters={filters}
        searchKeys={["saleRef","cashier"]} searchPlaceholder="Search by ref or cashier..."
        onView={s => setViewing(s)}
        extraActions={canVoid ? [{
          label: "Void",
          icon: Ban,
          onClick: handleVoid,
          show: (s: ApiBizSale) => s.status !== "void",
        }] : []}
      />

      <DangerConfirmModal
        open={!!pendingVoidSale}
        title={`Request void for sale ${pendingVoidSale?.saleRef}?`}
        description="This requests approval to void the sale and restore stock. A different user with permission must approve it before it takes effect."
        confirmLabel="Request Void"
        loading={requestingVoid}
        onConfirm={requestVoid}
        onCancel={() => setPendingVoidSale(null)}
      />

      {/* View Sale Modal */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Sale Details" isView>
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
              <div><span className="text-muted-foreground text-xs">Ref</span><p className="font-mono font-semibold">{viewing.saleRef}</p></div>
              <div><span className="text-muted-foreground text-xs">Date</span><p>{viewing.date}</p></div>
              <div><span className="text-muted-foreground text-xs">Cashier</span><p>{viewing.cashier || "—"}</p></div>
              <div><span className="text-muted-foreground text-xs">Payment</span>
                <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full border font-medium ${PAY_COLORS[viewing.paymentMethod] ?? "bg-muted"}`}>{viewing.paymentMethod}</span>
              </div>
            </div>

            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2 text-muted-foreground font-medium">Item</th>
                    <th className="text-right p-2 text-muted-foreground font-medium">Qty</th>
                    <th className="text-right p-2 text-muted-foreground font-medium">Unit Price</th>
                    <th className="text-right p-2 text-muted-foreground font-medium">Discount</th>
                    <th className="text-right p-2 text-muted-foreground font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewing.items ?? []).map((item: ApiBizSaleItem, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{item.name}</td>
                      <td className="p-2 text-right">{item.qty}</td>
                      <td className="p-2 text-right">Ksh {item.unitPrice.toLocaleString()}</td>
                      <td className="p-2 text-right">{item.discount > 0 ? `- Ksh ${item.discount.toLocaleString()}` : "—"}</td>
                      <td className="p-2 text-right font-semibold">Ksh {item.totalPrice.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 p-3 bg-muted/30 rounded-lg text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>Ksh {viewing.subtotal.toLocaleString()}</span></div>
              {viewing.discount > 0 && <div className="flex justify-between text-green-600"><span>Order Discount</span><span>− Ksh {viewing.discount.toLocaleString()}</span></div>}
              {viewing.taxAmount > 0 && <div className="flex justify-between text-muted-foreground"><span>Tax ({viewing.taxRate}%)</span><span>Ksh {viewing.taxAmount.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-sm border-t pt-1"><span>Total</span><span>Ksh {viewing.totalAmount.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>Ksh {viewing.amountPaid.toLocaleString()}</span></div>
              {viewing.change > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Change</span><span>Ksh {viewing.change.toLocaleString()}</span></div>}
            </div>
            {viewing.status === "void" && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
                <Ban className="h-3.5 w-3.5" /> This sale was voided
              </div>
            )}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
