import { DollarSign } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function FinancePage() {
  return (
    <ModulePageShell title="Revenue & Finance" description="All-station revenue, expenses, P&L" icon={DollarSign} />
  );
}
