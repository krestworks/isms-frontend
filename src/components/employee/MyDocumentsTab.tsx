import { useCallback, useEffect, useState } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { hrApi, ApiDocument } from "@/lib/hrApi";
import { toast } from "sonner";

export default function MyDocumentsTab() {
  const [docs, setDocs]       = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.self.documents.list();
      setDocs(res.data ?? []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (d: ApiDocument) => {
    try {
      const res = await hrApi.documents.download(d.id);
      if (res.data?.fileData) {
        const a = document.createElement("a");
        a.href = res.data.fileData;
        a.download = res.data.fileName;
        a.click();
      } else {
        toast.info("No downloadable file stored for this document");
      }
    } catch {
      toast.error("Could not download document");
    }
  };

  const statusCls = (s: string) =>
    s === "valid"    ? "bg-green-100 text-green-800" :
    s === "expiring" ? "bg-amber-100 text-amber-800" :
                       "bg-red-100 text-red-800";

  const columns: Column<ApiDocument>[] = [
    { key: "type",       label: "Type",     render: d => <Badge variant="outline">{d.type}</Badge> },
    { key: "fileName",   label: "File",     render: d => <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />{d.fileName}</span> },
    { key: "uploadedAt", label: "Uploaded", sortable: true, render: d => d.uploadedAt.split("T")[0] },
    { key: "expiresOn",  label: "Expires",  render: d => d.expiresOn || "—" },
    { key: "caseId",     label: "Source",   render: d => d.caseId ? <Badge variant="secondary" className="text-xs">Disciplinary</Badge> : <span className="text-muted-foreground text-xs">HR</span> },
    { key: "status",     label: "Status",   render: d => <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCls(d.status)}`}>{d.status}</span> },
  ];

  const expiring = docs.filter(d => d.status === "expiring").length;
  const expired  = docs.filter(d => d.status === "expired").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">My Documents</h3>
          <p className="text-sm text-muted-foreground">HR documents and files on your record</p>
        </div>
        <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{docs.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Expiring Soon</p><p className="text-2xl font-bold text-amber-600">{expiring}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Expired</p><p className="text-2xl font-bold text-destructive">{expired}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Loading your documents…</div>
      ) : docs.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No documents on file yet. HR will add documents as needed.</CardContent></Card>
      ) : (
        <DataTable
          data={docs}
          columns={columns}
          searchKeys={["fileName", "type"]}
          searchPlaceholder="Search documents…"
          actions={d => (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(d)}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        />
      )}
    </div>
  );
}
