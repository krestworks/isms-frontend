import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { hrApi, ApiPayroll } from "@/lib/hrApi";
import { BrandedDocHeader } from "@/components/shared/BrandedDocHeader";
import { nssfTier1, nssfTier2 } from "@/lib/payrollCalc";
import { openPdfInNewTab, downloadPdf } from "@/lib/pdfDoc";
import { toast } from "sonner";

const fmt = (n: number) => `Ksh ${n.toLocaleString()}`;

const fmtPeriod = (month: string) => {
  const [y, m] = month.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
};

const columns: Column<ApiPayroll>[] = [
  { key: "month",          label: "Pay Period",  sortable: true, render: r => fmtPeriod(r.month) },
  { key: "grossPay",       label: "Gross Pay",   render: r => fmt(r.grossPay) },
  { key: "totalDeductions", label: "Deductions", render: r => <span className="text-destructive">{fmt(r.totalDeductions)}</span> },
  { key: "netPay",         label: "Net Pay",     render: r => <span className="font-bold">{fmt(r.netPay)}</span> },
  { key: "status",         label: "Status",      render: r => <StatusBadge status={r.status} /> },
  { key: "payDate",        label: "Paid On",     render: r => r.payDate || "—" },
];

const filterOpts: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Processing", value: "processing" }] },
];

export default function MyPayslipsTab() {
  const [payslips, setPayslips] = useState<ApiPayroll[]>([]);
  const [loading, setLoading]   = useState(true);
  const [viewing, setViewing]   = useState<ApiPayroll | null>(null);

  useEffect(() => {
    hrApi.self.payroll.list({ limit: 60 })
      .then(res => setPayslips(res.data ?? []))
      .catch((e: any) => toast.error(e?.message || "Failed to load payslips"))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = (p: ApiPayroll) => {
    downloadPdf(`/hr/self/payroll/${p.id}/pdf`, `payslip-${p.month}.pdf`)
      .then(() => toast.success(`Payslip for ${fmtPeriod(p.month)} downloaded`))
      .catch((e: any) => toast.error(e?.message || "Failed to download payslip"));
  };
  const handlePrint = (p: ApiPayroll) => {
    openPdfInNewTab(`/hr/self/payroll/${p.id}/pdf`)
      .catch((e: any) => toast.error(e?.message || "Failed to open payslip"));
  };

  const paid   = payslips.filter(p => p.status === "paid");
  const latest = payslips[0];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Payslips</h3>
        <p className="text-sm text-muted-foreground">View and download your monthly pay statements</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading payslips...</div>
      ) : payslips.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">No payslips on record yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Latest Net Pay</p>
              <p className="text-2xl font-bold">{latest ? fmt(latest.netPay) : "—"}</p>
              <p className="text-xs text-muted-foreground">{latest ? fmtPeriod(latest.month) : ""}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">YTD Gross</p>
              <p className="text-2xl font-bold">{fmt(paid.reduce((s, p) => s + p.grossPay, 0))}</p>
              <p className="text-xs text-muted-foreground">Year to date</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">YTD Deductions</p>
              <p className="text-2xl font-bold text-destructive">{fmt(paid.reduce((s, p) => s + p.totalDeductions, 0))}</p>
              <p className="text-xs text-muted-foreground">Year to date</p>
            </div>
          </div>

          <DataTable data={payslips} columns={columns} searchKeys={["month"]} searchPlaceholder="Search payslips..." filters={filterOpts} onView={setViewing} />
        </>
      )}

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Payslip Details" isView>
        {viewing && (
          <div className="space-y-4">
            <BrandedDocHeader
              docTitle="PAYSLIP"
              docDate={fmtPeriod(viewing.month)}
              docRef={`${viewing.employee?.employeeNumber ?? "—"}/${viewing.month}`}
              hideLogo
            />
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">{fmtPeriod(viewing.month)}</Badge>
              <StatusBadge status={viewing.status} />
            </div>

            {viewing.employee?.kraPin && (
              <div className="text-xs text-muted-foreground font-mono">KRA PIN: {viewing.employee.kraPin}</div>
            )}

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">EARNINGS</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Basic Salary</span><span className="text-right">{fmt(viewing.basicSalary)}</span>
                <span className="text-muted-foreground">House Allowance</span><span className="text-right">{fmt(viewing.houseAllowance)}</span>
                <span className="text-muted-foreground">Transport Allowance</span><span className="text-right">{fmt(viewing.transportAllowance)}</span>
                <span className="text-muted-foreground">Overtime Pay</span><span className="text-right">{fmt(viewing.overtimePay)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-sm">
                <span>Gross Pay</span><span>{fmt(viewing.grossPay)}</span>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground">DEDUCTIONS</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">SHIF</span><span className="text-right">{fmt(viewing.nhif)}</span>
                <span className="text-muted-foreground">NSSF Tier I</span><span className="text-right">{fmt(nssfTier1(viewing.nssf, viewing.grossPay))}</span>
                <span className="text-muted-foreground">NSSF Tier II</span><span className="text-right">{fmt(nssfTier2(viewing.nssf, viewing.grossPay))}</span>
                <span className="text-muted-foreground">PAYE</span><span className="text-right">{fmt(viewing.paye)}</span>
                <span className="text-muted-foreground">Other</span><span className="text-right">{fmt(viewing.otherDeductions)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-semibold text-sm text-destructive">
                <span>Total Deductions</span><span>{fmt(viewing.totalDeductions)}</span>
              </div>
            </div>

            <div className="rounded-lg bg-primary/10 p-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Net Pay</p>
                <p className="text-2xl font-bold">{fmt(viewing.netPay)}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handlePrint(viewing)} size="sm">
                  <Printer className="h-4 w-4 mr-2" /> Print
                </Button>
                <Button onClick={() => handleDownload(viewing)} size="sm">
                  <Download className="h-4 w-4 mr-2" /> Download
                </Button>
              </div>
            </div>

            {viewing.payDate && <p className="text-xs text-muted-foreground text-center">Paid on {viewing.payDate}</p>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
