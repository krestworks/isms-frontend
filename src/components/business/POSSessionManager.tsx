import { useEffect, useState } from "react";
import {
  LogIn, LogOut, Lock, Download, FileText, BarChart2,
  ClipboardCheck, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  posSessionStore, CashierSession, ClosingEntry, PayMethodTotals,
} from "@/data/posSessionStore";
import { useSession } from "@/data/sessionStore";
import { brandingStore } from "@/data/brandingStore";
import { ApiBizBusiness, ApiBizSale } from "@/lib/bizApi";
import { buildSessionReportPdf, ReportSection } from "@/lib/sessionReportPdf";

interface Props {
  business: ApiBizBusiness;
  sales: ApiBizSale[];
}

const METHODS = ["Cash", "M-Pesa", "Card", "Credit"];
const fmt = (n: number) => n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

// ── Sales analytics for a session ────────────────────────────────────────────

function computeSessionSales(sales: ApiBizSale[], openedAt: string, closedAt?: string) {
  const from = new Date(openedAt).getTime();
  const to   = closedAt ? new Date(closedAt).getTime() : Date.now();

  const sessionSales = sales.filter(s => {
    // Use createdAt (full datetime) to avoid UTC-midnight vs local-time mismatch with date-only strings
    const t = new Date(s.createdAt ?? s.date).getTime();
    return t >= from && t <= to && s.status !== "void";
  });

  const totalSales = sessionSales.reduce((s, x) => s + x.totalAmount, 0);
  const totalTransactions = sessionSales.length;

  const payMethodTotals: PayMethodTotals = { Cash: 0, "M-Pesa": 0, Card: 0, Credit: 0 };
  sessionSales.forEach(s => {
    const m = s.paymentMethod ?? "Cash";
    payMethodTotals[m] = (payMethodTotals[m] ?? 0) + s.totalAmount;
  });

  return { sessionSales, totalSales, totalTransactions, payMethodTotals };
}

// ── Report section builders ─────────────────────────────────────────────────

function rawReportSections(session: CashierSession, sales: ApiBizSale[]): ReportSection[] {
  const { sessionSales } = computeSessionSales(sales, session.openedAt, session.closedAt);
  return [{
    heading: "Raw Sales",
    table: {
      headers: ["Ref", "Date", "Method", "Amount"],
      rows: sessionSales.map(s => [s.saleRef ?? "—", s.date.slice(0, 19).replace("T", " "), s.paymentMethod ?? "Cash", `Ksh ${fmt(s.totalAmount)}`]),
      weights: [1.3, 1.6, 1, 1],
    },
    kv: [["Total", `${sessionSales.length} sale(s) — Ksh ${fmt(sessionSales.reduce((s, x) => s + x.totalAmount, 0))}`]],
  }];
}

function salesReportSections(session: CashierSession, sales: ApiBizSale[]): ReportSection[] {
  const { sessionSales, totalSales, payMethodTotals } = computeSessionSales(sales, session.openedAt, session.closedAt);

  const byProduct: Record<string, { qty: number; total: number }> = {};
  sessionSales.forEach(s => {
    (s.items ?? []).forEach((item: any) => {
      if (!byProduct[item.name]) byProduct[item.name] = { qty: 0, total: 0 };
      byProduct[item.name].qty   += item.qty ?? 1;
      byProduct[item.name].total += item.totalPrice ?? 0;
    });
  });

  return [
    {
      heading: "Product Breakdown",
      table: {
        headers: ["Product", "Qty", "Total"],
        rows: Object.entries(byProduct).sort((a, b) => b[1].total - a[1].total).map(([name, d]) => [name, d.qty, `Ksh ${fmt(d.total)}`]),
        weights: [2, 1, 1],
      },
    },
    {
      heading: "Payment Method Breakdown",
      table: {
        headers: ["Method", "Amount"],
        rows: METHODS.filter(m => (payMethodTotals[m] ?? 0) > 0).map(m => [m, `Ksh ${fmt(payMethodTotals[m] ?? 0)}`]),
      },
      kv: [["Total Sales", `Ksh ${fmt(totalSales)} (${sessionSales.length} transactions)`]],
    },
  ];
}

