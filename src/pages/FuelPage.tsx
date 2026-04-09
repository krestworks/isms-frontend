import { Fuel } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function FuelPage() {
  return (
    <ModulePageShell title="Fuel Management" description="Tank monitoring, pump sales, reconciliation" icon={Fuel} />
  );
}
