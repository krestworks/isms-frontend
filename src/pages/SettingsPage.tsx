import { Settings } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function SettingsPage() {
  return (
    <ModulePageShell title="Settings" description="Currency, VAT, business details, RBAC" icon={Settings} />
  );
}
