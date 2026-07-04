import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { calcSHA, calcNSSF, calcPAYE, fmt } from "@/lib/payrollCalc";

// ── Gross-up solver ──────────────────────────────────────────────────────────
function solveGrossForNet(targetNet: number): number {
  if (targetNet <= 0) return 0;
  let lo = targetNet * 0.5, hi = targetNet * 5;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const nssf = calcNSSF(mid);
    const net  = mid - calcSHA(mid) - nssf - calcPAYE(mid, nssf);
    if (Math.abs(net - targetNet) < 0.1) return Math.round(mid);
    if (net < targetNet) lo = mid; else hi = mid;
  }
  return Math.round((lo + hi) / 2);
}

function solveGrossUpMarginal(existingGross: number, targetNet: number): { addGross: number; addTax: number } {
  if (targetNet <= 0) return { addGross: 0, addTax: 0 };
  const en = calcNSSF(existingGross);
  const existingNet = existingGross - calcSHA(existingGross) - en - calcPAYE(existingGross, en);
  const wantedNet   = existingNet + targetNet;
  let lo = existingGross, hi = existingGross + targetNet * 5;
  for (let i = 0; i < 200; i++) {
    const mid  = (lo + hi) / 2;
    const nssf = calcNSSF(mid);
    const net  = mid - calcSHA(mid) - nssf - calcPAYE(mid, nssf);
    if (Math.abs(net - wantedNet) < 0.1) {
      const addGross = Math.round(mid - existingGross);
      return { addGross, addTax: addGross - Math.round(targetNet) };
    }
    if (net < wantedNet) lo = mid; else hi = mid;
  }
  const addGross = Math.round((lo + hi) / 2 - existingGross);
  return { addGross, addTax: addGross - Math.round(targetNet) };
}

// ── Primitives ───────────────────────────────────────────────────────────────

