import { api } from "./api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const sh = (stationId?: string): { headers: Record<string, string> } | undefined =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

const qs = (params: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ── Shared types ──────────────────────────────────────────────────────────────

export interface ApiStation { id: string; name: string; type: string; status: string; createdAt: string; }

export interface ApiDepartment {
  id: string; name: string; description?: string; stationId: string; parentId?: string;
  parent?: { id: string; name: string };
  children?: ApiDepartment[];
  jobTitles?: Array<{ id: string; title: string; grade?: string }>;
  _count?: { children: number; employees: number };
  createdAt: string; updatedAt: string;
}

export interface ApiJobTitle {
  id: string; title: string; description?: string; departmentId?: string; stationId: string; grade?: string;
  department?: { id: string; name: string };
  _count?: { employees: number };
  createdAt: string;
}

export interface ApiLeaveType {
  id: string; name: string; daysAllowed: number; isPaid: boolean; stationId: string; isActive: boolean;
}

export interface ApiShiftPattern {
  id: string; name: string; startTime: string; endTime: string; stationId: string; isDefault: boolean;
  _count?: { assignments: number };
}

export interface ApiEmployee {
  id: string; employeeNumber: string; stationId: string;
  employmentType: string; contractType?: string;
  startDate: string; endDate?: string;
  gender?: string; nationalId?: string; dateOfBirth?: string; address?: string;
  emergencyContact?: { name: string; phone: string; relation?: string } | null;
  bankDetails?: { bankName: string; accountNo: string; branchCode?: string } | null;
  salaryGrade?: string; basicSalary?: number;
  status: string; terminatedAt?: string; terminationNote?: string;
  user: { id: string; name: string; email: string; phone?: string; activeRole: string; status: string; };
  department?: { id: string; name: string } | null;
  jobTitle?: { id: string; title: string; grade?: string } | null;
  createdAt: string; updatedAt: string;
}

export interface ApiLeaveRequest {
  id: string; employeeId: string; leaveTypeId: string;
  startDate: string; endDate: string; days: number;
  reason?: string; status: string; approvedBy?: string; approvedAt?: string; note?: string;
  employee?: { id: string; user: { id: string; name: string; email: string } };
  leaveType?: { id: string; name: string; isPaid: boolean };
  createdAt: string; updatedAt: string;
}

export interface ApiLeaveBalance {
  leaveType: { id: string; name: string; isPaid: boolean; daysAllowed: number };
  year: number; total: number; used: number; pending: number; available: number;
}

export interface ApiAttendance {
  id: string; employeeId: string; date: string;
  checkIn?: string; checkOut?: string; status: string; note?: string;
  employee?: { id: string; user: { id: string; name: string } };
  createdAt: string; updatedAt: string;
}

export interface ApiShiftAssignment {
  id: string; employeeId: string; shiftPatternId: string; date: string; stationId: string;
  employee?: { id: string; user: { id: string; name: string } };
  shiftPattern?: { id: string; name: string; startTime: string; endTime: string };
}

export interface ApiStationModule { module: string; isEnabled: boolean; updatedAt?: string; }

export interface PageMeta { page: number; limit: number; total: number; pages: number; }

export interface ApiDisciplinaryRecord {
  id: string;
  employeeId: string;
  category: string;
  offence?: string | null;
  description: string;
  date: string;
  reportedBy?: string | null;
  stage: string;
  outcome?: string | null;
  hearingDate?: string | null;
  appeal?: string | null;
  notes?: string | null;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string; employeeNumber: string;
    user: { id: string; name: string };
    department?: { id: string; name: string } | null;
  };
}

export interface ApiPayroll {
  id: string;
  stationId: string;
  employeeId: string;
  month: string;
  basicSalary: number;
  houseAllowance: number;
  transportAllowance: number;
  overtimePay: number;
  grossPay: number;
  nhif: number;
  nssf: number;
  paye: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  status: string;
  payDate?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string; employeeNumber: string;
    user: { id: string; name: string };
    department?: { id: string; name: string } | null;
    jobTitle?: { id: string; title: string } | null;
  };
}

