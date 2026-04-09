import { Flame } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function LpgPage() {
  return (
    <ModulePageShell title="LPG Management" description="Cylinder inventory, sales, refills, suppliers" icon={Flame} />
  );
}