function Num({ label, val, set, placeholder = "0", hint }: {
  label: string; val: string; set: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      <Input type="number" min={0} value={val} onChange={e => set(e.target.value)}
        placeholder={placeholder} className="h-8 text-xs" />
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function Row({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div className={`flex justify-between text-sm ${cls}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ── Main tabs component ──────────────────────────────────────────────────────

export default function PayrollCalculatorTabs() {

  // ── Standard ─────────────────────────────────────────────────────────────
  const [stMode,   setStMode]   = useState<"components" | "gross">("components");
  const [stBasic,  setStBasic]  = useState("");
  const [stHouse,  setStHouse]  = useState("");
  const [stTrans,  setStTrans]  = useState("");
  const [stOT,     setStOT]     = useState("");
  const [stGrossD, setStGrossD] = useState(""); // direct gross entry
  const [stOther,  setStOther]  = useState("");

  const stGross    = stMode === "gross"
    ? (Number(stGrossD) || 0)
    : (Number(stBasic)||0) + (Number(stHouse)||0) + (Number(stTrans)||0) + (Number(stOT)||0);
  const stNSSF     = calcNSSF(stGross);
  const stSHA      = calcSHA(stGross);
  const stPAYE     = calcPAYE(stGross, stNSSF);
  const stOtherN   = Number(stOther) || 0;
  const stTotalDed = stSHA + stNSSF + stPAYE + stOtherN;
  const stNet      = Math.max(0, stGross - stTotalDed);

  // ── Gross-Up ─────────────────────────────────────────────────────────────
  const [guTargetNet, setGuTargetNet] = useState("");
  const [guBasic,     setGuBasic]     = useState("");
  const [guMode, setGuMode] = useState<"marginal" | "standalone">("marginal");

  const guTargetN = Number(guTargetNet) || 0;
  const guBasicN  = Number(guBasic)     || 0;

  let guGross = 0, guTax = 0;
  if (guMode === "standalone" && guTargetN > 0) {
    guGross = solveGrossForNet(guTargetN);
    const n = calcNSSF(guGross);
    guTax   = calcSHA(guGross) + n + calcPAYE(guGross, n);
  } else if (guMode === "marginal" && guTargetN > 0 && guBasicN > 0) {
    const r = solveGrossUpMarginal(guBasicN, guTargetN);
    guGross = r.addGross;
    guTax   = r.addTax;
  }

  // ── Employer Cost ─────────────────────────────────────────────────────────
  const [ecBasic, setEcBasic] = useState("");
  const [ecHouse, setEcHouse] = useState("");
  const [ecTrans, setEcTrans] = useState("");
  const [ecOT,    setEcOT]    = useState("");
  const [ecGroUp, setEcGroUp] = useState("");

  const ecGross   = (Number(ecBasic)||0) + (Number(ecHouse)||0) + (Number(ecTrans)||0) + (Number(ecOT)||0);
  const ecNSSF    = calcNSSF(ecGross);
  const ecSHA     = calcSHA(ecGross);
  const ecPAYE    = calcPAYE(ecGross, ecNSSF);
  const ecNet     = Math.max(0, ecGross - ecSHA - ecNSSF - ecPAYE);
  const ecEmpNSSF = calcNSSF(ecGross);
  const ecGroUpN  = Number(ecGroUp) || 0;
  let ecGroUpTax  = 0;
  if (ecGroUpN > 0) {
    const g = solveGrossForNet(ecGroUpN);
    ecGroUpTax = g - ecGroUpN;
  }
  const ecTotalCost = ecGross + ecEmpNSSF + ecGroUpTax;

  // ── FBT / BIK ────────────────────────────────────────────────────────────
  const [fbtCashGross,   setFbtCashGross]   = useState("");
  const [fbtBasic,       setFbtBasic]       = useState("");
  const [fbtRentActual,  setFbtRentActual]  = useState("");
  const [fbtRentCharged, setFbtRentCharged] = useState("");
  const [fbtVehCost,     setFbtVehCost]     = useState("");
  const [fbtLoanPrinc,   setFbtLoanPrinc]   = useState("");
  const [fbtLoanRate,    setFbtLoanRate]    = useState("");
  const [fbtOther,       setFbtOther]       = useState("");

  const fbtCashG       = Number(fbtCashGross) || 0;
  const fbtBasicN      = Number(fbtBasic)     || 0;
  const fbtHousingMin  = fbtBasicN * 0.15;
  const fbtHousingDiff = Math.max(0, (Number(fbtRentActual)||0) - (Number(fbtRentCharged)||0));
  const fbtHousingBIK  = Math.max(fbtHousingMin, fbtHousingDiff);
  const fbtVehBIK      = (Number(fbtVehCost)||0) * 0.02;
  const KRA_RATE       = 0.12;
  const fbtLoanRate_   = Math.min(Number(fbtLoanRate)||0, 100) / 100;
  const fbtLoanBIK     = Math.max(0, (KRA_RATE - fbtLoanRate_) * (Number(fbtLoanPrinc)||0) / 12);
  const fbtOtherN      = Number(fbtOther) || 0;
  const fbtTotalBIK    = fbtHousingBIK + fbtVehBIK + fbtLoanBIK + fbtOtherN;
  const fbtNSSF        = calcNSSF(fbtCashG);
  const fbtSHA         = calcSHA(fbtCashG);
  const fbtPayeNoBIK   = fbtCashG > 0 ? calcPAYE(fbtCashG, fbtNSSF)              : 0;
  const fbtPayeWithBIK = fbtCashG > 0 ? calcPAYE(fbtCashG, fbtNSSF, fbtTotalBIK) : 0;
  const fbtExtraPAYE   = fbtPayeWithBIK - fbtPayeNoBIK;
  const fbtNetNoBIK    = Math.max(0, fbtCashG - fbtSHA - fbtNSSF - fbtPayeNoBIK);
  const fbtNetWithBIK  = Math.max(0, fbtCashG - fbtSHA - fbtNSSF - fbtPayeWithBIK);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Tabs defaultValue="standard">
      <TabsList className="w-full bg-muted/50">
        <TabsTrigger value="standard" className="flex-1 text-xs">Standard</TabsTrigger>
        <TabsTrigger value="grossup"  className="flex-1 text-xs">Gross-Up</TabsTrigger>
        <TabsTrigger value="employer" className="flex-1 text-xs">Employer Cost</TabsTrigger>
        <TabsTrigger value="fbt"      className="flex-1 text-xs">BIK / FBT</TabsTrigger>
      </TabsList>

      {/* ── Standard ────────────────────────────────────────────────────── */}
      <TabsContent value="standard" className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground">Enter salary to get the full Kenya statutory breakdown.</p>

        {/* Mode toggle */}
        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
          <Button size="sm" variant={stMode === "components" ? "default" : "ghost"}
            className="flex-1 h-7 text-xs" onClick={() => setStMode("components")}>
            By components
          </Button>
          <Button size="sm" variant={stMode === "gross" ? "default" : "ghost"}
            className="flex-1 h-7 text-xs" onClick={() => setStMode("gross")}>
            From gross salary
          </Button>
        </div>

        {stMode === "components" ? (
          <div className="grid grid-cols-2 gap-3">
            <Num label="Basic Salary (Ksh)"        val={stBasic} set={setStBasic} />
            <Num label="House Allowance (Ksh)"      val={stHouse} set={setStHouse} />
            <Num label="Transport Allowance (Ksh)"  val={stTrans} set={setStTrans} />
            <Num label="Overtime / Bonus (Ksh)"     val={stOT}    set={setStOT} />
            <Num label="Other Deductions (Ksh)"     val={stOther} set={setStOther} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Num label="Total Gross Pay (Ksh)" val={stGrossD} set={setStGrossD}
                placeholder="e.g. 80,000"
                hint="SHA, NSSF and PAYE computed on this gross amount." />
            </div>
            <Num label="Other Deductions (Ksh)" val={stOther} set={setStOther} />
          </div>
        )}

        {stGross > 0 && (
          <div className="border rounded-lg p-3 space-y-1.5 bg-muted/20 text-sm">
            <Row label="Gross Pay"         value={fmt(stGross)}    cls="font-semibold pb-1.5 border-b" />
            <Row label="SHA (2.75%)"       value={fmt(stSHA)}      cls="text-destructive" />
            <Row label="NSSF (6% tiered)"  value={fmt(stNSSF)}     cls="text-destructive" />
            <Row label="PAYE"              value={fmt(stPAYE)}     cls="text-destructive" />
            {stOtherN > 0 && <Row label="Other Deductions" value={fmt(stOtherN)} cls="text-destructive" />}
            <Row label="Total Deductions"  value={fmt(stTotalDed)} cls="text-destructive font-semibold pt-1.5 border-t" />
            <Row label="NET PAY"           value={fmt(stNet)}      cls="text-primary font-bold text-base pt-1.5 border-t" />
            <p className="text-xs text-muted-foreground pt-1 border-t mt-1">
              Employer NSSF (not deducted from employee): {fmt(calcNSSF(stGross))}
            </p>
          </div>
        )}
      </TabsContent>

      {/* ── Gross-Up ──────────────────────────────────────────────────────── */}
      <TabsContent value="grossup" className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground">
          Calculate the <strong>grossed-up amount to record</strong> when the employer bears the tax — employee receives the full target net.
        </p>

        <div className="flex gap-1.5 p-1 bg-muted/50 rounded-lg">
          <Button size="sm" variant={guMode === "marginal" ? "default" : "ghost"}
            className="flex-1 h-7 text-xs" onClick={() => setGuMode("marginal")}>
            On top of existing salary
          </Button>
          <Button size="sm" variant={guMode === "standalone" ? "default" : "ghost"}
            className="flex-1 h-7 text-xs" onClick={() => setGuMode("standalone")}>
            Standalone allowance
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {guMode === "marginal" && (
            <Num label="Employee's existing gross (Ksh)" val={guBasic} set={setGuBasic} placeholder="e.g. 50,000" />
          )}
          <Num label="Target net amount (Ksh)" val={guTargetNet} set={setGuTargetNet} placeholder="e.g. 40,000" />
        </div>

        {guMode === "marginal" && guTargetN > 0 && guBasicN <= 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
            Enter the employee's existing gross salary above to calculate the marginal rate.
          </p>
        )}

        {guTargetN > 0 && (guMode === "standalone" || guBasicN > 0) && guGross > 0 && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
            <p className="text-xs text-muted-foreground mb-1">
              {guMode === "marginal"
                ? `To give ${fmt(guTargetN)} net on top of a ${fmt(guBasicN)} gross salary:`
                : `To give ${fmt(guTargetN)} net as a standalone allowance:`}
            </p>
            <Row label="Grossed-up amount to record on payslip" value={fmt(guGross)} cls="font-semibold" />
            <Row label="Employee pockets (net)"                  value={fmt(guTargetN)} cls="text-primary font-semibold" />
            <Row label="Tax employer absorbs"                    value={fmt(guTax)}  cls="text-amber-700" />
            <div className="border-t pt-2 text-xs text-muted-foreground">
              Record <strong>{fmt(guGross)}</strong> as the allowance. Employee nets <strong>{fmt(guTargetN)}</strong>. Employer covers <strong>{fmt(guTax)}</strong> in deductions on their behalf.
            </div>
          </div>
        )}
      </TabsContent>

      {/* ── Employer Cost ─────────────────────────────────────────────────── */}
      <TabsContent value="employer" className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground">
          Full monthly cost to the employer including statutory contributions and any grossed-up allowance.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Num label="Basic Salary (Ksh)"        val={ecBasic} set={setEcBasic} />
          <Num label="House Allowance (Ksh)"      val={ecHouse} set={setEcHouse} />
          <Num label="Transport Allowance (Ksh)"  val={ecTrans} set={setEcTrans} />
          <Num label="Overtime / Bonus (Ksh)"     val={ecOT}    set={setEcOT} />
          <div className="col-span-2">
            <Num label="Grossed-up net allowance (Ksh) — employer-paid tax"
              val={ecGroUp} set={setEcGroUp} placeholder="e.g. 40,000 net target (optional)" />
          </div>
        </div>

        {ecGross > 0 && (
          <div className="border rounded-lg p-3 space-y-1.5 bg-muted/20 text-sm">
            <p className="text-xs font-semibold text-muted-foreground pb-1">Employee side</p>
            <Row label="Gross Salary"      value={fmt(ecGross)} />
            <Row label="SHA"               value={fmt(ecSHA)}   cls="text-destructive" />
            <Row label="NSSF (employee)"   value={fmt(ecNSSF)}  cls="text-destructive" />
            <Row label="PAYE"              value={fmt(ecPAYE)}  cls="text-destructive" />
            <Row label="Employee Net Pay"  value={fmt(ecNet)}   cls="text-primary font-semibold border-t pt-1.5 mt-1" />

            <p className="text-xs font-semibold text-muted-foreground pt-2 border-t mt-1">Employer contributions</p>
            <Row label="Employer NSSF (matched)" value={fmt(ecEmpNSSF)} />
            {ecGroUpN > 0 && (
              <Row label={`Tax on ${fmt(ecGroUpN)} net allowance`} value={fmt(ecGroUpTax)} cls="text-amber-700" />
            )}
            <Row label="TOTAL MONTHLY COST TO EMPLOYER" value={fmt(ecTotalCost)} cls="font-bold text-base border-t pt-2 mt-1" />
          </div>
        )}
      </TabsContent>

      {/* ── BIK / FBT ─────────────────────────────────────────────────────── */}
      <TabsContent value="fbt" className="space-y-3 pt-3">
        <p className="text-xs text-muted-foreground">
          Calculate <strong>Benefit in Kind (BIK)</strong> — non-cash benefits that increase taxable income for PAYE. SHA and NSSF remain on cash gross only.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Num label="Cash Gross Pay (Ksh)"  val={fbtCashGross} set={setFbtCashGross} placeholder="Basic + allowances" />
          <Num label="Basic Salary (Ksh)"    val={fbtBasic}     set={setFbtBasic}     placeholder="For housing 15% floor" />
        </div>

        <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
          <p className="text-xs font-semibold">Housing Benefit</p>
          <p className="text-[11px] text-muted-foreground -mt-2">BIK = higher of 15% of basic or (actual rent − rent charged to employee)</p>
          <div className="grid grid-cols-2 gap-3">
            <Num label="Actual rent paid by employer (Ksh)" val={fbtRentActual}  set={setFbtRentActual}  placeholder="e.g. 30,000" />
            <Num label="Rent charged to employee (Ksh)"     val={fbtRentCharged} set={setFbtRentCharged} placeholder="0 if free" />
          </div>
          {((Number(fbtRentActual)||0) > 0 || fbtBasicN > 0) && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>15% of basic: <span className="font-medium">{fmt(fbtHousingMin)}</span></div>
              <div>Rent differential: <span className="font-medium">{fmt(fbtHousingDiff)}</span></div>
              <div className="text-foreground font-medium">Housing BIK: {fmt(fbtHousingBIK)}</div>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
          <p className="text-xs font-semibold">Company Vehicle Benefit</p>
          <p className="text-[11px] text-muted-foreground -mt-2">BIK = 2% of vehicle cost per month</p>
          <Num label="Vehicle cost / value (Ksh)" val={fbtVehCost} set={setFbtVehCost} placeholder="e.g. 2,000,000" />
          {(Number(fbtVehCost)||0) > 0 && (
            <p className="text-xs text-muted-foreground">Vehicle BIK: <span className="font-medium text-foreground">{fmt(fbtVehBIK)}</span>/month</p>
          )}
        </div>

        <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
          <p className="text-xs font-semibold">Low-Interest / Interest-Free Loan</p>
          <p className="text-[11px] text-muted-foreground -mt-2">BIK = (KRA prescribed 12% − actual rate) × principal ÷ 12</p>
          <div className="grid grid-cols-2 gap-3">
            <Num label="Loan principal (Ksh)"          val={fbtLoanPrinc} set={setFbtLoanPrinc} placeholder="e.g. 500,000" />
            <Num label="Actual interest rate (% p.a.)" val={fbtLoanRate}  set={setFbtLoanRate}  placeholder="0 if interest-free" />
          </div>
          {(Number(fbtLoanPrinc)||0) > 0 && (
            <p className="text-xs text-muted-foreground">Loan BIK: <span className="font-medium text-foreground">{fmt(fbtLoanBIK)}</span>/month</p>
          )}
        </div>

        <div className="border rounded-lg p-3 bg-muted/10">
          <Num label="Other / custom BIK (Ksh)" val={fbtOther} set={setFbtOther} placeholder="e.g. medical cover, school fees" />
        </div>

        {(fbtTotalBIK > 0 || fbtCashG > 0) && (
          <div className="border rounded-lg p-3 space-y-1.5 bg-amber-50 border-amber-200 text-sm">
            <Row label="Total BIK this month" value={fmt(fbtTotalBIK)} cls="font-semibold text-amber-800 pb-1.5 border-b border-amber-200" />
            {fbtCashG > 0 && (
              <>
                <Row label="Cash Gross"               value={fmt(fbtCashG)} />
                <Row label="SHA (on cash gross)"       value={fmt(fbtSHA)}  cls="text-destructive" />
                <Row label="NSSF (on cash gross)"      value={fmt(fbtNSSF)} cls="text-destructive" />
                <Row label="Taxable base without BIK"  value={fmt(Math.max(0, fbtCashG - fbtNSSF))} cls="text-muted-foreground text-xs" />
                <Row label="Taxable base with BIK"     value={fmt(Math.max(0, fbtCashG + fbtTotalBIK - fbtNSSF))} cls="text-amber-700 text-xs" />
                <div className="border-t border-amber-200 mt-1 pt-1.5 space-y-1">
                  <Row label="PAYE without BIK"  value={fmt(fbtPayeNoBIK)} />
                  <Row label="PAYE with BIK"     value={fmt(fbtPayeWithBIK)} cls="text-amber-700 font-semibold" />
                  <Row label="Extra PAYE from BIK" value={fmt(fbtExtraPAYE)} cls="text-destructive font-semibold" />
                </div>
                <div className="border-t border-amber-200 mt-1 pt-1.5 space-y-1">
                  <Row label="Employee net (no BIK)"   value={fmt(fbtNetNoBIK)} />
                  <Row label="Employee net (with BIK)" value={fmt(fbtNetWithBIK)} cls="text-primary font-bold" />
                </div>
                <p className="text-[11px] text-amber-700 border-t border-amber-200 pt-1.5 mt-1">
                  The employee receives the same cash but pays an extra {fmt(fbtExtraPAYE)} PAYE due to BIK.
                  To keep the employee whole, record this BIK and gross-up separately via the Gross-Up tab.
                </p>
              </>
            )}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
