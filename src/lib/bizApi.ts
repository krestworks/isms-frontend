import { api } from "./api";

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

type R<T> = { success: boolean; data: T; message?: string };

// ── Types ─────────────────────────────────────────────────────────────────────

export type BizType = "mart" | "pharmacy" | "restaurant" | "Tyre Centre";

export interface ApiBizBusiness {
  id: string; stationId: string; type: BizType; name: string;
  taxRate: number; currency: string;
  receiptHeader?: string | null; receiptFooter?: string | null;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiBizCategory {
  id: string; businessId: string; name: string; color?: string | null; parentId?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiBizProduct {
  id: string; businessId: string; categoryId?: string | null; categoryName?: string | null;
  name: string; sku?: string | null; barcode?: string | null; description?: string | null;
  markedPrice: number; price: number; costPrice: number; unit: string;
  stockQty: number; reorderLevel: number;
  expiryDate?: string | null; requiresPrescription: boolean;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiBizSupplier {
  id: string; businessId: string; name: string; phone?: string | null;
  email?: string | null; address?: string | null; contactPerson?: string | null;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiBizPOItem {
  productId?: string; productName: string; qty: number; unitCost: number; totalCost: number;
}

export interface ApiBizPurchaseOrder {
  id: string; businessId: string; supplierId?: string | null; supplierName?: string | null;
  orderRef: string; orderDate: string; expectedDate?: string | null;
  items: ApiBizPOItem[]; subtotal: number; totalAmount: number;
  status: string; notes?: string | null; receivedAt?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiBizSaleItem {
  productId?: string; name: string; qty: number; unitPrice: number; discount: number; totalPrice: number;
}

export type BizSaleStatus = "paid" | "pending_payment" | "void" | "refunded";

export interface ApiBizSale {
  id: string; businessId: string; saleRef: string; date: string;
  items: ApiBizSaleItem[]; subtotal: number; discount: number;
  taxRate: number; taxAmount: number; totalAmount: number;
  paymentMethod: string; amountPaid: number; change: number;
  cashier?: string | null; tableId?: string | null; tableNo?: string | null;
  notes?: string | null;
  status: BizSaleStatus;
  // Pesapal fields (M-Pesa / Card via gateway)
  pesapalTrackingId?: string | null;
  pesapalStatus?: string | null;
  customerPhone?: string | null;
  pesapalRedirectUrl?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiBizStockMovement {
  id: string; businessId: string; productId: string; productName: string;
  type: string; qty: number; before: number; after: number;
  reference?: string | null; notes?: string | null; date: string; createdAt: string;
}

export interface ApiBizExpense {
  id: string; businessId: string; date: string; description: string;
  amount: number; category?: string | null; paymentMethod: string;
  recordedBy?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiBizTable {
  id: string; businessId: string; tableNo: string; capacity: number;
  status: string; createdAt: string; updatedAt: string;
}

export interface ApiBizKitchenOrderItem {
  name: string; qty: number; notes?: string;
}

export interface ApiBizKitchenOrder {
  id: string; businessId: string; tableId?: string | null; tableNo?: string | null;
  orderRef: string; items: ApiBizKitchenOrderItem[]; status: string;
  notes?: string | null; saleId?: string | null; createdAt: string; updatedAt: string;
}

export interface ApiBizSummary {
  revenue: number; totalExpenses: number; profit: number; totalSales: number;
  totalProducts: number; lowStock: number; outOfStock: number;
  topProducts: { name: string; qty: number }[];
  byPayment: { method: string; amount: number }[];
}

/** Returned by POST /biz/payments/initiate */
export interface ApiPaymentInitiated {
  saleId: string;
  saleRef: string;
  trackingId: string;
  redirectUrl: string;
  amount: number;
}

/** Returned by GET /biz/payments/:trackingId/status */
export interface ApiPaymentStatus {
  status: "Completed" | "Pending" | "Failed" | "Invalid" | "Reversed" | "Cancelled";
  sale: ApiBizSale | null;
}

// ── API client ────────────────────────────────────────────────────────────────

export const bizApi = {
  businesses: {
    list:   (stationId?: string | null)  => api.get<R<ApiBizBusiness[]>>("/biz/businesses", sh(stationId)),
    get:    (id: string)                 => api.get<R<ApiBizBusiness>>(`/biz/businesses/${id}`),
    create: (data: Partial<ApiBizBusiness>, stationId?: string | null) => api.post<R<ApiBizBusiness>>("/biz/businesses", data, sh(stationId)),
    update: (id: string, data: Partial<ApiBizBusiness>) => api.put<R<ApiBizBusiness>>(`/biz/businesses/${id}`, data),
    delete: (id: string)                 => api.delete<R<{ id: string }>>(`/biz/businesses/${id}`),
  },

  categories: {
    list:   (businessId: string)         => api.get<R<ApiBizCategory[]>>(`/biz/categories${qs({ businessId })}`),
    create: (data: Partial<ApiBizCategory>) => api.post<R<ApiBizCategory>>("/biz/categories", data),
    update: (id: string, data: Partial<ApiBizCategory>) => api.put<R<ApiBizCategory>>(`/biz/categories/${id}`, data),
    delete: (id: string)                 => api.delete<R<{ id: string }>>(`/biz/categories/${id}`),
  },

  products: {
    list:        (businessId: string, params?: { categoryId?: string; status?: string; lowStock?: boolean }) =>
                   api.get<R<ApiBizProduct[]>>(`/biz/products${qs({ businessId, ...params })}`),
    findByBarcode: (businessId: string, code: string) =>
                   api.get<R<ApiBizProduct>>(`/biz/products/barcode/${encodeURIComponent(code)}${qs({ businessId })}`),
    create:      (data: Partial<ApiBizProduct>) => api.post<R<ApiBizProduct>>("/biz/products", data),
    update:      (id: string, data: Partial<ApiBizProduct>) => api.put<R<ApiBizProduct>>(`/biz/products/${id}`, data),
    delete:      (id: string) => api.delete<R<{ id: string }>>(`/biz/products/${id}`),
    adjustStock: (data: { productId: string; type: string; qty: number; notes?: string; reference?: string }) =>
                   api.post<R<ApiBizProduct>>("/biz/products/adjust-stock", data),
    bulkUpdateStock: (businessId: string, rows: { name: string; sku: string; barcode: string; newQty: number; type: string; notes: string }[]) =>
                   api.post<R<{ updated: number; notFound: number; errors: number }>>("/biz/products/bulk-stock", { businessId, rows }),
  },

  suppliers: {
    list:   (businessId: string)         => api.get<R<ApiBizSupplier[]>>(`/biz/suppliers${qs({ businessId })}`),
    create: (data: Partial<ApiBizSupplier>) => api.post<R<ApiBizSupplier>>("/biz/suppliers", data),
    update: (id: string, data: Partial<ApiBizSupplier>) => api.put<R<ApiBizSupplier>>(`/biz/suppliers/${id}`, data),
    delete: (id: string)                 => api.delete<R<{ id: string }>>(`/biz/suppliers/${id}`),
  },

  purchaseOrders: {
    list:    (businessId: string, status?: string) =>
               api.get<R<ApiBizPurchaseOrder[]>>(`/biz/purchase-orders${qs({ businessId, status })}`),
    create:  (data: Partial<ApiBizPurchaseOrder>) => api.post<R<ApiBizPurchaseOrder>>("/biz/purchase-orders", data),
    update:  (id: string, data: Partial<ApiBizPurchaseOrder>) => api.put<R<ApiBizPurchaseOrder>>(`/biz/purchase-orders/${id}`, data),
    receive: (id: string)    => api.post<R<{ id: string; status: string }>>(`/biz/purchase-orders/${id}/receive`, {}),
    delete:  (id: string)    => api.delete<R<{ id: string }>>(`/biz/purchase-orders/${id}`),
  },

  sales: {
    list:   (businessId: string, params?: { from?: string; to?: string; status?: string }) =>
              api.get<R<ApiBizSale[]>>(`/biz/sales${qs({ businessId, ...params })}`),
    create: (data: Partial<ApiBizSale> & { items: ApiBizSaleItem[] }) =>
              api.post<R<ApiBizSale>>("/biz/sales", data),
    void:   (id: string)    => api.post<R<{ id: string; status: string }>>(`/biz/sales/${id}/void`, {}),
  },

  payments: {
    initiate: (data: {
      businessId: string;
      items: ApiBizSaleItem[];
      subtotal: number;
      discount: number;
      taxRate: number;
      taxAmount: number;
      totalAmount: number;
      paymentMethod: "M-Pesa" | "Card";
      customerPhone?: string;
      cashier?: string;
      tableId?: string;
      tableNo?: string;
      notes?: string;
    }) => api.post<R<ApiPaymentInitiated>>("/biz/payments/initiate", data),

    checkStatus: (trackingId: string) =>
      api.get<R<ApiPaymentStatus>>(`/biz/payments/${encodeURIComponent(trackingId)}/status`),

    cancel: (saleId: string) =>
      api.post<R<{ id: string; status: string }>>(`/biz/payments/${saleId}/cancel`, {}),
  },

  stockMovements: {
    list: (businessId: string, params?: { productId?: string; type?: string; from?: string; to?: string }) =>
            api.get<R<ApiBizStockMovement[]>>(`/biz/stock-movements${qs({ businessId, ...params })}`),
  },

  expenses: {
    list:   (businessId: string, params?: { from?: string; to?: string }) =>
              api.get<R<ApiBizExpense[]>>(`/biz/expenses${qs({ businessId, ...params })}`),
    create: (data: Partial<ApiBizExpense>) => api.post<R<ApiBizExpense>>("/biz/expenses", data),
    update: (id: string, data: Partial<ApiBizExpense>) => api.put<R<ApiBizExpense>>(`/biz/expenses/${id}`, data),
    delete: (id: string)    => api.delete<R<{ id: string }>>(`/biz/expenses/${id}`),
  },

  tables: {
    list:   (businessId: string)          => api.get<R<ApiBizTable[]>>(`/biz/tables${qs({ businessId })}`),
    create: (data: Partial<ApiBizTable>)  => api.post<R<ApiBizTable>>("/biz/tables", data),
    update: (id: string, data: Partial<ApiBizTable>) => api.put<R<ApiBizTable>>(`/biz/tables/${id}`, data),
    delete: (id: string)                  => api.delete<R<{ id: string }>>(`/biz/tables/${id}`),
  },

  kitchenOrders: {
    list:   (businessId: string, status?: string) =>
              api.get<R<ApiBizKitchenOrder[]>>(`/biz/kitchen-orders${qs({ businessId, status })}`),
    create: (data: Partial<ApiBizKitchenOrder> & { items: ApiBizKitchenOrderItem[] }) =>
              api.post<R<ApiBizKitchenOrder>>("/biz/kitchen-orders", data),
    update: (id: string, data: Partial<ApiBizKitchenOrder>) =>
              api.put<R<ApiBizKitchenOrder>>(`/biz/kitchen-orders/${id}`, data),
    delete: (id: string)   => api.delete<R<{ id: string }>>(`/biz/kitchen-orders/${id}`),
  },

  reports: {
    summary: (businessId: string, params?: { from?: string; to?: string }) =>
               api.get<R<ApiBizSummary>>(`/biz/summary${qs({ businessId, ...params })}`),
  },
};
