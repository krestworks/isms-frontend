import { useCallback, useEffect, useState } from "react";
import { Plus, UserX, RotateCcw, Trash2, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { hrApi, ApiEmployee, ApiDepartment, ApiJobTitle, ApiStation } from "@/lib/hrApi";
import { bizApi, ApiBizBusiness } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";

const BASE_WORK_MODULES = ["Fuel", "LPG", "Water", "Car Wash", "Automotive", "Inventory", "Finance", "HR"];

const EMPLOYMENT_TYPES = ["FullTime", "PartTime", "Contract", "Intern"];
const CONTRACT_TYPES = ["Permanent", "Fixed-Term", "Casual"];
const GENDERS = ["Male", "Female", "Other"];
const PAYMENT_METHODS = [
  { value: "Cash",        label: "Cash" },
  { value: "MobileMoney", label: "M-Pesa / Mobile Money" },
  { value: "Bank",        label: "Bank Transfer" },
];
const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Relative", "Other"];

// CBK-approved Kenyan bank codes
const KE_BANKS = [
  { code: "01", name: "Kenya Commercial Bank (KCB)" },
  { code: "02", name: "Standard Chartered Bank" },
  { code: "03", name: "Absa Bank Kenya" },
  { code: "07", name: "NCBA Bank" },
  { code: "10", name: "Prime Bank" },
  { code: "11", name: "Co-operative Bank of Kenya" },
  { code: "12", name: "National Bank of Kenya" },
  { code: "14", name: "Oriental Commercial Bank" },
  { code: "16", name: "Citibank N.A." },
  { code: "18", name: "Middle East Bank Kenya" },
  { code: "19", name: "Bank of Africa Kenya" },
  { code: "20", name: "Equity Bank" },
  { code: "23", name: "Consolidated Bank of Kenya" },
  { code: "25", name: "Credit Bank" },
  { code: "26", name: "Transnational Bank" },
  { code: "31", name: "I&M Bank" },
  { code: "35", name: "African Banking Corporation" },
  { code: "37", name: "Ecobank Kenya" },
  { code: "39", name: "Family Bank" },
  { code: "43", name: "Diamond Trust Bank (DTB)" },
  { code: "49", name: "Stanbic Bank Kenya" },
  { code: "51", name: "Gulf African Bank" },
  { code: "53", name: "Victoria Commercial Bank" },
  { code: "55", name: "First Community Bank" },
  { code: "57", name: "UBA Kenya Bank" },
  { code: "61", name: "Sidian Bank" },
  { code: "63", name: "Kingdom Bank" },
  { code: "70", name: "Access Bank Kenya" },
  { code: "72", name: "Salaam Bank" },
  { code: "74", name: "DIB Bank Kenya" },
];

const LS_KEY = "hr_onboarding_form";

const emptyForm = {
  name: "", email: "", phone: "",
  stationId: "", departmentId: "", jobTitleId: "",
  employmentType: "FullTime", contractType: "Permanent",
  startDate: "", endDate: "",
  nationalId: "", dateOfBirth: "", gender: "",
  address: "", kraPin: "", shaNo: "", nssfNo: "",
  paymentMethod: "Cash",
  bankCode: "", bankName: "", bankAccount: "", bankBranch: "",
  mobileProvider: "", mobileNumber: "",
  emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelation: "",
  salaryGrade: "", basicSalary: "",
  workModules: [] as string[],
};

type FormState = typeof emptyForm;

function formatName(emp: ApiEmployee) { return (emp.user?.name ?? emp.name) || emp.user?.email || "—"; }

function loadPersistedForm(): FormState {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return { ...emptyForm, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return emptyForm;
}

function persistForm(form: FormState) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(form)); } catch { /* ignore */ }
}

