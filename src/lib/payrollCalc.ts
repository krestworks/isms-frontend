// Kenya statutory payroll calculations — shared between PayrollTab and PayrollBatchEntryPage

export const fmt    = (n: number) => `Ksh ${Math.round(n).toLocaleString()}`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString();

export function calcSHA(gross: number): number {
  return Math.round(gross * 0.0275);
}

export function calcNSSF(gross: number): number {
  const tier1 = Math.min(gross, 6000) * 0.06;
  const tier2 = Math.max(0, Math.min(gross, 18000) - 6000) * 0.06;
  return Math.round(tier1 + tier2);
}

// bik = benefit in kind value; adds to taxable income but not cash gross, NSSF, or SHA
export function calcPAYE(gross: number, nssf: number, bik = 0): number {
  const taxable = (gross + bik) - nssf;
  let paye = 0;
  if (taxable <= 24000)       paye = taxable * 0.10;
  else if (taxable <= 32333)  paye = 2400   + (taxable - 24000)  * 0.25;
  else if (taxable <= 500000) paye = 4483   + (taxable - 32333)  * 0.30;
  else if (taxable <= 800000) paye = 144642 + (taxable - 500000) * 0.325;
  else                         paye = 242142 + (taxable - 800000) * 0.35;
  return Math.max(0, Math.round(paye - 2400));
}
