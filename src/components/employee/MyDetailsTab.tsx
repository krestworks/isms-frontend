import { useMyEmployee } from "@/lib/useMyEmployee";
import { useSession } from "@/data/sessionStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";

function NotOnboarded() {
  return (
    <Card>
      <CardContent className="p-10 text-center space-y-2">
        <p className="font-semibold text-lg">Employee profile not set up</p>
        <p className="text-sm text-muted-foreground">
          Contact HR to link your account to an employee record before using the Employee Portal.
        </p>
      </CardContent>
    </Card>
  );
}

export default function MyDetailsTab() {
  const { user } = useSession();
  const { employee, loading, error } = useMyEmployee();

  if (loading) return <div className="p-8 text-center text-muted-foreground text-sm">Loading your details...</div>;
  if (!employee && !error) return <NotOnboarded />;
  if (error)   return <p className="text-destructive text-sm p-4">{error}</p>;
  if (!employee) return <NotOnboarded />;

  const emergency = employee.emergencyContact as { name?: string; phone?: string; relation?: string } | null;
  const bank = employee.bankDetails as { bankName?: string; accountNo?: string; branchCode?: string } | null;
  const initials = user.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">My Details</h3>
        <p className="text-sm text-muted-foreground">Your personal & employment information on file</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center text-2xl font-bold text-primary">
              {initials}
            </div>
            <p className="mt-3 font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {employee.jobTitle?.title ?? user.activeRole} — {employee.department?.name ?? "—"}
            </p>
            <Badge variant="outline" className="mt-2">{employee.employeeNumber}</Badge>
            <div className="mt-2"><StatusBadge status={employee.status} /></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
            <div><span className="text-muted-foreground">Phone:</span> {employee.user.phone || "—"}</div>
            <div><span className="text-muted-foreground">National ID:</span> {employee.nationalId || "—"}</div>
            <div><span className="text-muted-foreground">Gender:</span> {employee.gender || "—"}</div>
            <div><span className="text-muted-foreground">Department:</span> {employee.department?.name || "—"}</div>
            <div><span className="text-muted-foreground">Job Title:</span> {employee.jobTitle?.title || "—"}</div>
            <div><span className="text-muted-foreground">Joined:</span> {new Date(employee.startDate).toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Employment:</span> {employee.employmentType}</div>
            <div><span className="text-muted-foreground">Location:</span> {user.homeLocation || "—"}</div>
            {employee.salaryGrade && <div><span className="text-muted-foreground">Grade:</span> {employee.salaryGrade}</div>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Bank Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Bank:</span> {bank?.bankName || "—"}</div>
            <div><span className="text-muted-foreground">Branch Code:</span> {bank?.branchCode || "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Account No.:</span> {bank?.accountNo || "—"}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {emergency?.name || "—"}</div>
            <div><span className="text-muted-foreground">Phone:</span> {emergency?.phone || "—"}</div>
            <div><span className="text-muted-foreground">Relation:</span> {emergency?.relation || "—"}</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">To request changes to any of your details, contact HR.</p>
    </div>
  );
}
