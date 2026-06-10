import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { hrApi, ApiEmployee } from "@/lib/hrApi";
import { sessionStore, useSession } from "@/data/sessionStore";
import { stationsCache } from "@/data/stationsCache";
import { toast } from "sonner";

interface Props {
  department: string;
}

const columns: Column<ApiEmployee>[] = [
  { key: "employeeNumber", label: "Emp ID",   sortable: true },
  { key: "user",          label: "Name",      sortable: true, render: e => e.user.name },
  { key: "jobTitle",      label: "Role",      render: e => e.jobTitle?.title ?? "—" },
  { key: "department",    label: "Department", render: e => e.department?.name ?? "—" },
  { key: "startDate",     label: "Joined",    sortable: true, render: e => new Date(e.startDate).toLocaleDateString() },
  { key: "status",        label: "Status",    render: e => <StatusBadge status={e.status} /> },
];

export function ModuleStaffTab({ department }: Props) {
  useSession();
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const activeLoc = sessionStore.activeLocation();
      const stations  = stationsCache.all();
      const station   = activeLoc === "All Locations"
        ? undefined
        : stations.find(s => s.name === activeLoc);

      const res = await hrApi.employees.list({
        ...(station ? { stationId: station.id } : {}),
        limit: 200,
      } as any);

      const all = res.data ?? [];
      // Filter to employees whose department name matches the module department
      const filtered = department
        ? all.filter(e => e.department?.name?.toLowerCase() === department.toLowerCase())
        : all;

      setEmployees(filtered);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => { load(); }, [load]);

  const filters: FilterOption[] = [
    {
      key: "status",
      label: "Status",
      options: ["Active", "Inactive", "Terminated"].map(s => ({ label: s, value: s })),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{department} Staff</h3>
          <p className="text-sm text-muted-foreground">Sourced from HR — manage all staff in HR Management</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/hr"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Manage in HR</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total",        value: employees.length,                                                color: "" },
          { label: "Active",       value: employees.filter(e => e.status === "Active").length,             color: "text-green-600" },
          { label: "Inactive",     value: employees.filter(e => e.status === "Inactive").length,           color: "text-amber-600" },
          { label: "Terminated",   value: employees.filter(e => e.status === "Terminated").length,         color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading staff...</div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No staff in the {department} department. Onboard employees in{" "}
            <Link to="/hr" className="underline">HR Management</Link>.
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={employees}
          columns={columns}
          searchKeys={["employeeNumber"]}
          searchPlaceholder="Search staff..."
          filters={filters}
        />
      )}
    </div>
  );
}

export default ModuleStaffTab;
