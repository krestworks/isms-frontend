import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { hrApi, ApiCareersApiKey } from "@/lib/hrApi";

const blankForm = { name: "", allowedOrigin: "", expiresAt: "" };

// Admin-generated keys for embedding the job board on an EXTERNAL site (e.g. a
// separate marketing website) — origin- and expiry-scoped. The first-party
// /careers page on this app doesn't need one; it fetches the public endpoints
// directly, same-origin.
export function CareersApiKeysSection() {
  const [keys, setKeys]       = useState<ApiCareersApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]       = useState(blankForm);
  const [saving, setSaving]   = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiCareersApiKey | null>(null);

  const load = async () => {
    setLoading(true);
    try { setKeys((await hrApi.recruitment.apiKeys.list()).data ?? []); }
    catch (e: any) { toast.error(e?.message || "Failed to load API keys"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setForm({ ...blankForm, expiresAt: in90Days });
    setModalOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.allowedOrigin.trim()) return toast.error("Allowed origin is required, e.g. https://example.com");
    if (!form.expiresAt) return toast.error("Expiry date is required");
    setSaving(true);
    try {
      const res = await hrApi.recruitment.apiKeys.create(form);
      setIssuedKey(res.data.key);
      setModalOpen(false);
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to create API key"); }
    finally { setSaving(false); }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await hrApi.recruitment.apiKeys.revoke(revokeTarget.id);
      toast.success("API key revoked");
      load();
    } catch (e: any) { toast.error(e?.message || "Failed to revoke key"); }
    finally { setRevokeTarget(null); }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold flex items-center gap-1.5"><Key className="h-3.5 w-3.5" /> External API Access</p>
            <p className="text-xs text-muted-foreground">Keys for embedding the job board on a site other than this one — scoped to one origin, with an expiry date.</p>
          </div>
          <Button size="sm" variant="outline" onClick={openNew}><Plus className="h-3.5 w-3.5 mr-1.5" />New Key</Button>
        </div>

        {!loading && keys.length === 0 && (
          <p className="text-xs text-muted-foreground">No external API keys yet.</p>
        )}

        <div className="space-y-1.5">
          {keys.map(k => {
            const expired = new Date(k.expiresAt) < new Date();
            return (
              <div key={k.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{k.name}</span>
                    {k.revoked && <span className="text-[10px] text-destructive">Revoked</span>}
                    {!k.revoked && expired && <span className="text-[10px] text-amber-600">Expired</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {k.allowedOrigin} · expires {new Date(k.expiresAt).toLocaleDateString()}
                    {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · never used"}
                  </p>
                </div>
                {!k.revoked && (
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => setRevokeTarget(k)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Create key modal */}
      <ModalForm open={modalOpen} onClose={() => setModalOpen(false)} title="New External API Key"
        description="Generates a key scoped to one origin and an expiry date" onSubmit={handleCreate}
        submitLabel={saving ? "Creating..." : "Create Key"}>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Marketing site widget" /></div>
          <div><Label>Allowed Origin</Label><Input value={form.allowedOrigin} onChange={e => setForm(f => ({ ...f, allowedOrigin: e.target.value }))} placeholder="https://example.com" /></div>
          <div><Label>Expires On</Label><Input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} /></div>
        </div>
      </ModalForm>

      {/* Show the raw key exactly once */}
      <ModalForm open={!!issuedKey} onClose={() => { setIssuedKey(null); setCopied(false); }} title="API Key Created" isView>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Copy this key now — it will not be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted px-3 py-2.5 rounded break-all border">{issuedKey}</code>
            <Button size="icon" variant="outline" className="shrink-0" onClick={() => {
              if (issuedKey) { navigator.clipboard.writeText(issuedKey); setCopied(true); setTimeout(() => setCopied(false), 2000); }
            }}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use it as <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;key&gt;</code> when calling the embed endpoint from the allowed origin.
          </p>
        </div>
      </ModalForm>

      <ConfirmDialog
        open={!!revokeTarget}
        title={`Revoke "${revokeTarget?.name}"?`}
        description="Any site still using this key will immediately lose access."
        confirmLabel="Revoke"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </Card>
  );
}