export default function StaffOnboardingTab() {
  const [data, setData] = useState<ApiEmployee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("__all__");
  const [filterDept, setFilterDept] = useState("__all__");
  const [filterType, setFilterType] = useState("__all__");
  const [loading, setLoading] = useState(true);
  const [stations, setStations] = useState<ApiStation[]>([]);
  const [depts, setDepts] = useState<ApiDepartment[]>([]);
  const [jobTitles, setJobTitles] = useState<ApiJobTitle[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ApiEmployee | null>(null);
  const [viewing, setViewing] = useState<ApiEmployee | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<ApiEmployee | null>(null);
  const [terminateNote, setTerminateNote] = useState("");
  const [reactivateTarget, setReactivateTarget] = useState<ApiEmployee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiEmployee | null>(null);
  const [form, setForm] = useState<FormState>(loadPersistedForm);
  const [branches, setBranches] = useState<{ code: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const [stationBusinesses, setStationBusinesses] = useState<ApiBizBusiness[]>([]);

  const can = usePermissions();
  const canCreate = can("hr.staff.create");
  const canEdit = can("hr.staff.edit");
  const canTerminate = can("hr.staff.terminate");

  const PAGE_LIMIT = 50;

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, limit: PAGE_LIMIT };
      if (filterStatus !== "__all__")  params.status         = filterStatus;
      if (filterDept   !== "__all__")  params.departmentId   = filterDept;
      if (filterType   !== "__all__")  params.employmentType = filterType;
      const r = await hrApi.employees.list(params as any);
      setData(r.data ?? []);
      setTotal(r.meta?.total ?? 0);
      setPage(r.meta?.page ?? 1);
      setTotalPages(r.meta?.pages ?? 1);
    } catch (e: any) { toast.error(e?.message || "Failed to load employees"); }
    finally { setLoading(false); }
  }, [filterStatus, filterDept, filterType]);

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

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { loadSetupData(); }, []);

  // Fetch the businesses actually enabled at the selected station — module
  // assignment offers these specific businesses instead of a generic "POS"
  // catch-all, and scoping to the station is enforced here (only businesses
  // belonging to this exact station are ever shown/selectable).
  useEffect(() => {
    if (!modalOpen || !form.stationId) { setStationBusinesses([]); return; }
    bizApi.businesses.list(form.stationId)
      .then(res => setStationBusinesses(res.data ?? []))
      .catch(() => setStationBusinesses([]));
  }, [modalOpen, form.stationId]);

  const set = (field: keyof FormState, value: any) => {
    setForm(f => {
      const nf = { ...f, [field]: value };
      persistForm(nf);
      return nf;
    });
  };

  const loadBranches = async (bankCode: string) => {
    if (!bankCode) { setBranches([]); return; }
    setBranchesLoading(true);
    try {
      const res = await hrApi.banks.branches(bankCode);
      setBranches(res.data ?? []);
    } catch { setBranches([]); }
    finally { setBranchesLoading(false); }
  };

  const openNew = () => {
    setEditing(null);
    const nf = { ...emptyForm, startDate: new Date().toISOString().split("T")[0], stationId: stations[0]?.id || "" };
    setForm(nf);
    persistForm(nf);
    setModalOpen(true);
  };

  const openEdit = (emp: ApiEmployee) => {
    setEditing(emp);
    const ec  = typeof emp.emergencyContact === "string" ? JSON.parse(emp.emergencyContact) : emp.emergencyContact;
    const bd  = typeof emp.bankDetails === "string" ? JSON.parse(emp.bankDetails) : emp.bankDetails;
    const bank = KE_BANKS.find(b => b.code === bd?.bankCode || b.name === bd?.bankName);
    const pm   = emp.paymentMethod || bd?.paymentMethod || "Cash";
    const bankCode = bank?.code || bd?.bankCode || "";
    const nf: FormState = {
      name: (emp.user?.name ?? emp.name) || "", email: emp.user?.email || "", phone: emp.user?.phone || "",
      stationId: emp.stationId, departmentId: emp.department?.id || emp.departmentId || "", jobTitleId: emp.jobTitle?.id || emp.jobTitleId || "",
      employmentType: emp.employmentType, contractType: emp.contractType || "Permanent",
      startDate: emp.startDate?.split("T")[0] || "", endDate: emp.endDate?.split("T")[0] || "",
      nationalId: emp.nationalId || "", dateOfBirth: emp.dateOfBirth?.split("T")[0] || "",
      gender: emp.gender || "", address: emp.address || "",
      kraPin: emp.kraPin || "", shaNo: emp.shaNo || "", nssfNo: emp.nssfNo || "",
      paymentMethod: pm,
      bankCode, bankName: bd?.bankName || bank?.name || "",
      bankAccount: bd?.accountNo || "",
      bankBranch: bd?.branchCode || "",
      mobileProvider: pm === "MobileMoney" ? (bd?.provider || "") : "",
      mobileNumber:   pm === "MobileMoney" ? (bd?.accountNo || "") : "",
      emergencyContactName: ec?.name || "", emergencyContactPhone: ec?.phone || "",
      emergencyContactRelation: ec?.relation || "",
      salaryGrade: emp.salaryGrade || "", basicSalary: emp.basicSalary ? String(emp.basicSalary) : "",
      workModules: emp.workModules ?? [],
    };
    setForm(nf);
    if (bankCode) loadBranches(bankCode);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.phone?.trim())        return toast.error("Phone number is required");
    if (!form.basicSalary)          return toast.error("Basic salary is required");
    if (parseFloat(form.basicSalary) <= 0) return toast.error("Basic salary must be greater than 0");
    if (!form.paymentMethod)        return toast.error("Payment method is required");
    try {
      const bank = KE_BANKS.find(b => b.code === form.bankCode);
      const bankDetails = form.paymentMethod === "MobileMoney" && form.mobileNumber
        ? { provider: form.mobileProvider || "MPesa", accountNo: form.mobileNumber, paymentMethod: "MobileMoney" }
        : form.paymentMethod === "Bank" && form.bankAccount
          ? { bankCode: form.bankCode, bankName: bank?.name || form.bankName, accountNo: form.bankAccount, branchCode: form.bankBranch || undefined, paymentMethod: "Bank" }
          : null;
      const emergencyContact = form.emergencyContactName
        ? { name: form.emergencyContactName, phone: form.emergencyContactPhone, relation: form.emergencyContactRelation || undefined }
        : null;

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
          kraPin: form.kraPin || null,
          shaNo: form.shaNo || null,
          nssfNo: form.nssfNo || null,
          paymentMethod: form.paymentMethod || null,
          emergencyContact,
          bankDetails,
          salaryGrade: form.salaryGrade || null,
          basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : null,
          workModules: form.workModules?.length ? form.workModules : null,
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
          kraPin: form.kraPin || undefined,
          shaNo: form.shaNo || undefined,
          nssfNo: form.nssfNo || undefined,
          paymentMethod: form.paymentMethod || undefined,
          emergencyContact: emergencyContact || undefined,
          bankDetails: bankDetails || undefined,
          salaryGrade: form.salaryGrade || undefined,
          basicSalary: form.basicSalary ? parseFloat(form.basicSalary) : undefined,
          workModules: form.workModules?.length ? form.workModules : undefined,
        } as any);
        toast.success("Employee onboarded successfully");
      }
      setModalOpen(false);
      localStorage.removeItem(LS_KEY);
      load();
    } catch (e: any) {
      const fieldErrors: { field: string; message: string }[] = (e as any).data?.errors;
      if (fieldErrors?.length) fieldErrors.forEach(fe => toast.error(`${fe.field}: ${fe.message}`));
      else toast.error(e.message || "Failed to save");
    }
  };

  const handleTerminate = async () => {
    if (!terminateTarget) return;
    try {
      await hrApi.employees.terminate(terminateTarget.id, { note: terminateNote || undefined });
      toast.success(`${formatName(terminateTarget)} has been terminated`);
      setTerminateTarget(null);
      setTerminateNote("");
      load(page);
    } catch (e: any) { toast.error(e.message || "Failed to terminate"); }
  };

  const handleReactivate = async () => {
    if (!reactivateTarget) return;
    try {
      await hrApi.employees.reactivate(reactivateTarget.id);
      toast.success(`${formatName(reactivateTarget)} has been reactivated`);
      setReactivateTarget(null);
      load(page);
    } catch (e: any) { toast.error(e.message || "Failed to reactivate"); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await hrApi.employees.remove(deleteTarget.id);
      toast.success(`${formatName(deleteTarget)} permanently deleted`);
      setDeleteTarget(null);
      load(page);
    } catch (e: any) { toast.error(e.message || "Failed to delete"); }
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

  const hasFilters = filterStatus !== "__all__" || filterDept !== "__all__" || filterType !== "__all__";
  const clearFilters = () => { setFilterStatus("__all__"); setFilterDept("__all__"); setFilterType("__all__"); setPage(1); };

  const stats = {
    total,
    active:     data.filter(d => d.status === "Active").length,
    onLeave:    data.filter(d => d.status === "OnLeave").length,
    terminated: data.filter(d => d.status === "Terminated").length,
  };

  const stationName = (id: string) => stations.find(s => s.id === id)?.name || id;
  const showBankFields = form.paymentMethod === "Bank";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Staff Onboarding</h3>
          <p className="text-sm text-muted-foreground">Central employee registry · {total} employees</p>
        </div>
        {canCreate && <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add Employee</Button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Staff",  value: stats.total,      color: "" },
          { label: "Active",       value: stats.active,     color: "text-green-600" },
          { label: "On Leave",     value: stats.onLeave,    color: "text-amber-600" },
          { label: "Terminated",   value: stats.terminated, color: "text-destructive" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? "…" : s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inline filter form */}
      <div className="flex flex-wrap gap-3 items-end p-3 bg-muted/30 rounded-lg border">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="OnLeave">On Leave</SelectItem>
              <SelectItem value="Terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Department</Label>
          <Select value={filterDept} onValueChange={v => { setFilterDept(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="All departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All departments</SelectItem>
              {depts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Employment Type</Label>
          <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <button className="text-xs text-muted-foreground hover:text-foreground underline self-end pb-1" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      <DataTable
        data={data}
        columns={columns}
        searchKeys={["employeeNumber", "name", "user.name", "user.email", "user.phone", "nationalId"]}
        searchPlaceholder="Search by name, employee number, email or phone…"
        pageSize={25}
        onView={e => setViewing(e)}
        onEdit={canEdit ? (e => e.status !== "Terminated" ? openEdit(e) : undefined) : undefined}
        actions={canTerminate ? (e) => (
          <div className="flex gap-1">
            {e.status !== "Terminated" && (
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { setTerminateTarget(e); setTerminateNote(""); }}>
                <UserX className="h-3.5 w-3.5 mr-1" /> Terminate
              </Button>
            )}
            {e.status === "Terminated" && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700" onClick={() => setReactivateTarget(e)}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reactivate
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => setDeleteTarget(e)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </>
            )}
          </div>
        ) : undefined}
      />

      {/* Server-side pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <span>{total} employees · Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => load(page - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => load(page + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? `Edit — ${formatName(editing)}` : "Onboard New Employee"}
        description={editing ? "Update employee profile and statutory details" : "Employee profile will be created and linked to a user account"}
        onSubmit={handleSave} submitLabel={editing ? "Update" : "Onboard"}>
        <div className="space-y-5">

          {/* Account info — show for new, read-only for edit */}
          <p className="text-sm font-semibold text-muted-foreground">Account Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Full Name {!editing && "*"}</Label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} readOnly={!!editing} className={editing ? "bg-muted/40" : ""} />
            </div>
            <div>
              <Label>Email {!editing && "*"}</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} readOnly={!!editing} className={editing ? "bg-muted/40" : ""} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="07XX XXX XXX" readOnly={!!editing} className={editing ? "bg-muted/40" : ""} />
            </div>
            {editing && <p className="col-span-2 text-xs text-muted-foreground">Name, email and phone are managed from the User Settings.</p>}
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Employment Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Station / Location *</Label>
              <Select value={form.stationId || "_none_"} onValueChange={v => set("stationId", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select station" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select —</SelectItem>
                  {stations.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Department</Label>
              <Select value={form.departmentId || "_none_"} onValueChange={v => set("departmentId", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— None —</SelectItem>
                  {depts.filter(d => !form.stationId || d.stationId === form.stationId || d.stationId === "global").map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Job Title</Label>
              <Select value={form.jobTitleId || "_none_"} onValueChange={v => set("jobTitleId", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— None —</SelectItem>
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

          <p className="text-sm font-semibold text-muted-foreground pt-2">Module Assignment</p>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Select which modules this employee works in (independent of HR department)</Label>
            <div className="flex flex-wrap gap-2">
              {BASE_WORK_MODULES.map(mod => {
                const active = form.workModules?.includes(mod);
                return (
                  <button key={mod} type="button"
                    onClick={() => {
                      const next = active
                        ? (form.workModules ?? []).filter((m: string) => m !== mod)
                        : [...(form.workModules ?? []), mod];
                      set("workModules", next);
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"}`}>
                    {mod}
                  </button>
                );
              })}
            </div>
            {/* Specific businesses at this station — replaces a generic "POS" catch-all
                so an attendant is assigned to (and can only see) the exact business
                they work in, e.g. "Mart" but not "Pharmacy". */}
            <Label className="text-xs text-muted-foreground mt-3 mb-2 block">
              Business assignment {!form.stationId && "(select a station first)"}
            </Label>
            <div className="flex flex-wrap gap-2">
              {stationBusinesses.length === 0 && form.stationId && (
                <span className="text-xs text-muted-foreground">No businesses enabled at this station yet.</span>
              )}
              {stationBusinesses.map(biz => {
                const active = form.workModules?.includes(biz.name);
                return (
                  <button key={biz.id} type="button"
                    onClick={() => {
                      const next = active
                        ? (form.workModules ?? []).filter((m: string) => m !== biz.name)
                        : [...(form.workModules ?? []), biz.name];
                      set("workModules", next);
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"}`}>
                    {biz.name}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Personal Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>National ID</Label><Input value={form.nationalId} onChange={e => set("nationalId", e.target.value)} /></div>
            <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={e => set("dateOfBirth", e.target.value)} /></div>
            <div><Label>Gender</Label>
              <Select value={form.gender || "_none_"} onValueChange={v => set("gender", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select —</SelectItem>
                  {GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => set("address", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Statutory Details</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>KRA PIN</Label><Input value={form.kraPin} onChange={e => set("kraPin", e.target.value)} placeholder="A001234567B" /></div>
            <div><Label>SHA No. (Social Health Authority)</Label><Input value={form.shaNo} onChange={e => set("shaNo", e.target.value)} placeholder="SHA number" /></div>
            <div><Label>NSSF No.</Label><Input value={form.nssfNo} onChange={e => set("nssfNo", e.target.value)} /></div>
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Payment Method</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Payment Method</Label>
              <Select value={form.paymentMethod || "Cash"} onValueChange={v => {
                setForm(f => {
                  const nf = { ...f, paymentMethod: v };
                  persistForm(nf); return nf;
                });
                if (v !== "Bank") { setBranches([]); }
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Mobile Money fields */}
            {form.paymentMethod === "MobileMoney" && (
              <>
                <div><Label>Mobile Provider</Label>
                  <Select value={form.mobileProvider || "_none_"} onValueChange={v => set("mobileProvider", v === "_none_" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Select Provider —</SelectItem>
                      <SelectItem value="MPesa">Safaricom M-Pesa</SelectItem>
                      <SelectItem value="AirtelMoney">Airtel Money</SelectItem>
                      <SelectItem value="TKash">Telkom T-Kash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Mobile Number</Label>
                  <Input value={form.mobileNumber} onChange={e => set("mobileNumber", e.target.value)} placeholder="e.g. 0712345678" />
                </div>
              </>
            )}

            {/* Bank Transfer fields */}
            {showBankFields && (
              <>
                <div><Label>Bank</Label>
                  <Select value={form.bankCode || "_none_"} onValueChange={v => {
                    const bank = KE_BANKS.find(b => b.code === v);
                    setForm(f => {
                      const nf = { ...f, bankCode: v === "_none_" ? "" : v, bankName: bank?.name || "", bankBranch: "" };
                      persistForm(nf); return nf;
                    });
                    setBranchQuery(""); setBranchOpen(false);
                    if (v !== "_none_") loadBranches(v);
                    else setBranches([]);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Select Bank —</SelectItem>
                      {KE_BANKS.map(b => <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Account Number</Label><Input value={form.bankAccount} onChange={e => set("bankAccount", e.target.value)} /></div>
                <div><Label>Branch Code</Label>
                  <Popover open={branchOpen} onOpenChange={setBranchOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" disabled={!form.bankCode}
                        className="w-full justify-between font-normal text-left h-9">
                        <span className={form.bankBranch ? "" : "text-muted-foreground"}>
                          {form.bankBranch
                            ? `${form.bankBranch}${branches.find(b => b.code === form.bankBranch) ? ` — ${branches.find(b => b.code === form.bankBranch)!.name}` : ""}`
                            : (form.bankCode ? "Search or type branch code…" : "Select a bank first")}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[340px]" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Search by name or enter code…"
                          value={branchQuery}
                          onValueChange={setBranchQuery}
                        />
                        <CommandList>
                          {branchesLoading && <p className="py-3 text-center text-xs text-muted-foreground">Loading…</p>}
                          {/* Allow entering a custom code not in the list */}
                          {branchQuery && !branches.some(b => b.code === branchQuery) && (
                            <CommandGroup heading="Enter directly">
                              <CommandItem
                                value={`__custom__${branchQuery}`}
                                onSelect={() => {
                                  const nf = { ...form, bankBranch: branchQuery };
                                  setForm(nf); persistForm(nf);
                                  setBranchOpen(false); setBranchQuery("");
                                }}>
                                <Check className="mr-2 h-4 w-4 opacity-0" />
                                Use "<strong>{branchQuery}</strong>" as branch code
                              </CommandItem>
                            </CommandGroup>
                          )}
                          {branches.length > 0 && (
                            <CommandGroup heading="Known branches">
                              {branches
                                .filter(b =>
                                  !branchQuery ||
                                  b.code.includes(branchQuery) ||
                                  b.name.toLowerCase().includes(branchQuery.toLowerCase())
                                )
                                .map(b => (
                                  <CommandItem key={b.code} value={`${b.code} ${b.name}`}
                                    onSelect={() => {
                                      const nf = { ...form, bankBranch: b.code };
                                      setForm(nf); persistForm(nf);
                                      setBranchOpen(false); setBranchQuery("");
                                    }}>
                                    <Check className={`mr-2 h-4 w-4 ${form.bankBranch === b.code ? "opacity-100" : "opacity-0"}`} />
                                    {b.code} — {b.name}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          )}
                          {!branchesLoading && branches.length === 0 && !branchQuery && (
                            <p className="py-3 text-center text-xs text-muted-foreground">Type to enter branch code from employee's bank statement</p>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground mt-1">Branch code is on the employee's bank statement/card. Type to search suggestions or enter the code directly.</p>
                </div>
              </>
            )}
          </div>

          <p className="text-sm font-semibold text-muted-foreground pt-2">Emergency Contact / Next of Kin</p>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={form.emergencyContactName} onChange={e => set("emergencyContactName", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.emergencyContactPhone} onChange={e => set("emergencyContactPhone", e.target.value)} /></div>
            <div><Label>Relationship</Label>
              <Select value={form.emergencyContactRelation || "_none_"} onValueChange={v => set("emergencyContactRelation", v === "_none_" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">— Select —</SelectItem>
                  {RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
              <div><span className="text-muted-foreground">Email:</span> {viewing.user?.email || "—"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {viewing.user?.phone || "—"}</div>
              <div><span className="text-muted-foreground">Station:</span> {stationName(viewing.stationId)}</div>
              <div><span className="text-muted-foreground">Department:</span> {viewing.department?.name || "—"}</div>
              <div><span className="text-muted-foreground">Job Title:</span> {viewing.jobTitle?.title || "—"}</div>
              <div><span className="text-muted-foreground">Type:</span> {viewing.employmentType}</div>
              <div><span className="text-muted-foreground">Start:</span> {viewing.startDate?.split("T")[0]}</div>
              <div><span className="text-muted-foreground">National ID:</span> {viewing.nationalId || "—"}</div>
              <div><span className="text-muted-foreground">Gender:</span> {viewing.gender || "—"}</div>
              <div><span className="text-muted-foreground">KRA PIN:</span> {viewing.kraPin || "—"}</div>
              <div><span className="text-muted-foreground">SHA No.:</span> {viewing.shaNo || "—"}</div>
              <div><span className="text-muted-foreground">NSSF No.:</span> {viewing.nssfNo || "—"}</div>
              <div><span className="text-muted-foreground">Payment:</span> {viewing.paymentMethod || "—"}</div>
              <div><span className="text-muted-foreground">Basic Salary:</span> {viewing.basicSalary ? `KES ${Number(viewing.basicSalary).toLocaleString()}` : "—"}</div>
              <div><span className="text-muted-foreground">Grade:</span> {viewing.salaryGrade || "—"}</div>
              {viewing.workModules && viewing.workModules.length > 0 && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Modules: </span>
                  {viewing.workModules.map((m: string) => (
                    <span key={m} className="inline-block mr-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{m}</span>
                  ))}
                </div>
              )}
              {viewing.bankDetails && viewing.paymentMethod === "MobileMoney" && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Mobile Money:</span>{" "}
                  {(viewing.bankDetails as any).provider || "M-Pesa"} — {(viewing.bankDetails as any).accountNo}
                </div>
              )}
              {viewing.bankDetails && viewing.paymentMethod === "Bank" && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Bank:</span> {(viewing.bankDetails as any).bankName} — A/C: {(viewing.bankDetails as any).accountNo}
                  {(viewing.bankDetails as any).branchCode && <span className="text-muted-foreground"> · Branch: {(viewing.bankDetails as any).branchCode}</span>}
                </div>
              )}
              {viewing.emergencyContact && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Emergency:</span> {viewing.emergencyContact.name}
                  {viewing.emergencyContact.relation && ` (${viewing.emergencyContact.relation})`}
                  {" — "}{viewing.emergencyContact.phone}
                </div>
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
        description="This action deactivates the employee's account."
        onSubmit={handleTerminate} submitLabel="Confirm Termination"
        submitVariant="destructive">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Employee: <strong>{terminateTarget ? formatName(terminateTarget) : ""}</strong> ({terminateTarget?.employeeNumber})</p>
          <div><Label>Termination Reason / Note</Label>
            <Textarea value={terminateNote} onChange={e => setTerminateNote(e.target.value)} placeholder="Reason for termination..." />
          </div>
        </div>
      </ModalForm>

      {/* Reactivate confirmation */}
      <ModalForm open={!!reactivateTarget} onClose={() => setReactivateTarget(null)}
        title={`Reactivate — ${reactivateTarget ? formatName(reactivateTarget) : ""}`}
        description="This will restore the employee's account to Active status."
        onSubmit={handleReactivate} submitLabel="Confirm Reactivation">
        <p className="text-sm text-muted-foreground">
          Employee <strong>{reactivateTarget ? formatName(reactivateTarget) : ""}</strong> ({reactivateTarget?.employeeNumber}) will be set back to Active and their user login will be re-enabled.
        </p>
      </ModalForm>

      {/* Delete confirmation */}
      <ModalForm open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        title={`Delete — ${deleteTarget ? formatName(deleteTarget) : ""}`}
        description="Permanently remove this terminated employee's record. This cannot be undone."
        onSubmit={handleDelete} submitLabel="Permanently Delete"
        submitVariant="destructive">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            You are about to permanently delete all records for <strong>{deleteTarget ? formatName(deleteTarget) : ""}</strong> ({deleteTarget?.employeeNumber}).
          </p>
          <p className="text-xs text-destructive font-medium">This action is irreversible. All payroll, attendance, and leave records linked to this employee will also be deleted.</p>
        </div>
      </ModalForm>
    </div>
  );
}
