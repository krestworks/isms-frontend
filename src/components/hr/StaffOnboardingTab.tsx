import { useEffect, useState } from "react";
import { Plus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { hrApi, ApiEmployee, ApiDepartment, ApiJobTitle, ApiStation } from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";

const EMPLOYMENT_TYPES = ["FullTime", "PartTime", "Contract", "Intern"];
const CONTRACT_TYPES = ["Permanent", "Fixed-Term", "Casual"];
const GENDERS = ["Male", "Female", "Other"];
const KE_BANKS = ["Equity Bank", "KCB", "Co-op Bank", "NCBA", "Stanbic", "Absa", "I&M Bank", "DTB", "Family Bank"];

const emptyForm = {
  name: "", email: "", phone: "",
  stationId: "", departmentId: "", jobTitleId: "",
  employmentType: "FullTime", contractType: "Permanent",
  startDate: "", endDate: "",
  nationalId: "", dateOfBirth: "", gender: "",
  address: "", kraPin: "", nhifNo: "", nssfNo: "",
  bankName: "", bankAccount: "",
  emergencyContactName: "", emergencyContactPhone: "",
  salaryGrade: "", basicSalary: "",
  notes: "",
};

type FormState = typeof emptyForm;

function formatName(emp: ApiEmployee) { return emp.user?.name || "—"; }

export default function StaffOnboardingTab() {
  const [data, setData] = useState<ApiEmployee[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<ApiStation[]>([]);
  const [depts, setDepts] = useState<ApiDepartment[]>([]);
  const [jobTitles, setJobTitles] = useState<ApiJobTitle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEmployee | null>(null);
  const [viewing, setViewing] = useState<ApiEmployee | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<ApiEmployee | null>(null);
  const [terminateNote, setTerminateNote] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);

  const can = usePermissions();
  const canCreate = can("hr.staff.create");
  const canEdit = can("hr.staff.edit");
  const canTerminate = can("hr.staff.terminate");

  const load = async () => {
    setLoading(true);
    try {
      const r = await hrApi.employees.list({ limit: 100 });
      setData(r.data);
      setTotal(r.meta.total);
    } catch (e: any) { toast.error(e?.message || "Failed to load employees"); }
    finally { setLoading(false); }
  };

  const loadSetupData = async () => {
    const [s, d, jt] = await Promise.allSettled([
      hrApi.stations.list(),
      hrApi.departments.list(),
      hrApi.jobTitles.list(),
    ]);
    if (s.status === "fulfilled") setStations(s.value.data);
    if (d.status === "fulfilled") setDepts(d.value.data);
    if (jt.status === "fulfilled") setJobTitles(jt.value.data);
  };

  useEffect(() => { load(); loadSetupData(); }, []);

  const set = (field: keyof FormState, value: string) => setForm(f => ({ ...f, [field]: value }));

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, startDate: new Date().toISOString().split("T")[0], stationId: stations[0]?.id || "" });
    setModalOpen(true);
  };

  const openEdit = (emp: ApiEmployee) => {
    setEditing(emp);
    const ec = emp.emergencyContact;
    const bd = emp.bankDetails;
    setForm({
      name: emp.user.name, email: emp.user.email, phone: emp.user.phone || "",
      stationId: emp.stationId, departmentId: emp.departmentId || "", jobTitleId: emp.jobTitleId || "",
      employmentType: emp.employmentType, contractType: emp.contractType || "Permanent",
      startDate: emp.startDate?.split("T")[0] || "", endDate: emp.endDate?.split("T")[0] || "",
      nationalId: emp.nationalId || "", dateOfBirth: emp.dateOfBirth?.split("T")[0] || "",
      gender: emp.gender || "", address: emp.address || "",
      kraPin: "", nhifNo: "", nssfNo: "",
      bankName: bd?.bankName || "", bankAccount: bd?.accountNo || "",
      emergencyContactName: ec?.name || "", emergencyContactPhone: ec?.phone || "",
      salaryGrade: emp.salaryGrade || "", basicSalary: emp.basicSalary ? String(emp.basicSalary) : "",
      notes: "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await hrApi.employees.update(editing.id, {
          stationId: form.stationId || undefined,
          departmentId: form.departmentId || null,
          jobTitleId: form.jobTitleId || null,
          employmentType: form.employmentType,
          contractType: form.contractType || null,
          startDate: form.startDate || undefined,
          endDate: form.endDate || null,
          nationalId: form.nationalId || null,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender || null,
          address: form.address || null,
          emergencyContact: form.emergencyContactName
            ? { name: form.emergencyContactName, phone: form.emergencyContactPhone }
            : null,
          bankDetails: form.bankName ? { bankName: form.bankName, accountNo: form.bankAccount } : null,
          salaryGrade: form.salaryGrade || null,
          basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : null,
        });
        toast.success("Employee updated");
      } else {
        await hrApi.employees.create({
          name: form.name, email: form.email, phone: form.phone || undefined,
          stationId: form.stationId,
          departmentId: form.departmentId || undefined,
          jobTitleId: form.jobTitleId || undefined,
          employmentType: form.employmentType,
          contractType: form.contractType || undefined,
          startDate: form.startDate,
          endDate: form.endDate || undefined,
          nationalId: form.nationalId || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          address: form.address || undefined,
          emergencyContact: form.emergencyContactName
            ? { name: form.emergencyContactName, phone: form.emergencyContactPhone }
            : undefined,
          bankDetails: form.bankName ? { bankName: form.bankName, accountNo: form.bankAccount } : undefined,
          salaryGrade: form.salaryGrade || undefined,
          basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : undefined,
        });
        toast.success("Employee onboarded successfully");
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      const fieldErrors: { field: string; message: string }[] = (e as any).data?.errors;
      if (fieldErrors?.length) {
        fieldErrors.forEach(fe => toast.error(`${fe.field}: ${fe.message}`));
      } else {
        toast.error(e.message || "Failed to save");
      }
    }
  };

  const handleTerminate = async () => {
    if (!terminateTarget) return;
    try {
      await hrApi.employees.terminate(terminateTarget.id, { note: terminateNote || undefined });
      toast.success(`${formatName(terminateTarget)} has been terminated`);
      setTerminateTarget(null);
      setTerminateNote("");
      load();
    } catch (e: any) { toast.error(e.message || "Failed to terminate"); }
  };

  const columns: Column<ApiEmployee>[] = [
    { key: "employeeNumber", label: "Emp #", sortable: true },
    { key: "user", label: "Full Name", sortable: true, render: e => formatName(e) },
    { key: "department", label: "Department", render: e => e.department ? <Badge variant="outline">{e.department.name}</Badge> : <span className="text-muted-foreground">—</span> },
    { key: "jobTitle", label: "Job Title", render: e => e.jobTitle?.title || "—" },
    { key: "employmentType", label: "Type", render: e => <Badge variant="secondary">{e.employmentType}</Badge> },
    { key: "startDate", label: "Start Date", sortable: true, render: e => e.startDate?.split("T")[0] || "—" },
    { key: "status", label: "Status", render: e => <StatusBadge status={e.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "status", label: "Status", options: [{ label: "Active", value: "Active" }, { label: "Terminated", value: "Terminated" }, { label: "On Leave", value: "OnLeave" }] },
    { key: "employmentType", label: "Type", options: EMPLOYMENT_TYPES.map(t => ({ label: t, value: t })) },
  ];

  const stats = {
    total,
    active: data.filter(d => d.status === "Active").length,
    onLeave: data.filter(d => d.status === "OnLeave").length,
    terminated: data.filter(d => d.status === "Terminated").length,
  };

  const stationName = (id: string) => stations.find(s => s.id === id)?.name || id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Staff Onboarding</h3>
          <p className="text-sm text-muted-foreground">Central employee registry</p>
        </div>
        {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: stats.total, color: "" },
          { label: "Active", value: stats.active, color: "text-green-600" },
          { label: "On Leave", value: stats.onLeave, color: "text-amber-600" },
          { label: "Terminated", value: stats.terminated, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchKeys={["employeeNumber"]}
        searchPlaceholder="Search by employee number…"
        filters={filters}
        onView={e => setViewing(e)}
        onEdit={canEdit ? openEdit : undefined}
        actions={canTerminate ? (e) => (
          e.status !== "Terminated"
            ? <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { setTerminateTarget(e); setTerminateNote(""); }}>
                <UserX className="h-3.5 w-3.5 mr-1" /> Terminate
              </Button>
            : null
        ) : undefined}
      />

      {/* Create / Edit modal */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? `Edit — ${formatName(editing)}` : "Onboard New Employee"}
        description="Employee profile will be created and linked to a user account"
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Onboard"}>
        <div className="space-y-5">
          {!editing && (
            <>
              <p className="text-sm font-semibold text-muted-foreground">Account Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input value={form.name} onChange={e => set("name", e.target.value)} /></div>
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => set("email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="07XX XXX XXX" /></div>
              </div>
            </>
          )}

          <p className="text-sm font-semibold text-muted-foreground pt-2">Employment Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Station / Location *</Label>
              <Select value={form.stationId || "none"} onValueChange={v => set("stationId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select —</SelectItem>
                  {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label>
              <Select value={form.departmentId || "none"} onValueChange={v => set("departmentId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Job Title</Label>
              <Select value={form.jobTitleId || "none"} onValueChange={v => set("jobTitleId", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {jobTitles.filter(jt => !form.departmentId || jt.departmentId === form.departmentId || !jt.departmentId).map(jt => (
                    <SelectItem key={jt.id} value={jt.id}>{jt.title}{jt.grade ? ` (${jt.grade})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={v => set("employmentType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Contract Type</Label>
              <Select value={form.contractType} onValueChange={v => set("contractType", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONTRACT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></div>
            <div><Label>End Date (contract)</Label><Input type="date" value={form.endDate} onChange={e => set("endDate", e.target.value)} /></div>
            <div><Label>Salary Grade</Label><Input value={form.salaryGrade} onChange={e => set("salaryGrade", e.target.value)} placeholder="e.g. G5" /></div>
            <div><Label>Basic Salary (KES)</Label><Input type="number" value={form.basicSalary} onChange={e => set("basicSalary", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Personal Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>National ID</Label><Input value={form.nationalId} onChange={e => set("nationalId", e.target.value)} /></div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} /></div>
            <div><Label>Gender</Label>
              <Select value={form.gender || "none"} onValueChange={v => set("gender", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Select —</SelectItem>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Statutory & Bank Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>KRA PIN</Label><Input value={form.kraPin} onChange={e => set("kraPin", e.target.value)} placeholder="A001234567B" /></div>
            <div><Label>NHIF / SHIF No.</Label><Input value={form.nhifNo} onChange={e => set("nhifNo", e.target.value)} /></div>
            <div><Label>NSSF No.</Label><Input value={form.nssfNo} onChange={e => set("nssfNo", e.target.value)} /></div>
            <div><Label>Bank</Label>
              <Select value={form.bankName || "none"} onValueChange={v => set("bankName", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {KE_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Account No.</Label><Input value={form.bankAccount} onChange={e => set("bankAccount", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Emergency Contact</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={form.emergencyContactName} onChange={e => set("emergencyContactName", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.emergencyContactPhone} onChange={e => set("emergencyContactPhone", e.target.value)} /></div>
          </div>
        </div>
      </ModalForm>

      {/* View modal */}
      <ModalForm open={!!viewing} onClose={() => setViewing(null)} title="Employee Details" isView>
        {viewing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-sm">{viewing.employeeNumber}</Badge>
              <StatusBadge status={viewing.status} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> {formatName(viewing)}</div>
              <div><span className="text-muted-foreground">Email:</span> {viewing.user.email}</div>
              <div><span className="text-muted-foreground">Phone:</span> {viewing.user.phone || "—"}</div>
              <div><span className="text-muted-foreground">Station:</span> {stationName(viewing.stationId)}</div>
              <div><span className="text-muted-foreground">Department:</span> {viewing.department?.name || "—"}</div>
              <div><span className="text-muted-foreground">Job Title:</span> {viewing.jobTitle?.title || "—"}</div>
              <div><span className="text-muted-foreground">Type:</span> {viewing.employmentType}</div>
              <div><span className="text-muted-foreground">Start:</span> {viewing.startDate?.split("T")[0]}</div>
              <div><span className="text-muted-foreground">National ID:</span> {viewing.nationalId || "—"}</div>
              <div><span className="text-muted-foreground">Gender:</span> {viewing.gender || "—"}</div>
              <div><span className="text-muted-foreground">Basic Salary:</span> {viewing.basicSalary ? `KES ${Number(viewing.basicSalary).toLocaleString()}` : "—"}</div>
              <div><span className="text-muted-foreground">Grade:</span> {viewing.salaryGrade || "—"}</div>
              {viewing.emergencyContact && (
                <div className="col-span-2"><span className="text-muted-foreground">Emergency:</span> {viewing.emergencyContact.name} ({viewing.emergencyContact.phone})</div>
              )}
              {viewing.terminationNote && (
                <div className="col-span-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
                  Terminated {viewing.terminatedAt?.split("T")[0]} — {viewing.terminationNote}
                </div>
              )}
            </div>
          </div>
        )}
      </ModalForm>

      {/* Terminate confirmation */}
      <ModalForm open={!!terminateTarget} onClose={() => setTerminateTarget(null)}
        title={`Terminate — ${terminateTarget ? formatName(terminateTarget) : ""}`}
        description="This action deactivates the employee's account. It cannot be undone from the UI."
        onSubmit={handleTerminate} submitLabel="Confirm Termination"
        submitVariant="destructive">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Employee: <strong>{terminateTarget ? formatName(terminateTarget) : ""}</strong> ({terminateTarget?.employeeNumber})</p>
          <div><Label>Termination Reason / Note</Label>
            <Textarea value={terminateNote} onChange={e => setTerminateNote(e.target.value)} placeholder="Reason for termination..." />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
