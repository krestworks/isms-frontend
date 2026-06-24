import { api } from "./api";

type R<T> = { success: boolean; data: T };

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

const qs = (params: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

export interface ApiReportTemplate {
  id: string;
  stationId: string;
  name: string;
  module: string;
  frequency: string;
  sections: string;
  status: string;
  lastUsed?: string | null;
  createdAt: string;
}

export interface ApiGeneratedReport {
  id: string;
  stationId: string;
  title: string;
  type: string;
  module: string;
  period: string;
  format: string;
  generatedBy: string;
  generatedAt: string;
  fileSize?: string | null;
  status: string;
  createdAt: string;
}

export interface ApiScheduledReport {
  id: string;
  stationId: string;
  name: string;
  type: string;
  frequency: string;
  modules: string;
  recipients: string;
  lastRun?: string | null;
  nextRun?: string | null;
  status: string;
}

export const MODULE_FIELDS: Record<string, { key: string; label: string }[]> = {
  Fuel: [
    { key: "date",          label: "Date" },
    { key: "fuelType",      label: "Fuel Type" },
    { key: "litres",        label: "Litres" },
    { key: "pricePerLitre", label: "Price / L" },
    { key: "amount",        label: "Amount" },
    { key: "discount",      label: "Discount" },
    { key: "netAmount",     label: "Net Amount" },
    { key: "attendant",     label: "Attendant" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "customer",      label: "Customer" },
    { key: "receiptNo",     label: "Receipt No" },
    { key: "pumpNumber",    label: "Pump No" },
  ],
  LPG: [
    { key: "date",          label: "Date" },
    { key: "receiptNo",     label: "Receipt No" },
    { key: "customer",      label: "Customer" },
    { key: "cylinderSize",  label: "Cylinder Size" },
    { key: "quantity",      label: "Quantity" },
    { key: "unitPrice",     label: "Unit Price" },
    { key: "discount",      label: "Discount" },
    { key: "totalAmount",   label: "Total Amount" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "paymentStatus", label: "Payment Status" },
    { key: "attendant",     label: "Attendant" },
    { key: "exchangeType",  label: "Exchange Type" },
  ],
  Water: [
    { key: "date",           label: "Date" },
    { key: "shift",          label: "Shift" },
    { key: "litresProduced", label: "Litres Produced" },
    { key: "litresWasted",   label: "Litres Wasted" },
    { key: "netOutput",      label: "Net Output" },
    { key: "operator",       label: "Operator" },
    { key: "status",         label: "Status" },
  ],
  Automotive: [
    { key: "date",          label: "Date" },
    { key: "serviceNo",     label: "Service No" },
    { key: "vehicleReg",    label: "Vehicle Reg" },
    { key: "vehicleMake",   label: "Vehicle Make" },
    { key: "customerName",  label: "Customer Name" },
    { key: "customerPhone", label: "Customer Phone" },
    { key: "serviceType",   label: "Service Type" },
    { key: "technician",    label: "Technician" },
    { key: "estimatedCost", label: "Est. Cost" },
    { key: "actualCost",    label: "Actual Cost" },
    { key: "status",        label: "Status" },
  ],
  "Car Wash": [
    { key: "date",          label: "Date" },
    { key: "receiptNo",     label: "Receipt No" },
    { key: "vehicleReg",    label: "Vehicle Reg" },
    { key: "washPackage",   label: "Wash Package" },
    { key: "attendant",     label: "Attendant" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "amount",        label: "Amount" },
    { key: "status",        label: "Status" },
  ],
  Business: [
    { key: "date",          label: "Date" },
    { key: "saleRef",       label: "Sale Ref" },
    { key: "subtotal",      label: "Subtotal" },
    { key: "discount",      label: "Discount" },
    { key: "taxAmount",     label: "Tax Amount" },
    { key: "totalAmount",   label: "Total Amount" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "amountPaid",    label: "Amount Paid" },
    { key: "cashier",       label: "Cashier" },
    { key: "status",        label: "Status" },
  ],
  Inventory: [
    { key: "date",        label: "Date" },
    { key: "productName", label: "Product" },
    { key: "type",        label: "Movement Type" },
    { key: "qty",         label: "Quantity" },
    { key: "before",      label: "Stock Before" },
    { key: "after",       label: "Stock After" },
    { key: "reference",   label: "Reference" },
    { key: "notes",       label: "Notes" },
  ],
  "Finance Revenue": [
    { key: "date",          label: "Date" },
    { key: "module",        label: "Module" },
    { key: "category",      label: "Category" },
    { key: "description",   label: "Description" },
    { key: "amount",        label: "Amount" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "reference",     label: "Reference" },
    { key: "status",        label: "Status" },
  ],
  "Finance Expenses": [
    { key: "date",          label: "Date" },
    { key: "module",        label: "Module" },
    { key: "category",      label: "Category" },
    { key: "vendor",        label: "Vendor" },
    { key: "description",   label: "Description" },
    { key: "amount",        label: "Amount" },
    { key: "paymentMethod", label: "Payment Method" },
    { key: "approvedBy",    label: "Approved By" },
    { key: "status",        label: "Status" },
  ],
  HR: [
    { key: "employeeNumber", label: "Employee No" },
    { key: "employmentType", label: "Employment Type" },
    { key: "contractType",   label: "Contract Type" },
    { key: "startDate",      label: "Start Date" },
    { key: "endDate",        label: "End Date" },
    { key: "nationalId",     label: "National ID" },
    { key: "gender",         label: "Gender" },
    { key: "salaryGrade",    label: "Salary Grade" },
    { key: "basicSalary",    label: "Basic Salary" },
    { key: "status",         label: "Status" },
  ],
};

export const MODULES = Object.keys(MODULE_FIELDS);

export const reportsApi = {
  templates: {
    list: (stationId?: string | null) =>
      api.get<R<ApiReportTemplate[]>>("/reports/templates", sh(stationId)),
    create: (body: Partial<ApiReportTemplate>, stationId?: string | null) =>
      api.post<R<ApiReportTemplate>>("/reports/templates", body, sh(stationId)),
    update: (id: string, body: Partial<ApiReportTemplate>) =>
      api.put<R<ApiReportTemplate>>(`/reports/templates/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/reports/templates/${id}`),
  },

  generated: {
    list: (stationId?: string | null, params?: { type?: string; module?: string; status?: string }) =>
      api.get<R<ApiGeneratedReport[]>>(`/reports/generated${qs(params ?? {})}`, sh(stationId)),
    create: (body: Partial<ApiGeneratedReport>, stationId?: string | null) =>
      api.post<R<ApiGeneratedReport>>("/reports/generated", body, sh(stationId)),
    update: (id: string, body: Partial<ApiGeneratedReport>) =>
      api.put<R<ApiGeneratedReport>>(`/reports/generated/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/reports/generated/${id}`),
  },

  scheduled: {
    list: (stationId?: string | null, params?: { status?: string }) =>
      api.get<R<ApiScheduledReport[]>>(`/reports/scheduled${qs(params ?? {})}`, sh(stationId)),
    create: (body: Partial<ApiScheduledReport>, stationId?: string | null) =>
      api.post<R<ApiScheduledReport>>("/reports/scheduled", body, sh(stationId)),
    update: (id: string, body: Partial<ApiScheduledReport>) =>
      api.put<R<ApiScheduledReport>>(`/reports/scheduled/${id}`, body),
    delete: (id: string) =>
      api.delete<R<{ id: string }>>(`/reports/scheduled/${id}`),
  },

  build: (
    body: { module: string; fields: string[]; dateFrom?: string; dateTo?: string },
    stationId?: string | null,
  ) =>
    api.post<R<{ columns: string[]; rows: Record<string, unknown>[] }>>("/reports/build", body, sh(stationId)),
};
