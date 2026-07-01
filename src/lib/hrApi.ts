import { api } from "./api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const sh = (stationId?: string): { headers: Record<string, string> } | undefined =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

const qs = (params?: Record<string, string | number | undefined>) => {
  if (!params) return "";
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
  // Policy fields
  carryOver?: boolean; carryOverMax?: number;
  noticeDays?: number; maxConsecutive?: number;
  minTenureMonths?: number; genderRestriction?: string | null;
  accrualType?: string;
  excludeHolidays?: boolean; excludeWeekends?: boolean;
  requiresDocument?: boolean;
}

export interface ApiPublicHoliday {
  id: string; name: string; date: string; isRecurring: boolean; stationId: string;
  createdAt: string; updatedAt: string;
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
  bankDetails?: { bankName: string; bankCode?: string; accountNo: string; branchCode?: string; paymentMethod?: string } | null;
  kraPin?: string; shaNo?: string; nssfNo?: string; paymentMethod?: string;
  salaryGrade?: string; basicSalary?: number;
  workModules?: string[] | null;
  status: string; terminatedAt?: string; terminationNote?: string;
  user: { id: string; name: string; email: string; phone?: string; activeRole: string; status: string; } | null;
  department?: { id: string; name: string } | null;
  jobTitle?: { id: string; title: string; grade?: string } | null;
  departmentId?: string; jobTitleId?: string;
  createdAt: string; updatedAt: string;
}

export interface ApiLeaveRequest {
  id: string; employeeId: string; leaveTypeId: string;
  leaveRef?: string;
  startDate: string; endDate: string; days: number;
  isHalfDay?: boolean; halfDayPeriod?: string;
  reason?: string; status: string; approvedBy?: string; approvedAt?: string; note?: string;
  appliedBy?: string;
  employee?: { id: string; name?: string; user: { id: string; name: string; email: string } };
  leaveType?: { id: string; name: string; isPaid: boolean };
  createdAt: string; updatedAt: string;
}

export interface ApiLeaveSlip {
  ref: string;
  employee: { name: string; number?: string; department: string; jobTitle: string; email: string };
  leaveType: string; isPaid: boolean;
  startDate: string; endDate: string; days: number;
  isHalfDay: boolean; halfDayPeriod?: string;
  reason?: string; status: string; note?: string;
  appliedOn: string; approvedOn?: string;
}

export interface ApiLeaveBalance {
  leaveType: { id: string; name: string; isPaid: boolean; daysAllowed: number };
  year: number; total: number; used: number; pending: number; available: number;
  employee?: { id: string; employeeNumber: string; user: { id: string; name: string; email: string }; department?: { id: string; name: string } | null };
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

export interface ApiDocument {
  id: string;
  employeeId: string;
  type: string;
  fileName: string;
  fileSize: number;
  fileData?: string;
  expiresOn?: string | null;
  status: string;
  notes?: string | null;
  caseId?: string | null;
  uploadedBy: string;
  uploadedAt: string;
  employee?: { id: string; employeeNumber: string; user: { name: string } };
}

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
    id: string; employeeNumber: string; kraPin?: string | null;
    user: { id: string; name: string };
    department?: { id: string; name: string } | null;
    jobTitle?: { id: string; title: string } | null;
  };
}

