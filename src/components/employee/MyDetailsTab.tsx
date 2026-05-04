import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useStaff } from "@/data/staffStore";

// In a real app this would come from auth — for the demo we use the first active employee
export default function MyDetailsTab() {
  const staff = useStaff();
  const me = staff.find(s => s.status === "active") || staff[0];
  if (!me) return null;

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
              {me.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <p className="mt-3 font-semibold">{me.name}</p>
            <p className="text-xs text-muted-foreground">{me.role} — {me.department}</p>
            <Badge variant="outline" className="mt-2">{me.id}</Badge>
            <div className="mt-2"><StatusBadge status={me.status} /></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {me.email}</div>
            <div><span className="text-muted-foreground">Phone:</span> {me.phone}</div>
            <div><span className="text-muted-foreground">ID Number:</span> {me.idNumber || "—"}</div>
            <div><span className="text-muted-foreground">Location:</span> {me.location || "—"}</div>
            <div><span className="text-muted-foreground">Department:</span> {me.department}</div>
            <div><span className="text-muted-foreground">Joined:</span> {me.joinDate}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle className="text-base">Statutory & Bank Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">KRA PIN:</span> {me.kraPin || "—"}</div>
            <div><span className="text-muted-foreground">NHIF/SHIF:</span> {me.nhifNo || "—"}</div>
            <div><span className="text-muted-foreground">NSSF:</span> {me.nssfNo || "—"}</div>
            <div><span className="text-muted-foreground">Bank:</span> {me.bankName || "—"}</div>
            <div className="col-span-2"><span className="text-muted-foreground">Account:</span> {me.bankAccount || "—"}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {me.emergencyContact || "—"}</div>
            <div><span className="text-muted-foreground">Phone:</span> {me.emergencyPhone || "—"}</div>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">To request changes to any of your details, contact HR.</p>
    </div>
  );
}
