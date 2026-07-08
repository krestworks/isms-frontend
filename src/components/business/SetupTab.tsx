import { useCallback, useEffect, useState } from "react";
import { Save, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { DataTable, Column } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { bizApi, ApiBizBusiness, ApiBizTable } from "@/lib/bizApi";
import { usePermissions } from "@/lib/permissions";

interface Props {
  business: ApiBizBusiness;
  isRestaurant: boolean;
  onUpdate: (b: ApiBizBusiness) => void;
}

const emptyTable = { tableNo: "", capacity: 4, status: "available" };

export function SetupTab({ business, isRestaurant, onUpdate }: Props) {
  const can = usePermissions();
  const canManage = can("business.setup.manage");

  // Business config form
  const [config, setConfig] = useState({
    name: business.name,
    taxRate: business.taxRate,
    currency: business.currency,
    kraPin: business.kraPin ?? "",
    receiptHeader: business.receiptHeader ?? "",
    receiptFooter: business.receiptFooter ?? "",
    status: business.status,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Tables
  const [tables,    setTables]    = useState<ApiBizTable[]>([]);
  const [tableModal, setTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<ApiBizTable | null>(null);
  const [tableForm, setTableForm]  = useState(emptyTable);
  const [savingTable, setSavingTable] = useState(false);

  const loadTables = useCallback(async () => {
    if (!isRestaurant) return;
    try {
      const res = await bizApi.tables.list(business.id);
      setTables(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load tables"); }
  }, [business.id, isRestaurant]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const setC = (k: string, v: any) => setConfig(f => ({ ...f, [k]: v }));

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await bizApi.businesses.update(business.id, config);
      onUpdate(res.data);
      toast.success("Settings saved");
    } catch (e: any) { toast.error(e?.message || "Failed to save settings"); }
    finally { setSavingConfig(false); }
  };

  // Tables
  const openNewTable  = () => { setEditingTable(null); setTableForm(emptyTable); setTableModal(true); };
  const openEditTable = (t: ApiBizTable) => {
    setEditingTable(t);
    setTableForm({ tableNo: t.tableNo, capacity: t.capacity, status: t.status });
    setTableModal(true);
  };

  const handleSaveTable = async () => {
    if (!tableForm.tableNo) return toast.error("Table number is required");
    setSavingTable(true);
    try {
      if (editingTable) {
        await bizApi.tables.update(editingTable.id, tableForm);
        toast.success("Table updated");
      } else {
        await bizApi.tables.create({ ...tableForm, businessId: business.id });
        toast.success("Table added");
      }
      setTableModal(false);
      loadTables();
    } catch (e: any) { toast.error(e?.message || "Failed to save table"); }
    finally { setSavingTable(false); }
  };

  const [pendingDeleteTable, setPendingDeleteTable] = useState<ApiBizTable | null>(null);
  const [deletingTable, setDeletingTable] = useState(false);

  const confirmDeleteTable = async () => {
    if (!pendingDeleteTable) return;
    setDeletingTable(true);
    try {
      await bizApi.tables.delete(pendingDeleteTable.id);
      toast.success("Table removed");
      setPendingDeleteTable(null);
      loadTables();
    } catch (e: any) { toast.error((e as any)?.message || "Failed to delete"); }
    finally { setDeletingTable(false); }
  };

  const tableColumns: Column<ApiBizTable>[] = [
    { key: "tableNo",  label: "Table #",  sortable: true },
    { key: "capacity", label: "Capacity", render: t => `${t.capacity} seats`, sortable: true },
    { key: "status",   label: "Status",   render: t => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-8">
      {/* Business Config */}
      <Card>
        <CardHeader><CardTitle className="text-base">Business Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Business Name</Label><Input value={config.name} onChange={e => setC("name", e.target.value)} /></div>
            <div><Label>Status</Label>
              <Select value={config.status} onValueChange={v => setC("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Tax Rate (%)</Label><Input type="number" value={config.taxRate} onChange={e => setC("taxRate", +e.target.value)} /></div>
            <div><Label>Currency</Label>
              <Select value={config.currency} onValueChange={v => setC("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES — Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                  <SelectItem value="UGX">UGX — Uganda Shilling</SelectItem>
                  <SelectItem value="TZS">TZS — Tanzania Shilling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div><Label>Business KRA PIN</Label><Input value={config.kraPin} onChange={e => setC("kraPin", e.target.value)} placeholder="e.g. A001234567X" /></div>
          <div><Label>Receipt Header</Label><Textarea value={config.receiptHeader} onChange={e => setC("receiptHeader", e.target.value)} placeholder="Text shown at the top of every receipt" /></div>
          <div><Label>Receipt Footer</Label><Textarea value={config.receiptFooter} onChange={e => setC("receiptFooter", e.target.value)} placeholder="Text shown at the bottom — e.g. 'Thank you for your business'" /></div>
          <Button onClick={handleSaveConfig} disabled={savingConfig}>
            <Save className="h-4 w-4 mr-2" />{savingConfig ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Restaurant Tables */}
      {isRestaurant && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Table Management</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={loadTables}><RefreshCw className="h-4 w-4" /></Button>
              {canManage && <Button size="sm" onClick={openNewTable}><Plus className="h-4 w-4 mr-1.5" />Add Table</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={tables} columns={tableColumns}
              searchKeys={["tableNo"]} searchPlaceholder="Search tables..."
              onEdit={canManage ? openEditTable : undefined}
              onDelete={canManage ? (t => setPendingDeleteTable(t)) : undefined}
            />
          </CardContent>
        </Card>
      )}

      <DangerConfirmModal
        open={!!pendingDeleteTable}
        title={`Remove table "${pendingDeleteTable?.tableNo}"?`}
        description="This table will be permanently removed."
        confirmLabel="Remove"
        loading={deletingTable}
        onConfirm={confirmDeleteTable}
        onCancel={() => setPendingDeleteTable(null)}
      />

      <ModalForm open={tableModal} onClose={() => setTableModal(false)}
        title={editingTable ? "Edit Table" : "Add Table"}
        onSubmit={handleSaveTable} submitLabel={savingTable ? "Saving..." : editingTable ? "Update" : "Add"}>
        <div className="space-y-3">
          <div><Label>Table Number *</Label><Input value={tableForm.tableNo} onChange={e => setTableForm(f => ({ ...f, tableNo: e.target.value }))} placeholder="e.g. T1, Table 1" /></div>
          <div><Label>Capacity (seats)</Label><Input type="number" value={tableForm.capacity} onChange={e => setTableForm(f => ({ ...f, capacity: +e.target.value }))} /></div>
          <div><Label>Status</Label>
            <Select value={tableForm.status} onValueChange={v => setTableForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
