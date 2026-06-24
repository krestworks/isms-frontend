import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search, ScanBarcode, Plus, Minus, Trash2, ShoppingCart, CreditCard,
  Printer, X, CheckCircle2, Tag, ChevronUp,
  Smartphone, Loader2, QrCode, AlertCircle, Monitor,
  LayoutGrid, List, Package, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  bizApi, ApiBizBusiness, ApiBizProduct, ApiBizCategory,
  ApiBizSaleItem, ApiBizSale, ApiPaymentInitiated,
} from "@/lib/bizApi";
import { useSession } from "@/data/sessionStore";
import { brandingStore } from "@/data/brandingStore";
import { POSSessionManager } from "./POSSessionManager";
import { posSessionStore } from "@/data/posSessionStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  markedPrice: number;
  discount: number;
  totalPrice: number;
}

type PayPhase = "idle" | "initiating" | "awaiting" | "completed" | "failed";
type CardMode  = "remote" | "in-person";
type ViewMode  = "grid" | "list";
type StockFilter = "all" | "in" | "low" | "out";

interface Props { business: ApiBizBusiness; }

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS  = 5 * 60_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcTotal(item: CartItem) {
  return Math.max(0, item.qty * item.unitPrice - item.discount);
}

function qrCodeUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`;
}

function fmt(n: number) { return n.toLocaleString(); }

function ProductImage({ product }: { product: ApiBizProduct }) {
  if (product.imageUrl) {
    return <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />;
  }
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted/60 to-muted">
      <span className="text-xl font-bold text-muted-foreground/50">
        {product.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function POSTab({ business }: Props) {
  const { user, activeLocation } = useSession();

  // Data
  const [products,   setProducts]   = useState<ApiBizProduct[]>([]);
  const [categories, setCategories] = useState<ApiBizCategory[]>([]);
  const [sales,      setSales]      = useState<ApiBizSale[]>([]);

  // Session
  const [session, setSession] = useState(() => posSessionStore.get(business.id));
  useEffect(() => {
    const unsub = posSessionStore.subscribe(business.id, () => setSession(posSessionStore.get(business.id)));
    return unsub;
  }, [business.id]);

  // Cart
  const [cart,         setCart]         = useState<CartItem[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // View / search / filter
  const [viewMode,     setViewMode]     = useState<ViewMode>("grid");
  const [search,       setSearch]       = useState("");
  const [activeCat,    setActiveCat]    = useState("all");
  const [stockFilter,  setStockFilter]  = useState<StockFilter>("all");

  // Barcode scanner
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Payment dialog
  const [payOpen,    setPayOpen]    = useState(false);
  const [payMethod,  setPayMethod]  = useState("Cash");
  const [cardMode,   setCardMode]   = useState<CardMode>("remote");
  const [amountPaid, setAmountPaid] = useState("");
  const [cashier,    setCashier]    = useState("");
  const [notes,      setNotes]      = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Payment gateway state
  const [payPhase,   setPayPhase]   = useState<PayPhase>("idle");
  const [payInitData, setPayInitData] = useState<ApiPaymentInitiated | null>(null);
  const pollTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef  = useRef<number>(0);

  // Receipt
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale,    setLastSale]    = useState<ApiBizSale | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // ── Load products & categories ─────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        bizApi.products.list(business.id, { status: "active" }),
        bizApi.categories.list(business.id),
        bizApi.sales.list(business.id).catch(() => ({ data: [] as ApiBizSale[] })),
      ]);
      setProducts(pRes.data ?? []);
      setCategories(cRes.data ?? []);
      setSales(sRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load products"); }
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  // ── Barcode scanner ────────────────────────────────────────────────────────

  const handleBarcodeKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = barcodeInput.trim();
    setBarcodeInput("");
    if (!code) return;
    try {
      const res = await bizApi.products.findByBarcode(business.id, code);
      const product = res.data;
      if (!product) { toast.error(`No product found for: ${code}`); return; }
      addToCart(product);
      toast.success(`Added: ${product.name}`);
    } catch {
      toast.error(`No product found for barcode: ${code}`);
    }
  };

  // ── Cart helpers ───────────────────────────────────────────────────────────

  const addToCart = (p: ApiBizProduct) => {
    if (p.stockQty <= 0) { toast.error(`${p.name} is out of stock`); return; }
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        if (existing.qty >= p.stockQty) { toast.error("Not enough stock"); return prev; }
        return prev.map(i => i.productId === p.id
          ? { ...i, qty: i.qty + 1, totalPrice: calcTotal({ ...i, qty: i.qty + 1 }) }
          : i);
      }
      return [...prev, {
        productId: p.id, name: p.name, qty: 1,
        unitPrice: p.price, markedPrice: p.markedPrice ?? 0,
        discount: 0, totalPrice: p.price,
      }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => {
        if (i.productId !== productId) return i;
        const qty = i.qty + delta;
        if (qty <= 0) return null as any;
        return { ...i, qty, totalPrice: calcTotal({ ...i, qty }) };
      })
      .filter(Boolean));
  };

  const setItemDiscount = (productId: string, disc: number) => {
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const discount = Math.min(disc, i.qty * i.unitPrice);
      return { ...i, discount, totalPrice: calcTotal({ ...i, discount }) };
    }));
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
    if (expandedItem === productId) setExpandedItem(null);
  };

  const clearCart = () => {
    setCart([]); setOrderDiscount(0); setAmountPaid(""); setNotes("");
    setCustomerPhone(""); setExpandedItem(null);
  };

  // ── Totals ─────────────────────────────────────────────────────────────────

  const subtotal  = cart.reduce((s, i) => s + i.totalPrice, 0);
  const taxAmount = Math.round((subtotal - orderDiscount) * business.taxRate / 100 * 100) / 100;
  const total     = Math.max(0, subtotal - orderDiscount + taxAmount);
  const paid      = parseFloat(amountPaid) || 0;
  const change    = Math.max(0, paid - total);

  // ── Filtered products ──────────────────────────────────────────────────────

  const visible = products.filter(p => {
    if (activeCat !== "all" && p.categoryId !== activeCat) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.sku ?? "").toLowerCase().includes(q)) return false;
    }
    if (stockFilter === "in")  return p.stockQty > p.reorderLevel;
    if (stockFilter === "low") return p.stockQty > 0 && p.stockQty <= p.reorderLevel;
    if (stockFilter === "out") return p.stockQty <= 0;
    return true;
  });

  // ── Poll helpers ───────────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  };

  const startPolling = (trackingId: string) => {
    stopPolling();
    pollStartRef.current = Date.now();
    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        stopPolling(); setPayPhase("failed");
        toast.error("Payment timed out. Ask customer to check their phone / try again.");
        return;
      }
      try {
        const res = await bizApi.payments.checkStatus(trackingId);
        const { status, sale } = res.data;
        if (status === "Completed" && sale) {
          stopPolling(); setPayPhase("completed");
          setLastSale(sale); setPayOpen(false); setReceiptOpen(true);
          clearCart(); load();
        } else if (["Failed", "Invalid", "Reversed"].includes(status)) {
          stopPolling(); setPayPhase("failed");
          toast.error(`Payment ${status.toLowerCase()}. Please try again.`);
        }
      } catch { /* network blip — keep polling */ }
    }, POLL_INTERVAL_MS);
  };

  useEffect(() => () => stopPolling(), []);

  // ── Cancel Pesapal payment ─────────────────────────────────────────────────

  const handleCancelPayment = async () => {
    stopPolling();
    if (payInitData) {
      try { await bizApi.payments.cancel(payInitData.saleId); } catch { /* best-effort */ }
    }
    setPayPhase("idle"); setPayInitData(null);
  };

  // ── Open payment dialog ────────────────────────────────────────────────────

  const openPayDialog = () => {
    if (!session || session.status !== "open") {
      toast.error("Open a cashier session before processing sales");
      return;
    }
    setCashier(session.cashier || user.name || "");
    setPayPhase("idle"); setPayInitData(null); setPayOpen(true);
  };

  // ── Checkout — cash / credit / in-person card ──────────────────────────────

  const handleCashCheckout = async () => {
    if (!cart.length) { toast.error("Cart is empty"); return; }
    if (paid > 0 && paid < total) {
      toast.error(`Amount paid (${fmt(paid)}) is less than total (${fmt(total)})`); return;
    }
    try {
      const saleItems: ApiBizSaleItem[] = cart.map(i => ({
        productId: i.productId, name: i.name, qty: i.qty,
        unitPrice: i.unitPrice, discount: i.discount, totalPrice: i.totalPrice,
      }));
      const res = await bizApi.sales.create({
        businessId: business.id,
        items: saleItems,
        subtotal, discount: orderDiscount,
        taxRate: business.taxRate, taxAmount, totalAmount: total,
        paymentMethod: payMethod,
        amountPaid: paid || total, change,
        cashier: cashier || undefined,
        notes: notes || undefined,
        status: "paid",
      });
      setLastSale(res.data); setPayOpen(false); setReceiptOpen(true);
      setSales(prev => [...prev, res.data]);
      clearCart(); load();
    } catch (e: any) { toast.error(e?.message || "Sale failed"); }
  };

  // ── Checkout — M-Pesa or Card-remote (via Pesapal) ────────────────────────

  const handlePesapalCheckout = async () => {
    if (!cart.length) { toast.error("Cart is empty"); return; }
    if (payMethod === "M-Pesa" && !customerPhone.trim()) {
      toast.error("Enter the customer's M-Pesa phone number"); return;
    }
    setPayPhase("initiating");
    try {
      const saleItems: ApiBizSaleItem[] = cart.map(i => ({
        productId: i.productId, name: i.name, qty: i.qty,
        unitPrice: i.unitPrice, discount: i.discount, totalPrice: i.totalPrice,
      }));
      const res = await bizApi.payments.initiate({
        businessId: business.id,
        items: saleItems,
        subtotal, discount: orderDiscount,
        taxRate: business.taxRate, taxAmount, totalAmount: total,
        paymentMethod: payMethod as "M-Pesa" | "Card",
        customerPhone: customerPhone.trim() || undefined,
        cashier: cashier || undefined,
        notes: notes || undefined,
      });
      setPayInitData(res.data); setPayPhase("awaiting");
      startPolling(res.data.trackingId);
    } catch (e: any) {
      setPayPhase("idle"); toast.error(e?.message || "Failed to initiate payment");
    }
  };

  // ── Print receipt ──────────────────────────────────────────────────────────

  const handlePrint = () => {
    if (!lastSale) return;
    const b = brandingStore.get();
    const branch = activeLocation !== "All Locations" ? activeLocation : "";
    const logoHtml = b?.logo ? `<img src="${b.logo}" style="height:40px;width:40px;object-fit:contain;border-radius:4px;margin-right:8px">` : "";
    const header = `
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px dashed #555;padding-bottom:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center">
          ${logoHtml}
          <div>
            <div style="font-size:14px;font-weight:700">${b?.name ?? business.name}</div>
            ${b?.tagline ? `<div style="font-size:10px;color:#666">${b.tagline}</div>` : ""}
            ${b?.address ? `<div style="font-size:10px;color:#666">${b.address}</div>` : ""}
          </div>
        </div>
        ${branch ? `<div style="font-size:10px;color:#555;text-align:right">${branch}</div>` : ""}
      </div>`;
    const content = receiptRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=380,height=680");
    if (!win) return;
    win.document.write(`<html><head><title>Receipt — ${b?.name ?? business.name}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;font-size:12px;padding:16px;max-width:320px;margin:auto;color:#111}
      .center{text-align:center} .bold{font-weight:700} .line{border-top:1px dashed #555;margin:6px 0}
      table{width:100%} td,th{padding:2px 0;vertical-align:top} .right{text-align:right}
      .total-row{font-weight:700;font-size:13px;border-top:1px dashed #555;padding-top:4px}
    </style></head><body>${header}${content}</body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const isPesapalMethod  = payMethod === "M-Pesa" || (payMethod === "Card" && cardMode === "remote");
  const isImmediateMethod = !isPesapalMethod;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      <POSSessionManager business={business} sales={sales} />

    <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[540px]">

      {/* ── Product Panel ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">

        {/* Toolbar row */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 bg-muted/50"
              placeholder="Search products or SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative w-40">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={barcodeRef}
              className="pl-9 bg-muted/50 font-mono text-sm"
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeKey}
            />
          </div>
          {/* View mode toggle */}
          <div className="flex border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 flex items-center ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"}`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 flex items-center ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"}`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Category pills + stock filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none items-center">
          <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {/* Stock status */}
          {(["all", "in", "low", "out"] as StockFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setStockFilter(f)}
              className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                stockFilter === f
                  ? f === "out" ? "bg-destructive text-destructive-foreground border-destructive"
                    : f === "low" ? "bg-amber-500 text-white border-amber-500"
                    : "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}
            >
              {f === "all" ? "All Stock" : f === "in" ? "In Stock" : f === "low" ? "Low Stock" : "Out"}
            </button>
          ))}
          <div className="h-4 w-px bg-border mx-1 shrink-0" />
          {/* Category */}
          <button
            onClick={() => setActiveCat("all")}
            className={`shrink-0 px-3 py-0.5 rounded-full text-xs font-medium transition-colors border ${
              activeCat === "all" ? "bg-secondary text-secondary-foreground border-secondary" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
            }`}
          >All</button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              style={activeCat === cat.id && cat.color ? { backgroundColor: cat.color + "22", borderColor: cat.color, color: cat.color } : {}}
              className={`shrink-0 px-3 py-0.5 rounded-full text-xs font-medium transition-colors border ${
                activeCat === cat.id ? "border" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}
            >{cat.name}</button>
          ))}
        </div>

        {/* Product display */}
        <ScrollArea className="flex-1">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs mt-1 opacity-70">Try a different search, category, or stock filter</p>
            </div>
          ) : viewMode === "grid" ? (
            /* ── Grid View ── */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-2">
              {visible.map(p => {
                const inCart     = cart.find(i => i.productId === p.id);
                const hasMarkup  = p.markedPrice > 0 && p.markedPrice > p.price;
                const outOfStock = p.stockQty <= 0;
                const lowStock   = !outOfStock && p.stockQty <= p.reorderLevel;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`relative text-left rounded-xl border transition-all overflow-hidden ${
                      outOfStock ? "opacity-50 cursor-not-allowed bg-muted/30" :
                      inCart ? "border-primary/60 bg-primary/5 shadow-sm" :
                      "bg-card hover:shadow-sm hover:border-primary/30"
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-1.5 right-1.5 z-10 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                        {inCart.qty}
                      </div>
                    )}
                    {/* Product image */}
                    <div className="h-20 w-full overflow-hidden">
                      <ProductImage product={p} />
                    </div>
                    <div className="p-2.5">
                      <div className="font-medium text-xs leading-tight line-clamp-2 mb-1.5">{p.name}</div>
                      <div className="space-y-0.5">
                        {hasMarkup && <p className="text-[10px] text-muted-foreground line-through">Ksh {fmt(p.markedPrice)}</p>}
                        <p className="font-bold text-primary text-sm">Ksh {fmt(p.price)}</p>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <Badge
                          variant={outOfStock ? "destructive" : lowStock ? "secondary" : "outline"}
                          className="text-[10px] py-0"
                        >
                          {outOfStock ? "Out" : `${p.stockQty} ${p.unit}`}
                        </Badge>
                        {p.sku && <span className="text-[10px] text-muted-foreground font-mono truncate">{p.sku}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── List View ── */
            <div className="space-y-0.5 pb-2">
              {/* Header row */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide border-b">
                <span className="w-8" />
                <span>Product</span>
                <span className="text-right w-16">Price</span>
                <span className="text-center w-16">Stock</span>
                <span className="w-6" />
              </div>
              {visible.map(p => {
                const inCart     = cart.find(i => i.productId === p.id);
                const outOfStock = p.stockQty <= 0;
                const lowStock   = !outOfStock && p.stockQty <= p.reorderLevel;
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center px-3 py-2 rounded-lg transition-colors ${
                      outOfStock ? "opacity-50" : "hover:bg-muted/40 cursor-pointer"
                    } ${inCart ? "bg-primary/5 border border-primary/20" : ""}`}
                    onClick={() => !outOfStock && addToCart(p)}
                  >
                    {/* Thumbnail */}
                    <div className="h-8 w-8 rounded-md overflow-hidden shrink-0">
                      <ProductImage product={p} />
                    </div>
                    {/* Name + SKU */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {p.categoryName ?? "Uncategorised"}{p.sku ? ` · ${p.sku}` : ""}
                      </p>
                    </div>
                    {/* Price */}
                    <div className="text-right w-16 shrink-0">
                      <p className="font-bold text-sm text-primary">Ksh {fmt(p.price)}</p>
                      {p.markedPrice > p.price && <p className="text-[10px] text-muted-foreground line-through">Ksh {fmt(p.markedPrice)}</p>}
                    </div>
                    {/* Stock */}
                    <div className="text-center w-16 shrink-0">
                      <Badge
                        variant={outOfStock ? "destructive" : lowStock ? "secondary" : "outline"}
                        className="text-[10px] py-0"
                      >
                        {outOfStock ? "Out" : `${p.stockQty} ${p.unit}`}
                      </Badge>
                    </div>
                    {/* Cart badge */}
                    <div className="w-6 flex justify-center">
                      {inCart && (
                        <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Cart Panel ── */}
      <div className="w-[300px] xl:w-80 shrink-0 flex flex-col rounded-xl border bg-card shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Cart</span>
            {cart.length > 0 && <Badge className="h-5 min-w-5 text-[10px] px-1.5">{cart.length}</Badge>}
          </div>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2" onClick={clearCart}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-xs">Cart is empty</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {cart.map(item => (
                <div key={item.productId} className="rounded-lg border bg-background">
                  <div className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-tight">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Ksh {fmt(item.unitPrice)} × {item.qty}
                        {item.discount > 0 && <span className="text-green-600 ml-1">−{fmt(item.discount)}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQty(item.productId, -1)}><Minus className="h-2.5 w-2.5" /></Button>
                      <span className="text-xs w-5 text-center font-semibold">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQty(item.productId, 1)}><Plus className="h-2.5 w-2.5" /></Button>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-xs font-bold w-16 text-right">Ksh {fmt(item.totalPrice)}</span>
                      <button
                        className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-primary"
                        onClick={() => setExpandedItem(expandedItem === item.productId ? null : item.productId)}
                        title="Set item discount"
                      >
                        {expandedItem === item.productId ? <ChevronUp className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                      </button>
                      <button className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => removeItem(item.productId)}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {expandedItem === item.productId && (
                    <div className="px-2.5 pb-2 border-t pt-2 bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                        <Label className="text-[10px] text-muted-foreground shrink-0">Item Discount (Ksh)</Label>
                        <Input
                          type="number" min={0} max={item.qty * item.unitPrice}
                          value={item.discount || ""}
                          onChange={e => setItemDiscount(item.productId, +e.target.value)}
                          className="h-6 text-xs"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t space-y-3">
          {cart.length > 0 && (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span>Ksh {fmt(subtotal)}</span>
              </div>
              {cart.some(i => i.discount > 0) && (
                <div className="flex justify-between text-green-600">
                  <span>Item Discounts</span>
                  <span>− Ksh {fmt(cart.reduce((s, i) => s + i.discount, 0))}</span>
                </div>
              )}
              {orderDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Order Discount</span>
                  <span>− Ksh {fmt(orderDiscount)}</span>
                </div>
              )}
              {business.taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({business.taxRate}%)</span>
                  <span>Ksh {fmt(taxAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-sm text-foreground">
                <span>Total</span>
                <span className="text-primary">Ksh {fmt(total)}</span>
              </div>
            </div>
          )}
          <Button
            className="w-full h-10 font-semibold"
            disabled={cart.length === 0}
            onClick={openPayDialog}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {cart.length === 0 ? "Cart Empty" : `Checkout — Ksh ${fmt(total)}`}
          </Button>
        </div>
      </div>

      {/* ── Payment Dialog ── */}
      <Dialog open={payOpen} onOpenChange={open => {
        if (!open && payPhase === "awaiting") return;
        setPayOpen(open);
        if (!open) { stopPolling(); setPayPhase("idle"); setPayInitData(null); }
      }}>
        <DialogContent className="max-w-sm overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {payPhase === "awaiting" ? "Awaiting Payment..." : "Complete Payment"}
            </DialogTitle>
          </DialogHeader>

          {payPhase === "idle" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
                <p className="text-4xl font-bold text-primary">Ksh {fmt(total)}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {["Cash", "M-Pesa", "Card", "Credit"].map(m => (
                    <button
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        payMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      {m === "M-Pesa" && <Smartphone className="h-3.5 w-3.5" />}
                      {m === "Card"   && <CreditCard  className="h-3.5 w-3.5" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {payMethod === "Card" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Card Type</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    <button onClick={() => setCardMode("remote")} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${cardMode === "remote" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50"}`}>
                      <QrCode className="h-3.5 w-3.5" />Remote / QR
                    </button>
                    <button onClick={() => setCardMode("in-person")} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${cardMode === "in-person" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50"}`}>
                      <Monitor className="h-3.5 w-3.5" />In-Person
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {cardMode === "remote" ? "Customer scans Pesapal QR code on their phone." : "Customer pays on your card reader — confirm after terminal approves."}
                  </p>
                </div>
              )}

              {payMethod === "M-Pesa" && (
                <div>
                  <Label>Customer M-Pesa Number</Label>
                  <Input placeholder="e.g. 0712 345 678" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="mt-1" type="tel" autoFocus />
                  <p className="text-[11px] text-muted-foreground mt-1">An STK push will be sent to this number via Pesapal.</p>
                </div>
              )}

              {isImmediateMethod && (
                <>
                  <div>
                    <Label>Amount Received (Ksh)</Label>
                    <Input type="number" placeholder={`${total}`} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="mt-1" autoFocus={payMethod === "Cash" || payMethod === "Credit"} />
                  </div>
                  {paid >= total && paid > 0 && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
                      <span className="text-sm text-green-700">Change</span>
                      <span className="text-xl font-bold text-green-600">Ksh {fmt(change)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Cashier</Label>
                  <Input placeholder="Staff name" value={cashier} onChange={e => setCashier(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Order Discount (Ksh)</Label>
                  <Input type="number" value={orderDiscount || ""} onChange={e => setOrderDiscount(+e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                <Input placeholder="e.g. table 4, customer name..." value={notes} onChange={e => setNotes(e.target.value)} className="mt-1" />
              </div>

              {isImmediateMethod ? (
                <Button className="w-full h-10" onClick={handleCashCheckout}>Confirm Sale</Button>
              ) : (
                <Button className="w-full h-10" onClick={handlePesapalCheckout}>
                  {payMethod === "M-Pesa" ? <><Smartphone className="h-4 w-4 mr-2" />Send STK Push</> : <><QrCode className="h-4 w-4 mr-2" />Generate Payment Link</>}
                </Button>
              )}
            </div>
          )}

          {payPhase === "initiating" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-center">Connecting to Pesapal...</p>
              <p className="text-xs text-muted-foreground text-center">Please wait while we set up the payment.</p>
            </div>
          )}

          {payPhase === "awaiting" && payInitData && (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Amount</p>
                <p className="text-3xl font-bold text-primary">Ksh {fmt(payInitData.amount)}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{payInitData.saleRef}</p>
              </div>
              {payMethod === "M-Pesa" && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">STK Push Sent</p>
                      <p className="text-xs text-muted-foreground">Customer should see a prompt on <strong>{customerPhone}</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    Waiting for customer to enter M-Pesa PIN...
                  </div>
                </div>
              )}
              {payMethod === "Card" && payInitData.redirectUrl && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-semibold text-center">Customer Payment QR</p>
                  <div className="flex justify-center">
                    <img src={qrCodeUrl(payInitData.redirectUrl)} alt="Payment QR Code" className="rounded-lg border w-44 h-44" />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">Customer scans this QR code with their phone to complete payment via Pesapal.</p>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => window.open(payInitData.redirectUrl, "_blank")}>
                    <QrCode className="h-3.5 w-3.5 mr-1.5" />Open Payment Link
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    Waiting for payment confirmation...
                  </div>
                </div>
              )}
              <Button variant="outline" className="w-full" onClick={handleCancelPayment}>Cancel Payment</Button>
            </div>
          )}

          {payPhase === "failed" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4 flex flex-col items-center gap-2">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-semibold text-destructive">Payment Failed</p>
                <p className="text-xs text-muted-foreground text-center">The payment was not completed. Please try again or use a different payment method.</p>
              </div>
              <Button className="w-full" onClick={() => setPayPhase("idle")}>Try Again</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Receipt Dialog ── */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Sale Complete
            </DialogTitle>
          </DialogHeader>
          {lastSale && (
            <>
              <div ref={receiptRef} className="font-mono text-xs space-y-0.5 p-4 border rounded-xl bg-white">
                {/* Branded receipt header */}
                {(() => {
                  const b = brandingStore.get();
                  const branch = activeLocation !== "All Locations" ? activeLocation : null;
                  return (
                    <div className="not-mono mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        {b?.logo && <img src={b.logo} alt="" className="h-8 w-8 object-contain rounded" />}
                        <div>
                          <p className="font-bold text-sm text-foreground">{b?.name ?? business.name}</p>
                          {b?.tagline && <p className="text-[10px] text-muted-foreground">{b.tagline}</p>}
                          {b?.address && <p className="text-[10px] text-muted-foreground">{b.address}</p>}
                        </div>
                        {branch && <p className="ml-auto text-[10px] text-muted-foreground text-right">{branch}</p>}
                      </div>
                      {business.receiptHeader && <p className="text-center text-[10px] text-muted-foreground">{business.receiptHeader}</p>}
                      <div className="border-t border-dashed my-1.5" />
                    </div>
                  );
                })()}
                <div className="flex justify-between"><span>Receipt:</span><span>{lastSale.saleRef}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{lastSale.date}</span></div>
                {lastSale.cashier && <div className="flex justify-between"><span>Cashier:</span><span>{lastSale.cashier}</span></div>}
                {lastSale.customerPhone && <div className="flex justify-between"><span>M-Pesa:</span><span>{lastSale.customerPhone}</span></div>}
                {lastSale.notes && <div className="flex justify-between"><span>Note:</span><span>{lastSale.notes}</span></div>}
                <div className="border-t border-dashed my-1" />
                <table className="w-full">
                  <tbody>
                    {(lastSale.items ?? []).map((item: ApiBizSaleItem, i: number) => (
                      <tr key={i}>
                        <td className="pr-1">{item.name}</td>
                        <td className="text-right whitespace-nowrap">{item.qty}×{fmt(item.unitPrice)}</td>
                        <td className="text-right pl-2 whitespace-nowrap font-bold">{fmt(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-dashed my-1" />
                <div className="flex justify-between"><span>Subtotal:</span><span>Ksh {fmt(lastSale.subtotal)}</span></div>
                {lastSale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-Ksh {fmt(lastSale.discount)}</span></div>}
                {lastSale.taxAmount > 0 && <div className="flex justify-between"><span>Tax ({lastSale.taxRate}%):</span><span>Ksh {fmt(lastSale.taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-sm border-t border-dashed pt-1"><span>TOTAL:</span><span>Ksh {fmt(lastSale.totalAmount)}</span></div>
                <div className="flex justify-between"><span>Paid ({lastSale.paymentMethod}):</span><span>Ksh {fmt(lastSale.amountPaid)}</span></div>
                {lastSale.change > 0 && <div className="flex justify-between"><span>Change:</span><span>Ksh {fmt(lastSale.change)}</span></div>}
                <div className="border-t border-dashed my-1" />
                {business.receiptFooter && <p className="text-center">{business.receiptFooter}</p>}
                <p className="text-center text-muted-foreground">Thank you for your business!</p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" className="flex-1" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />Print Receipt
                </Button>
                <Button className="flex-1" onClick={() => setReceiptOpen(false)}>
                  New Sale
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
