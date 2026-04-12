import { useState } from "react";
import { DataTable, Column, FilterOption } from "@/components/shared/DataTable";
import { ModalForm } from "@/components/shared/ModalForm";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface Export {
  id: string;
  reportTitle: string;
  format: string;
  exportedBy: string;
  exportedAt: string;
  fileSize: string;
  status: string;
}

const initial: Export[] = [
  { id: "EXP-001", reportTitle: "Daily Fuel Sales Summary", format: "PDF", exportedBy: "Admin", exportedAt: "2025-01-15 18:05", fileSize: "245 KB", status: "completed" },
  { id: "EXP-002", reportTitle: "Weekly LPG Inventory Report", format: "Excel", exportedBy: "Manager", exportedAt: "2025-01-14 23:10", fileSize: "512 KB", status: "completed" },
  { id: "EXP-003", reportTitle: "Monthly Revenue Breakdown", format: "PDF", exportedBy: "Accountant", exportedAt: "2025-01-01 06:15", fileSize: "1.2 MB", status: "completed" },
  { id: "EXP-004", reportTitle: "Water Production Log", format: "CSV", exportedBy: "Admin", exportedAt: "2025-01-15 17:00", fileSize: "89 KB", status: "completed" },
  { id: "EXP-005", reportTitle: "Monthly P&L Statement", format: "Excel", exportedBy: "Accountant", exportedAt: "2025-01-02 09:30", fileSize: "780 KB", status: "pending" },
];

export function ExportHistoryTab() {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<{ item: Export } | null>(null);

  const handleDelete = (e: Export) => { setData(d => d.filter(x => x.id !== e.id)); toast.success("Export record deleted"); };

  const columns: Column<Export>[] = [
    { key: "id", label: "ID" },
    { key: "reportTitle", label: "Report", sortable: true },
    { key: "format", label: "Format" },
    { key: "exportedBy", label: "Exported By" },
    { key: "exportedAt", label: "Exported At", sortable: true },
    { key: "fileSize", label: "Size" },
    { key: "status", label: "Status", render: e => <StatusBadge status={e.status} /> },
  ];

  const filters: FilterOption[] = [
    { key: "format", label: "Format", options: [{ label: "PDF", value: "PDF" }, { label: "Excel", value: "Excel" }, { label: "CSV", value: "CSV" }] },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Export History</h3>
      <DataTable data={data} columns={columns} searchKeys={["reportTitle", "exportedBy"]} searchPlaceholder="Search exports..." filters={filters} onView={(e) => setModal({ item: e })} onDelete={handleDelete} />
      {modal && (
        <ModalForm open onClose={() => setModal(null)} title="Export Details" isView>
          <div className="space-y-3">
            <div><Label>Report</Label><Input value={modal.item.reportTitle} readOnly /></div>
            <div><Label>Format</Label><Input value={modal.item.format} readOnly /></div>
            <div><Label>Exported By</Label><Input value={modal.item.exportedBy} readOnly /></div>
            <div><Label>Exported At</Label><Input value={modal.item.exportedAt} readOnly /></div>
            <div><Label>File Size</Label><Input value={modal.item.fileSize} readOnly /></div>
            <Button variant="outline" className="w-full"><Download className="h-4 w-4 mr-1" /> Re-download</Button>
          </div>
        </ModalForm>
      )}
    </div>
  );
}
