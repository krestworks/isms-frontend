import { Users } from "lucide-react";
import { ModulePageShell } from "@/components/layout/ModulePageShell";

export default function ClientsPage() {
  return (
    <ModulePageShell title="Clients" description="Client management, orders, coupons" icon={Users} />
  );
}
