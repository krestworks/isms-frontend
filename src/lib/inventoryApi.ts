import { api } from "./api";

const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

const sh = (stationId?: string | null) =>
  stationId ? { headers: { "x-station-id": stationId } } : undefined;

type R<T>  = { success: boolean; data: T; message?: string };
type RL<T> = { success: boolean; data: T; meta: { page: number; limit: number; total: number; pages: number }; message?: string };

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApiSupplier {
  id: string; stationId: string; accountId?: string | null;
  name: string; contactName?: string | null; phone?: string | null; email?: string | null;
  address?: string | null; category?: string | null; taxPin?: string | null;
  bankDetails?: string | null; paymentTerms?: string | null;
  status: string; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiInventoryItem {
  id: string; stationId: string; accountId?: string | null;
  category: string; name: string; sku?: string | null; barcode?: string | null;
  unit: string; description?: string | null;
  currentQty: number; reservedQty: number; reorderLevel: number; reorderQty: number;
  costPrice: number; sellingPrice: number;
  supplierId?: string | null; location?: string | null; expiryDate?: string | null;
  status: string; imageUrl?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiPOItem {
  id: string; poId: string; itemId?: string | null; itemName: string;
  category: string; unit: string;
  orderedQty: number; receivedQty: number;
  unitCost: number; totalCost: number; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiPurchaseOrder {
  id: string; stationId: string; accountId?: string | null;
  poNumber: string; supplierId?: string | null; supplierName?: string | null;
  supplier?: { id: string; name: string } | null;
  status: string; orderDate: string; expectedDate?: string | null; receivedDate?: string | null;
  subtotal: number; taxAmount: number; totalAmount: number;
  paidAmount: number; paymentStatus: string;
  notes?: string | null; createdBy?: string | null;
  items: ApiPOItem[];
  createdAt: string; updatedAt: string;
}

export interface ApiGRNItem {
  id: string; grnId: string; itemId?: string | null; itemName: string;
  category: string; unit: string;
  expectedQty: number; receivedQty: number;
  unitCost: number; totalCost: number; notes?: string | null;
  createdAt: string; updatedAt: string;
}

export interface ApiGoodsReceipt {
  id: string; stationId: string; accountId?: string | null;
  grnNumber: string; poId?: string | null;
  po?: { id: string; poNumber: string } | null;
  supplierName?: string | null; receiptDate: string;
  status: string; subtotal: number; totalAmount: number;
  notes?: string | null; receivedBy?: string | null; verifiedBy?: string | null;
  postedAt?: string | null;
  items: ApiGRNItem[];
  createdAt: string; updatedAt: string;
}

export interface ApiStockMovement {
  id: string; stationId: string; itemId?: string | null; itemName: string;
  movementType: string; qty: number;
  balanceBefore: number; balanceAfter: number;
  reference?: string | null; notes?: string | null; createdBy?: string | null;
  createdAt: string;
}

export interface ApiInventoryDashboard {
  totalItems: number; lowStockCount: number; outOfStockCount: number;
  pendingPOs: number; pendingGRNs: number;
  lowStockItems: Pick<ApiInventoryItem, "id"|"name"|"category"|"currentQty"|"reorderLevel"|"unit">[];
  recentMovements: ApiStockMovement[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const inventoryApi = {
  dashboard: (stationId?: string | null) =>
    api.get<R<ApiInventoryDashboard>>(`/inventory/dashboard`, sh(stationId)),

  suppliers: {
    list:   (stationId?: string | null, params?: { category?: string; status?: string }) =>
              api.get<R<ApiSupplier[]>>(`/inventory/suppliers${qs(params ?? {})}`, sh(stationId)),
    create: (data: Partial<ApiSupplier>, stationId?: string | null) =>
              api.post<R<ApiSupplier>>("/inventory/suppliers", data, sh(stationId)),
    update: (id: string, data: Partial<ApiSupplier>) =>
              api.put<R<ApiSupplier>>(`/inventory/suppliers/${id}`, data),
    delete: (id: string) =>
              api.delete<R<null>>(`/inventory/suppliers/${id}`),
  },

  items: {
    list:        (stationId?: string | null, params?: Record<string, string | number | boolean>) =>
                   api.get<RL<ApiInventoryItem[]>>(`/inventory/items${qs(params ?? {})}`, sh(stationId)),
    get:         (id: string) => api.get<R<ApiInventoryItem>>(`/inventory/items/${id}`),
    create:      (data: Partial<ApiInventoryItem>, stationId?: string | null) =>
                   api.post<R<ApiInventoryItem>>("/inventory/items", data, sh(stationId)),
    update:      (id: string, data: Partial<ApiInventoryItem>) =>
                   api.put<R<ApiInventoryItem>>(`/inventory/items/${id}`, data),
    delete:      (id: string) => api.delete<R<null>>(`/inventory/items/${id}`),
    adjust:      (id: string, data: { type: string; qty: number; notes?: string; reference?: string }) =>
                   api.post<R<ApiInventoryItem>>(`/inventory/items/${id}/adjust`, data),
  },

  movements: {
    list: (stationId?: string | null, params?: Record<string, string | number>) =>
            api.get<RL<ApiStockMovement[]>>(`/inventory/movements${qs(params ?? {})}`, sh(stationId)),
  },

  po: {
    list:   (stationId?: string | null, params?: Record<string, string | number>) =>
              api.get<RL<ApiPurchaseOrder[]>>(`/inventory/po${qs(params ?? {})}`, sh(stationId)),
    get:    (id: string) => api.get<R<ApiPurchaseOrder>>(`/inventory/po/${id}`),
    create: (data: { supplierId?: string; supplierName?: string; expectedDate?: string; notes?: string; items: Partial<ApiPOItem>[] }, stationId?: string | null) =>
              api.post<R<ApiPurchaseOrder>>("/inventory/po", data, sh(stationId)),
    update: (id: string, data: Partial<ApiPurchaseOrder>) =>
              api.put<R<ApiPurchaseOrder>>(`/inventory/po/${id}`, data),
  },

  grn: {
    list:   (stationId?: string | null, params?: Record<string, string | number>) =>
              api.get<RL<ApiGoodsReceipt[]>>(`/inventory/grn${qs(params ?? {})}`, sh(stationId)),
    create: (data: { poId?: string; supplierName?: string; receiptDate?: string; notes?: string; receivedBy?: string; items: Partial<ApiGRNItem>[] }, stationId?: string | null) =>
              api.post<R<ApiGoodsReceipt>>("/inventory/grn", data, sh(stationId)),
    post:   (id: string) => api.post<R<ApiGoodsReceipt>>(`/inventory/grn/${id}/post`, {}),
  },
};