export interface ApiPerformanceTask {
  id: string;
  stationId: string;
  employeeId: string;
  title: string;
  category: string;
  dueDate?: string | null;
  status: string;
  priority: string;
  notes?: string | null;
  rating?: number | null;
  assignedBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: {
    id: string; employeeNumber: string;
    user: { id: string; name: string };
    department?: { id: string; name: string } | null;
  };
}

// ── API surface ───────────────────────────────────────────────────────────────

export const hrApi = {

  // Stations (for dropdowns)
  stations: {
    list: () => api.get<{ success: boolean; data: ApiStation[] }>("/stations"),
  },

  // ── Setup ───────────────────────────────────────────────────────────────────

  departments: {
    list:   (stationId?: string) =>
      api.get<{ success: boolean; data: ApiDepartment[] }>("/hr/setup/departments", sh(stationId) as any),
    tree:   (stationId?: string) =>
      api.get<{ success: boolean; data: ApiDepartment[] }>("/hr/setup/departments/tree", sh(stationId) as any),
    create: (data: { name: string; description?: string; parentId?: string }, stationId?: string) =>
      api.post<{ success: boolean; data: ApiDepartment }>("/hr/setup/departments", data, sh(stationId) as any),
    update: (id: string, data: { name?: string; description?: string; parentId?: string | null }) =>
      api.put<{ success: boolean; data: ApiDepartment }>(`/hr/setup/departments/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/setup/departments/${id}`),
  },

  jobTitles: {
    list:   (params?: { departmentId?: string; stationId?: string }) =>
      api.get<{ success: boolean; data: ApiJobTitle[] }>(`/hr/setup/job-titles${qs({ departmentId: params?.departmentId, stationId: params?.stationId })}`),
    create: (data: { title: string; description?: string; departmentId?: string; grade?: string }, stationId?: string) =>
      api.post<{ success: boolean; data: ApiJobTitle }>("/hr/setup/job-titles", data, sh(stationId) as any),
    update: (id: string, data: { title?: string; description?: string; departmentId?: string | null; grade?: string }) =>
      api.put<{ success: boolean; data: ApiJobTitle }>(`/hr/setup/job-titles/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/setup/job-titles/${id}`),
  },

  modules: {
    get:    (stationId: string) =>
      api.get<{ success: boolean; stationId: string; stationName: string; data: ApiStationModule[] }>(`/hr/setup/stations/${stationId}/modules`),
    update: (stationId: string, modules: Record<string, boolean>) =>
      api.put<{ success: boolean; data: ApiStationModule[] }>(`/hr/setup/stations/${stationId}/modules`, { modules }),
  },

  shifts: {
    list:   (stationId?: string) =>
      api.get<{ success: boolean; data: ApiShiftPattern[] }>("/hr/shifts", sh(stationId) as any),
    create: (data: { name: string; startTime: string; endTime: string; isDefault?: boolean; stationId: string }, stationId?: string) =>
      api.post<{ success: boolean; data: ApiShiftPattern }>("/hr/shifts", data, sh(stationId) as any),
    update: (id: string, data: { name?: string; startTime?: string; endTime?: string; isDefault?: boolean }) =>
      api.put<{ success: boolean; data: ApiShiftPattern }>(`/hr/shifts/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/shifts/${id}`),
    assignments: {
      list: (params?: { employeeId?: string; stationId?: string; from?: string; to?: string }) =>
        api.get<{ success: boolean; data: ApiShiftAssignment[]; meta: PageMeta }>(`/hr/shifts/assignments${qs(params as any)}`),
      assign: (data: { employeeId: string; shiftPatternId: string; date: string; stationId?: string }) =>
        api.post<{ success: boolean; data: ApiShiftAssignment }>("/hr/shifts/assignments", data, sh(data.stationId) as any),
    },
  },

  leaveTypes: {
    list:   (stationId?: string) =>
      api.get<{ success: boolean; data: ApiLeaveType[] }>("/hr/leaves/types", sh(stationId) as any),
    create: (data: { name: string; daysAllowed?: number; isPaid?: boolean }, stationId?: string) =>
      api.post<{ success: boolean; data: ApiLeaveType }>("/hr/leaves/types", data, sh(stationId) as any),
    update: (id: string, data: { name?: string; daysAllowed?: number; isPaid?: boolean; isActive?: boolean }) =>
      api.put<{ success: boolean; data: ApiLeaveType }>(`/hr/leaves/types/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/leaves/types/${id}`),
  },

  // ── Employees ───────────────────────────────────────────────────────────────

  employees: {
    list: (params?: { stationId?: string; status?: string; departmentId?: string; page?: number; limit?: number }) =>
      api.get<{ success: boolean; data: ApiEmployee[]; meta: PageMeta }>(`/hr/employees${qs(params as any)}`),
    create: (data: {
      email?: string; password?: string; name?: string; phone?: string;
      userId?: string;
      employeeNumber?: string; stationId: string;
      departmentId?: string; jobTitleId?: string;
      employmentType?: string; contractType?: string;
      startDate: string; endDate?: string;
      nationalId?: string; dateOfBirth?: string; gender?: string; address?: string;
      emergencyContact?: object; bankDetails?: object;
      salaryGrade?: string; basicSalary?: number;
    }) => api.post<{ success: boolean; data: ApiEmployee }>("/hr/employees", data),
    get:    (id: string) => api.get<{ success: boolean; data: ApiEmployee }>(`/hr/employees/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      api.put<{ success: boolean; data: ApiEmployee }>(`/hr/employees/${id}`, data),
    terminate: (id: string, data: { note?: string; terminatedAt?: string }) =>
      api.post<{ success: boolean }>(`/hr/employees/${id}/terminate`, data),
    disciplinary: {
      listAll: (params?: { employeeId?: string; stage?: string; category?: string }) =>
        api.get<{ success: boolean; data: ApiDisciplinaryRecord[] }>(`/hr/disciplinary${qs(params as any)}`),
      list:   (id: string) => api.get<{ success: boolean; data: ApiDisciplinaryRecord[] }>(`/hr/employees/${id}/disciplinary`),
      create: (id: string, data: Partial<ApiDisciplinaryRecord>) =>
        api.post<{ success: boolean; data: ApiDisciplinaryRecord }>(`/hr/employees/${id}/disciplinary`, data),
      update: (employeeId: string, recordId: string, data: Partial<ApiDisciplinaryRecord>) =>
        api.put<{ success: boolean; data: ApiDisciplinaryRecord }>(`/hr/employees/${employeeId}/disciplinary/${recordId}`, data),
    },
  },

  // ── Leaves ─────────────────────────────────────────────────────────────────

  leaves: {
    list:   (params?: { status?: string; employeeId?: string; stationId?: string; page?: number }) =>
      api.get<{ success: boolean; data: ApiLeaveRequest[]; meta: PageMeta }>(`/hr/leaves${qs(params as any)}`),
    submit: (data: { leaveTypeId: string; startDate: string; endDate: string; reason?: string }) =>
      api.post<{ success: boolean; data: ApiLeaveRequest }>("/hr/leaves", data),
    approve: (id: string, action: "approve" | "reject", note?: string) =>
      api.put<{ success: boolean; data: ApiLeaveRequest }>(`/hr/leaves/${id}/approve`, { action, note }),
    cancel:  (id: string) => api.put<{ success: boolean }>(`/hr/leaves/${id}/cancel`, {}),
    balances: (params?: { employeeId?: string; year?: number }) =>
      api.get<{ success: boolean; data: ApiLeaveBalance[] }>(`/hr/leaves/balances${qs(params as any)}`),
  },

  // ── Attendance ──────────────────────────────────────────────────────────────

  attendance: {
    list:     (params?: { employeeId?: string; stationId?: string; from?: string; to?: string; status?: string; page?: number }) =>
      api.get<{ success: boolean; data: ApiAttendance[]; meta: PageMeta }>(`/hr/attendance${qs(params as any)}`),
    checkIn:  () => api.post<{ success: boolean; data: ApiAttendance }>("/hr/attendance/checkin", {}),
    checkOut: () => api.post<{ success: boolean; data: ApiAttendance }>("/hr/attendance/checkout", {}),
    manual:   (data: { employeeId: string; date: string; checkIn?: string; checkOut?: string; status?: string; note?: string }) =>
      api.post<{ success: boolean; data: ApiAttendance }>("/hr/attendance/manual", data),
  },

  // ── Payroll ─────────────────────────────────────────────────────────────────

  payroll: {
    list:   (params?: { employeeId?: string; month?: string; status?: string; page?: number; limit?: number }) =>
      api.get<{ success: boolean; data: ApiPayroll[]; meta: PageMeta }>(`/hr/payroll${qs(params as any)}`),
    create: (data: Partial<ApiPayroll> & { employeeId: string; month: string }) =>
      api.post<{ success: boolean; data: ApiPayroll }>("/hr/payroll", data),
    update: (id: string, data: Partial<ApiPayroll>) =>
      api.put<{ success: boolean; data: ApiPayroll }>(`/hr/payroll/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/payroll/${id}`),
  },

  // ── Performance ─────────────────────────────────────────────────────────────

  performance: {
    list:   (params?: { employeeId?: string; status?: string; category?: string; page?: number; limit?: number }) =>
      api.get<{ success: boolean; data: ApiPerformanceTask[]; meta: PageMeta }>(`/hr/performance${qs(params as any)}`),
    create: (data: Partial<ApiPerformanceTask> & { employeeId: string; title: string }) =>
      api.post<{ success: boolean; data: ApiPerformanceTask }>("/hr/performance", data),
    update: (id: string, data: Partial<ApiPerformanceTask>) =>
      api.put<{ success: boolean; data: ApiPerformanceTask }>(`/hr/performance/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/performance/${id}`),
  },

  // ── Self-service (employee portal) — no hr.* permissions required ───────────
  // Routes: /hr/self/* — scoped to calling user's own Employee record.

  self: {
    me:               () => api.get<{ success: boolean; data: ApiEmployee }>("/hr/self/me"),
    attendance: {
      list:     (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiAttendance[]; meta: PageMeta }>(`/hr/self/attendance${qs(params as any)}`),
      checkIn:  () => api.post<{ success: boolean; data: ApiAttendance }>("/hr/self/attendance/checkin", {}),
      checkOut: () => api.post<{ success: boolean; data: ApiAttendance }>("/hr/self/attendance/checkout", {}),
    },
    leaves: {
      list:     (params?: { status?: string; page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiLeaveRequest[]; meta: PageMeta }>(`/hr/self/leaves${qs(params as any)}`),
      types:    () => api.get<{ success: boolean; data: ApiLeaveType[] }>("/hr/self/leaves/types"),
      balances: (year?: number) =>
        api.get<{ success: boolean; data: ApiLeaveBalance[] }>(`/hr/self/leaves/balances${year ? `?year=${year}` : ""}`),
      submit:   (data: { leaveTypeId: string; startDate: string; endDate: string; reason?: string }) =>
        api.post<{ success: boolean; data: ApiLeaveRequest }>("/hr/self/leaves", data),
      cancel:   (id: string) => api.put<{ success: boolean }>(`/hr/self/leaves/${id}/cancel`, {}),
    },
    shifts: {
      list: (params?: { from?: string; to?: string; page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiShiftAssignment[]; meta: PageMeta }>(`/hr/self/shifts${qs(params as any)}`),
    },
    disciplinary: {
      list: () => api.get<{ success: boolean; data: ApiDisciplinaryRecord[] }>("/hr/self/disciplinary"),
    },
    payroll: {
      list: (params?: { page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiPayroll[]; meta: PageMeta }>(`/hr/self/payroll${qs(params as any)}`),
    },
    performance: {
      list: (params?: { page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiPerformanceTask[]; meta: PageMeta }>(`/hr/self/performance${qs(params as any)}`),
    },
  },
};
