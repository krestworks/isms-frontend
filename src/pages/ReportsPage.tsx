import { FileText } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function ReportsPage() {
  return (
    <ModulePageShell title="Reports" description="Variance analysis, scheduled reports, exports" icon={FileText} />
  );
}
