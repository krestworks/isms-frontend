import { Calculator } from "lucide-react";
import PayrollCalculatorTabs from "@/components/hr/PayrollCalculatorTabs";

export default function PublicPayrollCalculatorPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Kenya Payroll Calculator</h1>
            <p className="text-xs text-muted-foreground">Statutory deductions — SHA · NSSF · PAYE</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-5">
          <PayrollCalculatorTabs />
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center mt-4 px-2">
          Calculations are based on Kenya Revenue Authority (KRA) rates: SHA 2.75%, NSSF 6% (tiered),
          PAYE graduated bands with Ksh 2,400 personal relief. Rates may change — verify with KRA or a
          qualified payroll professional before making payroll decisions.
        </p>
      </main>
    </div>
  );
}
