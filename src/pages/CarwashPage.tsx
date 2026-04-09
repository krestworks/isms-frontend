import { Car } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function CarwashPage() {
  return (
    <ModulePageShell title="Car Wash" description="Vehicle queue, wash packages, daily sales" icon={Car} />
  );
}