function reconReportSections(session: CashierSession): ReportSection[] {
  const entries = session.closingEntries ?? [];
  const totalVariance = entries.reduce((s, e) => s + e.variance, 0);
  const balanceLabel = totalVariance === 0 ? "Balanced" : totalVariance > 0 ? "Surplus (over)" : "Shortage (short)";
  const section: ReportSection = {
    heading: "Reconciliation",
    table: {
      headers: ["Method", "Expected", "Actual", "Variance"],
      rows: entries.map(e => [e.method, `Ksh ${fmt(e.expected)}`, `Ksh ${fmt(e.actual)}`, `${e.variance >= 0 ? "+" : ""}${fmt(e.variance)}`]),
    },
    kv: [
      ["Opening Float", `Ksh ${fmt(session.openingFloat)}`],
      ["Net Variance", `${totalVariance >= 0 ? "+" : ""}Ksh ${fmt(Math.abs(totalVariance))} — ${balanceLabel}`],
      ["Status", session.status.toUpperCase()],
    ],
  };
  if (session.closingNotes) section.lines = [`Notes: ${session.closingNotes}`];
  return [section];
}

function consolidatedReportSections(session: CashierSession, sales: ApiBizSale[]): ReportSection[] {
  return [...salesReportSections(session, sales), ...reconReportSections(session), ...rawReportSections(session, sales)];
}

