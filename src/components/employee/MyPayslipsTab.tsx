import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Payslip {
  id: string;
  month: string;
  period: string;
  basicSalary: number;
  houseAllowance: number;
  transportAllowance: number;
  overtimePay: number;
  grossPay: number;
  nhif: number;
  nssf: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  paidOn: string;
}

const fmt = (n: number) => `Ksh ${n.toLocaleString()}`;

const mockPayslips: Payslip[] = [
  { id: "PS-001", month: "2026-03", period: "March 2026", basicSalary: 35000, houseAllowance: 5000, transportAllowance: 3000, overtimePay: 2000, grossPay: 45000, nhif: 1700, nssf: 2160, paye: 5400, otherDeductions: 0, totalDeductions: 9260, netPay: 35740, status: "paid", paidOn: "2026-03-28" },
  { id: "PS-002", month: "2026-02", period: "February 2026", basicSalary: 35000, houseAllowance: 5000, transportAllowance: 3000, overtimePay: 0, grossPay: 43000, nhif: 1700, nssf: 2160, paye: 5100, otherDeductions: 500, totalDeductions: 9460, netPay: 33540, status: "paid", paidOn: "2026-02-27" },
  { id: "PS-003", month: "2026-01", period: "January 2026", basicSalary: 35000, houseAllowance: 5000, transportAllowance: 3000, overtimePay: 1500, grossPay: 44500, nhif: 1700, nssf: 2160, paye: 5300, otherDeductions: 0, totalDeductions: 9160, netPay: 35340, status: "paid", paidOn: "2026-01-29" },
  { id: "PS-004", month: "2026-04", period: "April 2026", basicSalary: 35000, houseAllowance: 5000, transportAllowance: 3000, overtimePay: 0, grossPay: 43000, nhif: 1700, nssf: 2160, paye: 5100, otherDeductions: 0, totalDeductions: 8960, netPay: 34040, status: "processing", paidOn: "" },
];

const columns: Column<Payslip>[] = [
  { key: "period", label: "Pay Period", sortable: true },
  { key: "grossPay", label: "Gross Pay", render: (i) => fmt(i.grossPay) },
  { key: "totalDeductions", label: "Deductions", render: (i) => <span className="text-destructive">{fmt(i.totalDeductions)}</span> },
  { key: "netPay", label: "Net Pay", render: (i) => <span className="font-bold">{fmt(i.netPay)}</span> },
  { key: "status", label: "Status", render: (i) => <StatusBadge status={i.status} /> },
  { key: "paidOn", label: "Paid On", render: (i) => i.paidOn || "—" },
];

const filterOpts: FilterOption[] = [
  { key: "status", label: "Status", options: [{ label: "Paid", value: "paid" }, { label: "Processing", value: "processing" }] },
];

export default function MyPayslipsTab() {
  const [viewing, setViewing] = useState<Payslip | null>(null);

  const handleDownload = (payslip: Payslip) => {
    const content = [
      "══════════════════════════════════════",
      "         ISMS PAY STATEMENT          ",
      "══════════════════════════════════════",
      "",
      `Pay Period: ${payslip.period}`,
      `Payslip ID: ${payslip.id}`,
      `Date Paid: ${payslip.paidOn || "Pending"}`,
      "",
      "─── EARNINGS ───────────────────────",
      `Basic Salary:        ${fmt(payslip.basicSalary)}`,
      `House Allowance:     ${fmt(payslip.houseAllowance)}`,
      `Transport Allowance: ${fmt(payslip.transportAllowance)}`,
      `Overtime Pay:        ${fmt(payslip.overtimePay)}`,
      `                     ─────────────`,
      `GROSS PAY:           ${fmt(payslip.grossPay)}`,
      "",
      "─── DEDUCTIONS ─────────────────────",
      `NHIF:                ${fmt(payslip.nhif)}`,
      `NSSF:                ${fmt(payslip.nssf)}`,
      `PAYE:                ${fmt(payslip.paye)}`,
      `Other Deductions:    ${fmt(payslip.otherDeductions)}`,
      `                     ─────────────`,
      `TOTAL DEDUCTIONS:    ${fmt(payslip.totalDeductions)}`,
      "",
      "══════════════════════════════════════",
      `NET PAY:             ${fmt(payslip.netPay)}`,
      "══════════════════════════════════════",
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payslip-${payslip.month}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Payslip for ${payslip.period} downloaded`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Payslips</h3>
          <p className="text-sm text-muted-foreground">View and download your monthly pay statements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Latest Net Pay</p>
          <p className="text-2xl font-bold">{fmt(mockPayslips[0].netPay)}</p>
          <p className="text-xs text-muted-foreground">{mockPayslips[0].period}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">YTD Gross</p>
          <p className="text-2xl font-bold">{fmt(mockPayslips.filter(p => p.status === "paid").reduce((s, p) => s + p.grossPay, 0))}</p>
          <p className="text-xs text-muted-foreground">Year to date</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">YTD Deductions</p>
          <p className="text-2xl font-bold text-destructive">{fmt(mockPayslips.filter(p => p.status === "paid").reduce((s, p) => s + p.totalDeductions, 0))}</p>
          <p className="text-xs text-muted-foreground">Year to date</p>
        </div>
      </div>

      <DataTable data={mockPayslips} columns={columns} searchKeys={["period", "id"]} searchPlaceholder="Search payslips..." filters={filterOpts} onView={(item) => setViewing(item)} />

      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Payslip Details" isView>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">{viewing.period}</Badge>
              <StatusBadge status={viewing.status} />
            </div>

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
                <span className="text-muted-foreground">NHIF</span><span className="text-right">{fmt(viewing.nhif)}</span>
                <span className="text-muted-foreground">NSSF</span><span className="text-right">{fmt(viewing.nssf)}</span>
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
              <Button onClick={() => handleDownload(viewing)} size="sm">
                <Download className="h-4 w-4 mr-2" /> Download
              </Button>
            </div>

            {viewing.paidOn && <p className="text-xs text-muted-foreground text-center">Paid on {viewing.paidOn}</p>}
          </div>
        )}
      </ModalForm>
    </div>
  );
}
