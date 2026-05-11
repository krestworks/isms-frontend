import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useStaffByDepartment, StaffRecord } from "@/data/staffStore";
import { isLocationVisible } from "@/lib/permissions";
import { sessionStore, useSession } from "@/data/sessionStore";

interface Props {
  department: string;
}

const columns: Column<StaffRecord>[] = [
  { key: "id", label: "Emp ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "role", label: "Role" },
  { key: "phone", label: "Phone" },
  { key: "location", label: "Location", render: s => s.location || "—" },
  { key: "joinDate", label: "Joined", sortable: true },
  { key: "status", label: "Status", render: s => <StatusBadge status={s.status} /> },
];

export function ModuleStaffTab({ department }: Props) {
  useSession();
  const all = useStaffByDepartment(department);
  const data = all.filter(s => isLocationVisible(s.location));
  const filters: FilterOption[] = [
    { key: "role", label: "Role", options: Array.from(new Set(data.map(d => d.role))).map(r => ({ label: r, value: r })) },
    { key: "status", label: "Status", options: ["active", "onboarding", "inactive"].map(s => ({ label: s, value: s })) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{department} Staff</h3>
          <p className="text-sm text-muted-foreground">Sourced from HR onboarding — manage all staff in HR Management</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link to="/hr"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Manage in HR</Link></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: data.length, color: "" },
          { label: "Active", value: data.filter(d => d.status === "active").length, color: "text-green-600" },
          { label: "Onboarding", value: data.filter(d => d.status === "onboarding").length, color: "text-amber-600" },
          { label: "Inactive", value: data.filter(d => d.status === "inactive").length, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>
        ))}
      </div>

      <DataTable data={data} columns={columns} searchKeys={["name", "id", "phone"]} searchPlaceholder="Search staff..." filters={filters} />
    </div>
  );
}

export default ModuleStaffTab;