// A blank field and a typed "0" must be distinguishable — a session can't open
// or close without someone actually looking at the till and entering a number,
// even if that number is zero.
function isExplicitAmount(v: string | undefined): boolean {
  return v !== undefined && v.trim() !== "" && !isNaN(Number(v));
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function POSSessionManager({ business, sales }: Props) {
  const { user, activeLocation } = useSession();
  const [session, setSession] = useState<CashierSession | null>(() => posSessionStore.get(business.id));
  const [panelOpen, setPanelOpen] = useState(false);

  // Open session dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [openFloat, setOpenFloat]   = useState("");
  const [openCashier, setOpenCashier] = useState(user.name || "");
  const [openTill, setOpenTill] = useState("");

  // Auto-prompt to open session on first mount if none exists
  useEffect(() => {
    const current = posSessionStore.get(business.id);
    if (!current || current.status === "committed") {
      setOpenCashier(user.name || "");
      setOpenFloat("");
      setOpenTill("");
      setOpenDialog(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  // Close session dialog
  const [closeDialog, setCloseDialog] = useState(false);
  const [closingEntries, setClosingEntries] = useState<Record<string, string>>({});
  const [closingNotes, setClosingNotes] = useState("");
  const [showRecon, setShowRecon]   = useState(false);

  // Commit confirm
  const [commitDialog, setCommitDialog] = useState(false);

  useEffect(() => {
    const unsub = posSessionStore.subscribe(business.id, () => {
      setSession(posSessionStore.get(business.id));
    });
    return unsub;
  }, [business.id]);

  const sessionSalesData = session
    ? computeSessionSales(sales, session.openedAt, session.closedAt)
    : null;

  // ── Open session ─────────────────────────────────────────────────────────────

  const handleOpen = () => {
    if (!openCashier.trim()) { toast.error("Cashier name required"); return; }
    if (!openTill.trim()) { toast.error("Till/counter number required"); return; }
    if (!isExplicitAmount(openFloat)) { toast.error("Enter the opening float amount — 0 is fine, but the field can't be blank"); return; }
    const s = posSessionStore.open(business.id, openCashier.trim(), Number(openFloat), openTill.trim());
    setSession(s);
    setOpenDialog(false);
    toast.success("Session opened. You can now process sales.");
  };

  // ── Close session ─────────────────────────────────────────────────────────────

  const expectedByMethod = (): Record<string, number> => {
    if (!sessionSalesData) return {};
    return sessionSalesData.payMethodTotals;
  };

  // Same set the close dialog actually renders inputs for (methods with sales,
  // plus Cash always since every till has cash regardless of sales mix) — an
  // explicit count is required for every one of these before closing.
  const requiredCloseMethods = (): string[] => {
    const expected = expectedByMethod();
    return METHODS.filter(m => (expected[m] ?? 0) > 0 || m === "Cash");
  };

  const canClose = requiredCloseMethods().every(m => isExplicitAmount(closingEntries[m]));

  const buildEntries = (): ClosingEntry[] => {
    const expected = expectedByMethod();
    return METHODS.map(m => {
      const exp = expected[m] ?? 0;
      const act = isExplicitAmount(closingEntries[m]) ? Number(closingEntries[m]) : 0;
      return { method: m, expected: exp, actual: act, variance: act - exp };
    }).filter(e => e.expected > 0 || e.actual > 0);
  };

  const handleClose = () => {
    if (!session || !sessionSalesData) return;
    if (!canClose) { toast.error("Enter a counted amount for every payment method below — 0 is fine, but each field must be filled in"); return; }
    const entries = buildEntries();
    const s = posSessionStore.close(
      business.id, entries, closingNotes,
      sessionSalesData.totalSales, sessionSalesData.totalTransactions,
      sessionSalesData.payMethodTotals,
    );
    setSession(s);
    setCloseDialog(false);
    setShowRecon(true);
    toast.success("Session closed. Review the reconciliation below.");
  };

  const handleCommit = () => {
    const s = posSessionStore.commit(business.id);
    setSession(s);
    setCommitDialog(false);
    toast.success("Session committed. No further changes allowed.");
  };

  // ── Reports ───────────────────────────────────────────────────────────────────

  const b = brandingStore.get();
  const sfx = session ? `_session-${session.sessionNo}_${new Date().toISOString().slice(0, 10)}` : "";
  const REPORT_TITLES = { raw: "Raw Sales Report", sales: "Sales Report", recon: "Reconciliation Report", consolidated: "Consolidated Report" };

  const downloadReport = (type: "raw" | "sales" | "recon" | "consolidated") => {
    if (!session) return;
    const sectionsMap = {
      raw:          () => rawReportSections(session, sales),
      sales:        () => salesReportSections(session, sales),
      recon:        () => reconReportSections(session),
      consolidated: () => consolidatedReportSections(session, sales),
    };
    const pdf = buildSessionReportPdf({
      reportTitle: REPORT_TITLES[type],
      branding: b,
      stationName: activeLocation !== "All Locations" ? activeLocation : undefined,
      sessionNo: session.sessionNo,
      cashier: session.cashier,
      tillNumber: session.tillNumber,
      openedAt: fmtDate(session.openedAt),
      closedAt: session.closedAt ? fmtDate(session.closedAt) : undefined,
      sections: sectionsMap[type](),
    });
    pdf.save(`${type}_report${sfx}.pdf`);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report downloaded`);
  };

  // ── Status badge ──────────────────────────────────────────────────────────────

  const statusColor = !session ? "bg-gray-100 text-gray-700"
    : session.status === "open"      ? "bg-green-100 text-green-800"
    : session.status === "closed"    ? "bg-amber-100 text-amber-800"
    : "bg-blue-100 text-blue-800";

  const statusLabel = !session ? "No Session"
    : session.status === "open"      ? `Session #${session.sessionNo} Open · ${session.cashier}`
    : session.status === "closed"    ? `Session #${session.sessionNo} Closed · ${session.cashier}`
    : `Session #${session.sessionNo} Committed · ${session.cashier}`;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Session banner — always visible above POS */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card mb-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusColor}`}>
            {session?.status?.toUpperCase() ?? "NO SESSION"}
          </span>
          <span className="text-muted-foreground truncate">{statusLabel}</span>
          {session?.status === "open" && sessionSalesData && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {sessionSalesData.totalTransactions} sales · Ksh {fmt(sessionSalesData.totalSales)}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          {!session && (
            <Button size="sm" className="h-7 text-xs" onClick={() => { setOpenCashier(user.name || ""); setOpenFloat(""); setOpenTill(""); setOpenDialog(true); }}>
              <LogIn className="h-3.5 w-3.5 mr-1" />Open Session
            </Button>
          )}
          {session?.status === "open" && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setClosingEntries({}); setClosingNotes(""); setCloseDialog(true); }}>
              <LogOut className="h-3.5 w-3.5 mr-1" />Close Session
            </Button>
          )}
          {session?.status === "closed" && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => setCommitDialog(true)}>
              <Lock className="h-3.5 w-3.5 mr-1" />Commit
            </Button>
          )}
          {session?.status === "committed" && (
            <Button size="sm" className="h-7 text-xs" onClick={() => {
              posSessionStore.clear(business.id);
              setOpenCashier(user.name || "");
              setOpenFloat("");
              setOpenTill("");
              setOpenDialog(true);
            }}>
              <LogIn className="h-3.5 w-3.5 mr-1" />New Session
            </Button>
          )}
          {session && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPanelOpen(v => !v)}>
              {panelOpen ? <><ChevronUp className="h-3 w-3 mr-1" />Hide</> : <><ChevronDown className="h-3 w-3 mr-1" />Details</>}
            </Button>
          )}
        </div>
      </div>

      {/* Expandable session details / reports panel */}
      {session && panelOpen && (
        <div className="rounded-xl border bg-card p-4 mb-3 space-y-4">
          {/* Session summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Opened</p>
              <p className="font-medium text-xs">{fmtDate(session.openedAt)}</p>
            </div>
            {session.tillNumber && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Till / Counter</p>
                <p className="font-bold text-xs">{session.tillNumber}</p>
              </div>
            )}
            {session.closedAt && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Closed</p>
                <p className="font-medium text-xs">{fmtDate(session.closedAt)}</p>
              </div>
            )}
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-xs text-muted-foreground">Opening Float</p>
              <p className="font-bold">Ksh {fmt(session.openingFloat)}</p>
            </div>
            {session.totalSales !== undefined && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Total Sales</p>
                <p className="font-bold text-primary">Ksh {fmt(session.totalSales)}</p>
              </div>
            )}
          </div>

          {/* Reconciliation table */}
          {session.closingEntries && session.closingEntries.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reconciliation</h4>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2">Method</th>
                    <th className="text-right px-3 py-2">Expected</th>
                    <th className="text-right px-3 py-2">Actual</th>
                    <th className="text-right px-3 py-2">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {session.closingEntries.map(e => (
                    <tr key={e.method} className={Math.abs(e.variance) > 0.5 ? "bg-amber-50/40" : ""}>
                      <td className="px-3 py-1.5 font-medium">{e.method}</td>
                      <td className="px-3 py-1.5 text-right text-muted-foreground">Ksh {fmt(e.expected)}</td>
                      <td className="px-3 py-1.5 text-right">Ksh {fmt(e.actual)}</td>
                      <td className={`px-3 py-1.5 text-right font-semibold ${e.variance === 0 ? "text-green-600" : "text-amber-600"}`}>
                        {e.variance >= 0 ? "+" : ""}{fmt(e.variance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Report downloads */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Download Reports</h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("raw")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /><FileText className="h-3.5 w-3.5 mr-1" />Raw Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("sales")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /><BarChart2 className="h-3.5 w-3.5 mr-1" />Sales Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("recon")}>
                <Download className="h-3.5 w-3.5 mr-1.5" /><ClipboardCheck className="h-3.5 w-3.5 mr-1" />Reconciled Report
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => downloadReport("consolidated")}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Consolidated Report
              </Button>
            </div>
          </div>

          {/* Start new session after commit */}
          {session.status === "committed" && (
            <Button className="w-full" onClick={() => {
              posSessionStore.clear(business.id);
              setSession(null);
              setPanelOpen(false);
              setOpenCashier(user.name || "");
              setOpenFloat("");
              setOpenTill("");
              setOpenDialog(true);
            }}>
              <LogIn className="h-4 w-4 mr-2" />Start New Session
            </Button>
          )}
        </div>
      )}

      {/* ── Open Session Dialog ── */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><LogIn className="h-5 w-5 text-green-500" />Open Cashier Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Start a new session to begin processing sales. Record your opening float (cash in drawer).</p>
            <div><Label>Cashier Name *</Label><Input className="mt-1" value={openCashier} onChange={e => setOpenCashier(e.target.value)} placeholder="Your name" /></div>
            <div><Label>Till / Counter Number *</Label><Input className="mt-1" value={openTill} onChange={e => setOpenTill(e.target.value)} placeholder="e.g. 1, 2, Counter A" /></div>
            <div>
              <Label>Opening Float (Ksh) *</Label>
              <Input className="mt-1" type="number" min={0} value={openFloat} onChange={e => setOpenFloat(e.target.value)} placeholder="Enter amount — 0 is valid" />
              <p className="text-xs text-muted-foreground mt-1">Cash amount in the till before sales begin — required, 0 is a valid entry</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleOpen} disabled={!isExplicitAmount(openFloat) || !openTill.trim()}><LogIn className="h-4 w-4 mr-1.5" />Open Session</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Close Session Dialog ── */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-amber-500" />Close Session</DialogTitle></DialogHeader>
          {session && sessionSalesData && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Cashier</span><span className="font-medium">{session.cashier}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Opened</span><span>{fmtDate(session.openedAt)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Transactions</span><span className="font-bold">{sessionSalesData.totalTransactions}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Sales</span><span className="font-bold text-primary">Ksh {fmt(sessionSalesData.totalSales)}</span></div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Count Physical Cash / Payments</h4>
                <p className="text-xs text-muted-foreground mb-3">Enter the actual amount counted for each payment method below — required for every method shown, 0 is a valid count.</p>
                <div className="space-y-3">
                  {requiredCloseMethods().map(m => {
                    const expected = sessionSalesData.payMethodTotals[m] ?? 0;
                    const entered = isExplicitAmount(closingEntries[m]);
                    const actual = entered ? Number(closingEntries[m]) : 0;
                    const variance = actual - expected;
                    return (
                      <div key={m} className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <p className="text-sm font-medium">{m}</p>
                          <p className="text-xs text-muted-foreground">Exp: Ksh {fmt(expected)}</p>
                        </div>
                        <Input
                          type="number" min={0} placeholder="Enter count — 0 is valid"
                          value={closingEntries[m] ?? ""}
                          onChange={e => setClosingEntries(v => ({ ...v, [m]: e.target.value }))}
                        />
                        {entered && (
                          <span className={`text-sm font-semibold ${variance === 0 ? "text-green-600" : "text-amber-600"}`}>
                            {variance >= 0 ? "+" : ""}{fmt(variance)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label>Closing Notes</Label>
                <Textarea className="mt-1" rows={2} placeholder="Any discrepancies, notes, handover..." value={closingNotes} onChange={e => setClosingNotes(e.target.value)} />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCloseDialog(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleClose} disabled={!canClose}><LogOut className="h-4 w-4 mr-1.5" />Close Session</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Commit Confirm Dialog ── */}
      <Dialog open={commitDialog} onOpenChange={setCommitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-blue-500" />Commit Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50/40 p-3 flex gap-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Committing locks this session permanently. No further edits or voids will be possible. Download all reports before committing.</span>
            </div>
            {session && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("raw")}><Download className="h-3 w-3 mr-1" />Raw</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("sales")}><Download className="h-3 w-3 mr-1" />Sales</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("recon")}><Download className="h-3 w-3 mr-1" />Reconciled</Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => downloadReport("consolidated")}><Download className="h-3 w-3 mr-1" />Consolidated</Button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCommitDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleCommit}><Lock className="h-4 w-4 mr-1.5" />Commit & Lock</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
