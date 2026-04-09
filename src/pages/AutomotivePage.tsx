import { Wrench } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function AutomotivePage() {
  return (
    <ModulePageShell title="Automotive Services" description="Service records, technician assignment, billing" icon={Wrench} />
  );
}