export interface ApiPayrollRunRow {
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string;
  jobTitle: string;
  stationId: string;
  month: string;
  basicSalary: number;
  grossPay: number;
  nhif: number;
  nssf: number;
  paye: number;
  totalDeductions: number;
  netPay: number;
  absenceDeduction: number;
  absentDays: number;
  unpaidLeaveDays: number;
  noSalary: boolean;
  willSkip: boolean;
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

export interface ApiNotification {
  id: string; userId: string;
  type: string; title: string; message: string; link?: string | null;
  isRead: boolean; readAt?: string | null; createdAt: string;
}

// ── Recruitment types ─────────────────────────────────────────────────────────

export interface ApiJob {
  id: string; jobCode: string; stationId: string;
  title: string; departmentId?: string | null;
  description: string; requirements?: string | null; responsibilities?: string | null;
  salaryMin?: number | null; salaryMax?: number | null; currency: string;
  employmentType: string; location?: string | null; isRemote: boolean;
  slots: number; closingDate?: string | null;
  status: "Draft" | "Published" | "Closed" | "Archived";
  publishedAt?: string | null; tags?: string | null; createdBy?: string;
  department?: { id: string; name: string } | null;
  _count?: { applications: number };
  applications?: ApiJobApplication[];
  createdAt: string; updatedAt: string;
}

export interface ApiAiScreening {
  score: number;
  recommendation: "Shortlist" | "Interview" | "Hold" | "Reject";
  summary: string;
  strengths: string[];
  gaps: string[];
  redFlags: string[];
}

export interface ApiInterviewQuestions {
  questions: Array<{ type: string; question: string; probe?: string }>;
}

export interface ApiJobApplication {
  id: string; jobId: string;
  applicantName: string; applicantEmail: string; applicantPhone?: string | null;
  coverLetter?: string | null; resumeText?: string | null; resumeFile?: string | null;
  linkedinUrl?: string | null; portfolioUrl?: string | null;
  source?: string; expectedSalary?: number | null; noticePeriod?: string | null;
  status: "Applied" | "Screening" | "Shortlisted" | "Interview" | "Offered" | "Rejected" | "Withdrawn";
  reviewedBy?: string | null; reviewedAt?: string | null;
  aiScore?: number | null; aiSummary?: string | null; aiInterviewQ?: string | null; aiScreenedAt?: string | null;
  interviewDate?: string | null; interviewNotes?: string | null;
  offerSalary?: number | null; offerDate?: string | null;
  rejectionReason?: string | null; internalNotes?: string | null;
  job?: { id: string; title: string; jobCode: string; stationId: string };
  stages?: ApiApplicationStageLog[];
  createdAt: string; updatedAt: string;
}

export interface ApiApplicationStageLog {
  id: string; applicationId: string;
  fromStage: string; toStage: string;
  note?: string | null; changedBy?: string | null; changedAt: string;
}

// ── API surface ───────────────────────────────────────────────────────────────

export const hrApi = {

  // Stations (for dropdowns)
  stations: {
    list: () => api.get<{ success: boolean; data: ApiStation[] }>("/stations"),
  },

  // ── Banks ───────────────────────────────────────────────────────────────────

  banks: {
    list:     () => api.get<{ success: boolean; data: { code: string; name: string }[] }>("/hr/banks"),
    branches: (code: string) => api.get<{ success: boolean; data: { code: string; name: string }[] }>(`/hr/banks/${code}/branches`),
  },

  // ── Payroll Settings ─────────────────────────────────────────────────────────

  payrollSettings: {
    get:  () => api.get<{ success: boolean; data: Record<string, any> }>("/hr/payroll/settings"),
    save: (data: Record<string, any>) => api.put<{ success: boolean; data: Record<string, any> }>("/hr/payroll/settings", data),
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
    create: (data: Partial<Omit<ApiLeaveType, "id" | "stationId" | "createdAt" | "updatedAt" | "isActive">> & { name: string }, stationId?: string) =>
      api.post<{ success: boolean; data: ApiLeaveType }>("/hr/leaves/types", data, sh(stationId) as any),
    update: (id: string, data: Partial<Omit<ApiLeaveType, "id" | "stationId" | "createdAt" | "updatedAt">>) =>
      api.put<{ success: boolean; data: ApiLeaveType }>(`/hr/leaves/types/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/leaves/types/${id}`),
  },

  holidays: {
    list:   (params?: { stationId?: string }) =>
      api.get<{ success: boolean; data: ApiPublicHoliday[] }>(`/hr/holidays${qs(params as any)}`),
    create: (data: { name: string; date: string; isRecurring?: boolean }, stationId?: string) =>
      api.post<{ success: boolean; data: ApiPublicHoliday }>("/hr/holidays", data, sh(stationId) as any),
    update: (id: string, data: { name?: string; date?: string; isRecurring?: boolean }) =>
      api.put<{ success: boolean; data: ApiPublicHoliday }>(`/hr/holidays/${id}`, data),
    remove: (id: string) =>
      api.delete<{ success: boolean }>(`/hr/holidays/${id}`),
  },

  // ── Employees ───────────────────────────────────────────────────────────────

  employees: {
    list: (params?: { stationId?: string; status?: string; departmentId?: string; module?: string; page?: number; limit?: number }) =>
      api.get<{ success: boolean; data: ApiEmployee[]; meta: PageMeta }>(`/hr/employees${qs(params as any)}`),
    create: (data: {
      email?: string; password?: string; name?: string; phone?: string;
      userId?: string;
      employeeNumber?: string; stationId?: string;
      departmentId?: string; jobTitleId?: string;
      employmentType?: string; contractType?: string;
      startDate: string; endDate?: string;
      nationalId?: string; dateOfBirth?: string; gender?: string; address?: string;
      emergencyContact?: object; bankDetails?: object;
      salaryGrade?: string; basicSalary?: number;
    }) => api.post<{ success: boolean; data: ApiEmployee }>("/hr/employees", data,
      data.stationId ? sh(data.stationId) as any : undefined),
    get:    (id: string) => api.get<{ success: boolean; data: ApiEmployee }>(`/hr/employees/${id}`),
    update: (id: string, data: Record<string, unknown>) =>
      api.put<{ success: boolean; data: ApiEmployee }>(`/hr/employees/${id}`, data),
    terminate:   (id: string, data: { note?: string; terminatedAt?: string }) =>
      api.post<{ success: boolean }>(`/hr/employees/${id}/terminate`, data),
    reactivate:  (id: string) =>
      api.post<{ success: boolean }>(`/hr/employees/${id}/reactivate`, {}),
    remove:      (id: string) =>
      api.delete<{ success: boolean }>(`/hr/employees/${id}`),
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
    submit: (data: {
      leaveTypeId: string; startDate: string; endDate: string; reason?: string;
      employeeId?: string; isHalfDay?: boolean; halfDayPeriod?: string; allowBackdate?: boolean;
    }) => api.post<{ success: boolean; data: ApiLeaveRequest }>("/hr/leaves", data),
    approve: (id: string, action: "approve" | "reject", note?: string) =>
      api.put<{ success: boolean; data: ApiLeaveRequest }>(`/hr/leaves/${id}/approve`, { action, note }),
    adjust:  (id: string, returnDate: string, note?: string) =>
      api.put<{ success: boolean; data: ApiLeaveRequest }>(`/hr/leaves/${id}/adjust`, { returnDate, note }),
    cancel:  (id: string) => api.put<{ success: boolean }>(`/hr/leaves/${id}/cancel`, {}),
    balances: (params?: { employeeId?: string; year?: number }) =>
      api.get<{ success: boolean; data: ApiLeaveBalance[] }>(`/hr/leaves/balances${qs(params as any)}`),
    adjustBalance: (data: { employeeId: string; leaveTypeId: string; year?: number; total: number; note?: string }) =>
      api.post<{ success: boolean; data: ApiLeaveBalance }>("/hr/leaves/adjust-balance", data),
    exportLeaves: (params?: { status?: string; employeeId?: string; from?: string; to?: string }) =>
      `/hr/leaves/export${qs(params as any)}`,
    getSlip: (id: string) =>
      api.get<{ success: boolean; data: ApiLeaveSlip }>(`/hr/leaves/${id}/slip`),
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
    run: (data: {
      month: string; dryRun?: boolean;
      stationIds?: string[]; departmentIds?: string[]; employeeIds?: string[];
      includeAttendance?: boolean; includeLeave?: boolean;
    }) =>
      api.post<{ success: boolean; data: ApiPayrollRunRow[] | { created: number; skipped: number; failed: number }; meta?: { total: number; toCreate: number; toSkip: number; noSalary: number }; message?: string }>("/hr/payroll/run", data),
    bulkUpdateStatus: (data: { month?: string; status: string; payDate?: string; ids?: string[]; stationIds?: string[]; departmentIds?: string[] }) =>
      api.put<{ success: boolean; data: { updated: number }; message: string }>("/hr/payroll/bulk-status", data),
    sendPayslip: (id: string) =>
      api.post<{ success: boolean; message: string; dev?: boolean }>(`/hr/payroll/${id}/send-payslip`, {}),
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
    documents: {
      list: () => api.get<{ success: boolean; data: ApiDocument[] }>("/hr/self/documents"),
    },
    notifications: {
      list:         (params?: { unreadOnly?: boolean; page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiNotification[]; unreadCount: number; meta: PageMeta }>(`/hr/self/notifications${qs({ ...params, unreadOnly: params?.unreadOnly ? "true" : undefined } as any)}`),
      markRead:     (id: string) => api.put<{ success: boolean }>(`/hr/self/notifications/${id}/read`, {}),
      markAllRead:  () => api.put<{ success: boolean }>("/hr/self/notifications/mark-all-read", {}),
      clear:        () => api.delete<{ success: boolean }>("/hr/self/notifications"),
    },
  },

  // ── Recruitment ─────────────────────────────────────────────────────────────

  recruitment: {
    jobs: {
      list:    (params?: { status?: string; departmentId?: string; page?: number; limit?: number }) =>
        api.get<{ success: boolean; data: ApiJob[]; meta: PageMeta }>(`/hr/recruitment/jobs${qs(params as any)}`),
      create:  (data: Partial<ApiJob> & { title: string; description: string }) =>
        api.post<{ success: boolean; data: ApiJob }>("/hr/recruitment/jobs", data),
      get:     (id: string) => api.get<{ success: boolean; data: ApiJob }>(`/hr/recruitment/jobs/${id}`),
      update:  (id: string, data: Partial<ApiJob>) =>
        api.put<{ success: boolean; data: ApiJob }>(`/hr/recruitment/jobs/${id}`, data),
      publish: (id: string) =>
        api.post<{ success: boolean; data: ApiJob }>(`/hr/recruitment/jobs/${id}/publish`, {}),
      close:   (id: string, archive?: boolean) =>
        api.post<{ success: boolean; data: ApiJob }>(`/hr/recruitment/jobs/${id}/close`, { archive }),
      remove:  (id: string) => api.delete<{ success: boolean }>(`/hr/recruitment/jobs/${id}`),
      batchScreen: (id: string) =>
        api.post<{ success: boolean; screened: number; results: Array<{ id: string; name: string; score: number; recommendation: string }> }>(`/hr/recruitment/jobs/${id}/batch-screen`, {}),
      generatePost: (data: { title: string; employmentType?: string; department?: string }) =>
        api.post<{ success: boolean; data: { description: string; requirements: string; responsibilities: string } }>("/hr/recruitment/jobs/generate-post", data),
    },
    applications: {
      list:    (params?: { jobId?: string; status?: string; page?: number; limit?: number; aiScoreMin?: number }) =>
        api.get<{ success: boolean; data: ApiJobApplication[]; meta: PageMeta }>(`/hr/recruitment/applications${qs(params as any)}`),
      get:     (id: string) => api.get<{ success: boolean; data: ApiJobApplication }>(`/hr/recruitment/applications/${id}`),
      stage:   (id: string, data: { status: string; note?: string; interviewDate?: string; offerSalary?: number; rejectionReason?: string; internalNotes?: string }) =>
        api.put<{ success: boolean; data: ApiJobApplication }>(`/hr/recruitment/applications/${id}/stage`, data),
      notes:   (id: string, data: { internalNotes?: string; interviewNotes?: string; interviewDate?: string }) =>
        api.put<{ success: boolean; data: ApiJobApplication }>(`/hr/recruitment/applications/${id}/notes`, data),
      screen:  (id: string) =>
        api.post<{ success: boolean; data: ApiJobApplication; ai: ApiAiScreening }>(`/hr/recruitment/applications/${id}/screen`, {}),
      questions: (id: string) =>
        api.post<{ success: boolean; data: ApiInterviewQuestions }>(`/hr/recruitment/applications/${id}/questions`, {}),
    },
  },

  // ── Documents ───────────────────────────────────────────────────────────────

  documents: {
    list:     (params?: { employeeId?: string; type?: string; status?: string; caseId?: string }) =>
      api.get<{ success: boolean; data: ApiDocument[] }>(`/hr/documents${qs(params as any)}`),
    create:   (data: { employeeId: string; type: string; fileName: string; fileSize?: number; fileData?: string; expiresOn?: string; status?: string; notes?: string; caseId?: string }) =>
      api.post<{ success: boolean; data: ApiDocument }>("/hr/documents", data),
    update:   (id: string, data: Partial<{ type: string; fileName: string; fileSize: number; fileData: string; expiresOn: string; status: string; notes: string; caseId: string }>) =>
      api.put<{ success: boolean; data: ApiDocument }>(`/hr/documents/${id}`, data),
    download: (id: string) =>
      api.get<{ success: boolean; data: { fileName: string; fileData: string } }>(`/hr/documents/${id}/download`),
    remove:   (id: string) => api.delete<{ success: boolean }>(`/hr/documents/${id}`),
  },
};
