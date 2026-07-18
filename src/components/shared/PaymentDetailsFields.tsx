import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApiPaymentDetails } from "@/lib/bizApi";

interface Props {
  value: Partial<ApiPaymentDetails>;
  onChange: (v: Partial<ApiPaymentDetails>) => void;
}

/** Till/paybill/bank details shown on receipts and invoices — each module or
 *  sub-business registers its own (a mart's till can differ from the fuel
 *  station's paybill), so this form is reused wherever those are configured. */
export function PaymentDetailsFields({ value, onChange }: Props) {
  const set = (k: keyof ApiPaymentDetails, v: string) => onChange({ ...value, [k]: v });
  const method = value.method ?? "none";

  return (
    <div className="space-y-3">
      <div>
        <Label>Payment Method</Label>
        <Select value={method} onValueChange={v => onChange({ ...value, method: v as ApiPaymentDetails["method"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not set</SelectItem>
            <SelectItem value="till">M-Pesa Till</SelectItem>
            <SelectItem value="paybill">Paybill</SelectItem>
            <SelectItem value="bank">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">Shown on every receipt/invoice this module generates.</p>
      </div>

      {method === "till" && (
        <div><Label>Till Number</Label><Input value={value.tillNumber ?? ""} onChange={e => set("tillNumber", e.target.value)} placeholder="e.g. 123456" /></div>
      )}

      {method === "paybill" && (
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Paybill Number</Label><Input value={value.paybillNumber ?? ""} onChange={e => set("paybillNumber", e.target.value)} placeholder="e.g. 400200" /></div>
          <div><Label>Account Number</Label><Input value={value.paybillAccount ?? ""} onChange={e => set("paybillAccount", e.target.value)} placeholder="e.g. your phone or ref" /></div>
        </div>
      )}

      {method === "bank" && (
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Bank Name</Label><Input value={value.bankName ?? ""} onChange={e => set("bankName", e.target.value)} /></div>
          <div><Label>Account Number</Label><Input value={value.bankAccountNumber ?? ""} onChange={e => set("bankAccountNumber", e.target.value)} /></div>
          <div><Label>Account Name</Label><Input value={value.bankAccountName ?? ""} onChange={e => set("bankAccountName", e.target.value)} /></div>
          <div><Label>Branch</Label><Input value={value.bankBranch ?? ""} onChange={e => set("bankBranch", e.target.value)} /></div>
        </div>
      )}
    </div>
  );
}
