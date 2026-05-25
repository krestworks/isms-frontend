import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Printer, X, CheckCircle2, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizProduct, ApiBizCategory, ApiBizSaleItem } from "@/lib/bizApi";

interface CartItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  markedPrice: number;
  discount: number;   // item-level discount amount (Ksh)
  totalPrice: number;
}

interface Props { business: ApiBizBusiness; }

const PAY_METHODS = ["Cash", "M-Pesa", "Card", "Credit"];

function calcTotal(item: CartItem) {
  return Math.max(0, item.qty * item.unitPrice - item.discount);
}

export function POSTab({ business }: Props) {
  const [products,    setProducts]    = useState<ApiBizProduct[]>([]);
  const [categories,  setCategories]  = useState<ApiBizCategory[]>([]);
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [search,      setSearch]      = useState("");
  const [activeCat,   setActiveCat]   = useState<string>("all");
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [payMethod,   setPayMethod]   = useState("Cash");
  const [amountPaid,  setAmountPaid]  = useState("");
  const [cashier,     setCashier]     = useState("");
  const [notes,       setNotes]       = useState("");
  const [payOpen,     setPayOpen]     = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastSale,    setLastSale]    = useState<any>(null);
  const [processing,  setProcessing]  = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        bizApi.products.list(business.id, { status: "active" }),
        bizApi.categories.list(business.id),
      ]);
      setProducts(pRes.data ?? []);
      setCategories(cRes.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load products"); }
  }, [business.id]);

  useEffect(() => { load(); }, [load]);

  // ── Cart ──────────────────────────────────────────────────────────────────

  const addToCart = (p: ApiBizProduct) => {
    if (p.stockQty <= 0) return toast.error(`${p.name} is out of stock`);
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

  const clearCart = () => { setCart([]); setOrderDiscount(0); setAmountPaid(""); setNotes(""); setExpandedItem(null); };

  // ── Totals ────────────────────────────────────────────────────────────────

  const subtotal    = cart.reduce((s, i) => s + i.totalPrice, 0);
  const taxAmount   = Math.round((subtotal - orderDiscount) * business.taxRate / 100 * 100) / 100;
  const total       = Math.max(0, subtotal - orderDiscount + taxAmount);
  const paid        = parseFloat(amountPaid) || 0;
  const change      = Math.max(0, paid - total);

  // ── Filtered products ─────────────────────────────────────────────────────

  const visible = products.filter(p => {
    const matchCat    = activeCat === "all" || p.categoryId === activeCat;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Checkout ──────────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (!cart.length) return toast.error("Cart is empty");
    if (paid > 0 && paid < total) return toast.error(`Amount paid (${paid.toLocaleString()}) is less than total (${total.toLocaleString()})`);
    setProcessing(true);
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
        amountPaid: paid || total,
        change,
        cashier: cashier || undefined,
        notes: notes || undefined,
        status: "paid",
      });
      setLastSale(res.data);
      setPayOpen(false);
      setReceiptOpen(true);
      clearCart();
      load();
    } catch (e: any) { toast.error(e?.message || "Sale failed"); }
    finally { setProcessing(false); }
  };

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=380,height=620");
    if (!win) return;
    win.document.write(`<html><head><title>Receipt — ${business.name}</title><style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Courier New',monospace;font-size:12px;padding:16px;max-width:320px;margin:auto;color:#111}
      .center{text-align:center} .bold{font-weight:700} .line{border-top:1px dashed #555;margin:6px 0}
      table{width:100%} td,th{padding:2px 0;vertical-align:top} .right{text-align:right}
      .title{font-size:15px;font-weight:700;text-align:center;margin-bottom:2px}
      .sub{font-size:11px;text-align:center;color:#555}
      .total-row{font-weight:700;font-size:13px;border-top:1px dashed #555;padding-top:4px}
    </style></head><body>${content}</body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[580px]">

      {/* ── Product Grid ── */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 bg-muted/50" placeholder="Search products or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Category pills */}
        <ScrollArea className="h-8" orientation="horizontal">
          <div className="flex gap-1.5 pb-0.5">
            <button
              onClick={() => setActiveCat("all")}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeCat === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >All</button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                style={activeCat === c.id && c.color ? { backgroundColor: c.color + "22", borderColor: c.color, color: c.color } : {}}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${activeCat === c.id ? "border" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Product Cards */}
        <ScrollArea className="flex-1">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No products found</p>
              <p className="text-xs mt-1 opacity-70">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pb-2">
              {visible.map(p => {
                const inCart = cart.find(i => i.productId === p.id);
                const hasMarkup = p.markedPrice > 0 && p.markedPrice > p.price;
                const outOfStock = p.stockQty <= 0;
                const lowStock   = !outOfStock && p.stockQty <= p.reorderLevel;

                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={outOfStock}
                    className={`relative text-left p-3 rounded-xl border transition-all ${
                      outOfStock ? "opacity-50 cursor-not-allowed bg-muted/30" :
                      inCart ? "border-primary/60 bg-primary/5 shadow-sm" :
                      "bg-card hover:shadow-sm hover:border-primary/30"
                    }`}
                  >
                    {inCart && (
                      <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow">
                        {inCart.qty}
                      </div>
                    )}
                    <div className="font-medium text-sm leading-tight line-clamp-2 mb-2">{p.name}</div>
                    <div className="space-y-0.5">
                      {hasMarkup && (
                        <p className="text-xs text-muted-foreground line-through">Ksh {p.markedPrice.toLocaleString()}</p>
                      )}
                      <p className="font-bold text-primary text-sm">Ksh {p.price.toLocaleString()}</p>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-1">
                      <Badge
                        variant={outOfStock ? "destructive" : lowStock ? "secondary" : "outline"}
                        className="text-[10px] py-0"
                      >
                        {outOfStock ? "Out" : `${p.stockQty} ${p.unit}`}
                      </Badge>
                      {p.sku && <span className="text-[10px] text-muted-foreground font-mono truncate">{p.sku}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ── Cart Panel ── */}
      <div className="w-[300px] xl:w-80 shrink-0 flex flex-col rounded-xl border bg-card shadow-sm">

        {/* Cart header */}
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

        {/* Cart Items */}
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
                        Ksh {item.unitPrice.toLocaleString()} × {item.qty}
                        {item.discount > 0 && <span className="text-green-600 ml-1">−{item.discount.toLocaleString()}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQty(item.productId, -1)}><Minus className="h-2.5 w-2.5" /></Button>
                      <span className="text-xs w-5 text-center font-semibold">{item.qty}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateQty(item.productId, 1)}><Plus className="h-2.5 w-2.5" /></Button>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <span className="text-xs font-bold w-16 text-right">Ksh {item.totalPrice.toLocaleString()}</span>
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

        {/* Totals + Checkout */}
        <div className="p-3 border-t space-y-3">
          {cart.length > 0 && (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span>Ksh {subtotal.toLocaleString()}</span>
              </div>
              {cart.some(i => i.discount > 0) && (
                <div className="flex justify-between text-green-600">
                  <span>Item Discounts</span>
                  <span>− Ksh {cart.reduce((s, i) => s + i.discount, 0).toLocaleString()}</span>
                </div>
              )}
              {orderDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Order Discount</span>
                  <span>− Ksh {orderDiscount.toLocaleString()}</span>
                </div>
              )}
              {business.taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax ({business.taxRate}%)</span>
                  <span>Ksh {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-sm text-foreground">
                <span>Total</span>
                <span className="text-primary">Ksh {total.toLocaleString()}</span>
              </div>
            </div>
          )}
          <Button
            className="w-full h-10 font-semibold"
            disabled={cart.length === 0}
            onClick={() => setPayOpen(true)}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {cart.length === 0 ? "Cart Empty" : `Checkout — Ksh ${total.toLocaleString()}`}
          </Button>
        </div>
      </div>

      {/* ── Payment Dialog ── */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Complete Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Total highlight */}
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
              <p className="text-4xl font-bold text-primary">Ksh {total.toLocaleString()}</p>
            </div>

            {/* Payment method grid */}
            <div>
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {PAY_METHODS.map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${payMethod === m ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted/50"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Amount Received (Ksh)</Label>
              <Input type="number" placeholder={`${total}`} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="mt-1" autoFocus />
            </div>

            {paid >= total && paid > 0 && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
                <span className="text-sm text-green-700">Change</span>
                <span className="text-xl font-bold text-green-600">Ksh {change.toLocaleString()}</span>
              </div>
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

            <Button className="w-full h-10" onClick={handleCheckout} disabled={processing}>
              {processing ? "Processing..." : "Confirm Sale"}
            </Button>
          </div>
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
                {business.receiptHeader && <p className="text-center mb-1">{business.receiptHeader}</p>}
                <p className="title">{business.name}</p>
                <div className="line" />
                <div className="flex justify-between"><span>Receipt:</span><span>{lastSale.saleRef}</span></div>
                <div className="flex justify-between"><span>Date:</span><span>{lastSale.date}</span></div>
                {lastSale.cashier && <div className="flex justify-between"><span>Cashier:</span><span>{lastSale.cashier}</span></div>}
                {lastSale.notes && <div className="flex justify-between"><span>Note:</span><span>{lastSale.notes}</span></div>}
                <div className="line" />
                <table className="w-full">
                  <tbody>
                    {(lastSale.items ?? []).map((item: ApiBizSaleItem, i: number) => (
                      <tr key={i}>
                        <td className="pr-1">{item.name}</td>
                        <td className="right text-right whitespace-nowrap">{item.qty}×{item.unitPrice.toLocaleString()}</td>
                        <td className="right text-right pl-2 whitespace-nowrap font-bold">{item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="line" />
                <div className="flex justify-between"><span>Subtotal:</span><span>Ksh {lastSale.subtotal?.toLocaleString()}</span></div>
                {lastSale.discount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-Ksh {lastSale.discount?.toLocaleString()}</span></div>}
                {lastSale.taxAmount > 0 && <div className="flex justify-between"><span>Tax ({lastSale.taxRate}%):</span><span>Ksh {lastSale.taxAmount?.toLocaleString()}</span></div>}
                <div className="flex justify-between total-row"><span>TOTAL:</span><span>Ksh {lastSale.totalAmount?.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Paid ({lastSale.paymentMethod}):</span><span>Ksh {lastSale.amountPaid?.toLocaleString()}</span></div>
                {lastSale.change > 0 && <div className="flex justify-between"><span>Change:</span><span>Ksh {lastSale.change?.toLocaleString()}</span></div>}
                <div className="line" />
                {business.receiptFooter && <p className="text-center">{business.receiptFooter}</p>}
                <p className="text-center text-muted-foreground">Thank you for shopping with us!</p>
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
  );
}
