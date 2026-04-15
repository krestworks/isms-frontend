import { useState } from "react";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface AllowanceType {
  id: string;
  name: string;
  defaultAmount: number;
  taxable: boolean;
}

interface DeductionType {
  id: string;
  name: string;
  type: "fixed" | "percentage";
  value: number;
  mandatory: boolean;
}

export default function PayrollSettingsTab() {
  const [payDay, setPayDay] = useState("28");
  const [payFrequency, setPayFrequency] = useState("monthly");
  const [currency, setCurrency] = useState("KES");
  const [autoProcess, setAutoProcess] = useState(false);

  const [allowances, setAllowances] = useState<AllowanceType[]>([
    { id: "1", name: "House Allowance", defaultAmount: 5000, taxable: true },
    { id: "2", name: "Transport Allowance", defaultAmount: 3000, taxable: false },
    { id: "3", name: "Medical Allowance", defaultAmount: 2000, taxable: false },
    { id: "4", name: "Hardship Allowance", defaultAmount: 0, taxable: true },
  ]);

  const [deductions, setDeductions] = useState<DeductionType[]>([
    { id: "1", name: "NHIF", type: "fixed", value: 1700, mandatory: true },
    { id: "2", name: "NSSF", type: "percentage", value: 6, mandatory: true },
    { id: "3", name: "PAYE", type: "percentage", value: 10, mandatory: true },
    { id: "4", name: "Staff Welfare", type: "fixed", value: 500, mandatory: false },
  ]);

  const addAllowance = () => setAllowances(a => [...a, { id: String(Date.now()), name: "", defaultAmount: 0, taxable: false }]);
  const removeAllowance = (id: string) => setAllowances(a => a.filter(i => i.id !== id));
  const updateAllowance = (id: string, field: keyof AllowanceType, value: any) =>
    setAllowances(a => a.map(i => i.id === id ? { ...i, [field]: value } : i));

  const addDeduction = () => setDeductions(d => [...d, { id: String(Date.now()), name: "", type: "fixed", value: 0, mandatory: false }]);
  const removeDeduction = (id: string) => setDeductions(d => d.filter(i => i.id !== id));
  const updateDeduction = (id: string, field: keyof DeductionType, value: any) =>
    setDeductions(d => d.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleSave = () => toast.success("Payroll settings saved successfully");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payroll Settings</h3>
          <p className="text-sm text-muted-foreground">Configure payroll processing rules, allowances & deductions</p>
        </div>
        <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" /> Save Settings</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Settings</CardTitle>
            <CardDescription>Pay frequency & processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pay Day</Label>
                <Select value={payDay} onValueChange={setPayDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}{["st","nd","rd"][i] || "th"} of month</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pay Frequency</Label>
                <Select value={payFrequency} onValueChange={setPayFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                  <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Auto-process Payroll</p>
                <p className="text-xs text-muted-foreground">Automatically run payroll on pay day</p>
              </div>
              <Switch checked={autoProcess} onCheckedChange={setAutoProcess} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overtime Rules</CardTitle>
            <CardDescription>Configure overtime calculation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Standard Hours/Day</Label><Input type="number" defaultValue={8} /></div>
              <div><Label>Standard Days/Week</Label><Input type="number" defaultValue={6} /></div>
              <div><Label>Overtime Rate (x)</Label><Input type="number" step="0.5" defaultValue={1.5} /></div>
              <div><Label>Weekend Rate (x)</Label><Input type="number" step="0.5" defaultValue={2} /></div>
            </div>
            <div><Label>Holiday Rate (x)</Label><Input type="number" step="0.5" defaultValue={2.5} /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Allowance Types</CardTitle>
            <CardDescription>Configure standard allowances applied to payroll</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addAllowance}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground px-1">
              <span className="col-span-4">Name</span>
              <span className="col-span-3">Default Amount (Ksh)</span>
              <span className="col-span-3">Taxable</span>
              <span className="col-span-2"></span>
            </div>
            {allowances.map((a) => (
              <div key={a.id} className="grid grid-cols-12 gap-3 items-center">
                <Input className="col-span-4" value={a.name} onChange={(e) => updateAllowance(a.id, "name", e.target.value)} placeholder="Allowance name" />
                <Input className="col-span-3" type="number" value={a.defaultAmount} onChange={(e) => updateAllowance(a.id, "defaultAmount", Number(e.target.value))} />
                <div className="col-span-3 flex items-center gap-2">
                  <Switch checked={a.taxable} onCheckedChange={(v) => updateAllowance(a.id, "taxable", v)} />
                  <span className="text-xs text-muted-foreground">{a.taxable ? "Yes" : "No"}</span>
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => removeAllowance(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Deduction Types</CardTitle>
            <CardDescription>Configure statutory and voluntary deductions</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addDeduction}><Plus className="h-4 w-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground px-1">
              <span className="col-span-3">Name</span>
              <span className="col-span-2">Type</span>
              <span className="col-span-2">Value</span>
              <span className="col-span-3">Mandatory</span>
              <span className="col-span-2"></span>
            </div>
            {deductions.map((d) => (
              <div key={d.id} className="grid grid-cols-12 gap-3 items-center">
                <Input className="col-span-3" value={d.name} onChange={(e) => updateDeduction(d.id, "name", e.target.value)} placeholder="Deduction name" />
                <Select value={d.type} onValueChange={(v) => updateDeduction(d.id, "type", v)}>
                  <SelectTrigger className="col-span-2"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixed">Fixed (Ksh)</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent>
                </Select>
                <Input className="col-span-2" type="number" value={d.value} onChange={(e) => updateDeduction(d.id, "value", Number(e.target.value))} />
                <div className="col-span-3 flex items-center gap-2">
                  <Switch checked={d.mandatory} onCheckedChange={(v) => updateDeduction(d.id, "mandatory", v)} />
                  <span className="text-xs text-muted-foreground">{d.mandatory ? "Mandatory" : "Optional"}</span>
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => removeDeduction(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
