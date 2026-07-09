import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, Smartphone, ShieldCheck, Trash2, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { authService, SessionInfo, AllSessionInfo } from "@/lib/authService";
import { sessionStore, useSession } from "@/data/sessionStore";
import { usePermissions } from "@/lib/permissions";

interface SecuritySettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (/mobile|android|iphone/i.test(userAgent)) return "Mobile browser";
  return "Desktop browser";
}

export function SecuritySettingsModal({ open, onClose }: SecuritySettingsModalProps) {
  const { user } = useSession();
  const can = usePermissions();
  const canManageAll = can("settings.sessions.manage");

  const [currentPassword, setCurrentPassword] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [allSessions, setAllSessions] = useState<AllSessionInfo[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try { setSessions(await authService.listSessions()); }
    catch { /* best-effort */ }
    finally { setLoadingSessions(false); }
  };

  const loadAllSessions = async () => {
    setLoadingAll(true);
    try { setAllSessions(await authService.listAllSessions()); }
    catch { /* best-effort */ }
    finally { setLoadingAll(false); }
  };

  useEffect(() => {
    if (open) {
      loadSessions();
      setCurrentPassword(""); setPin(""); setPinConfirm("");
      setShowAll(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && showAll && canManageAll) loadAllSessions();
  }, [open, showAll, canManageAll]);

  async function handleSetPin() {
    if (!/^\d{4,6}$/.test(pin)) return toast.error("PIN must be 4-6 digits");
    if (pin !== pinConfirm) return toast.error("PINs do not match");
    if (!currentPassword) return toast.error("Enter your current password to confirm");
    setSavingPin(true);
    try {
      await authService.setPin(pin, currentPassword);
      sessionStore.setUser({ ...sessionStore.user(), hasPin: true });
      toast.success("Quick-unlock PIN set");
      setCurrentPassword(""); setPin(""); setPinConfirm("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to set PIN");
    } finally {
      setSavingPin(false);
    }
  }

  async function handleClearPin() {
    try {
      await authService.clearPin();
      sessionStore.setUser({ ...sessionStore.user(), hasPin: false });
      toast.success("Quick-unlock PIN removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove PIN");
    }
  }

  async function handleRevoke(id: string, isAllList: boolean) {
    try {
      await authService.revokeSession(id);
      toast.success("Session revoked");
      isAllList ? loadAllSessions() : loadSessions();
    } catch (e: any) {
      toast.error(e?.message || "Failed to revoke session");
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Security</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">Quick-unlock PIN and active sessions for your account</p>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
          {/* ── Quick-unlock PIN ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick-unlock PIN</Label>
            <p className="text-xs text-muted-foreground">
              Lock the screen between customers and unlock with a short PIN instead of signing in again.
            </p>
            {user.hasPin && (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/30">
                <span className="text-sm">A PIN is currently set</span>
                <Button size="sm" variant="outline" onClick={handleClearPin}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Remove</Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Input type="password" inputMode="numeric" maxLength={6} placeholder="New PIN (4-6 digits)"
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} />
              <Input type="password" inputMode="numeric" maxLength={6} placeholder="Confirm PIN"
                value={pinConfirm} onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Input type="password" placeholder="Current account password" value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)} />
            <Button size="sm" onClick={handleSetPin} disabled={savingPin}>
              {savingPin ? "Saving..." : user.hasPin ? "Change PIN" : "Set PIN"}
            </Button>
          </div>

          {/* ── Active sessions ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active sessions</Label>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadSessions} disabled={loadingSessions}>
                <RefreshCw className={`h-3.5 w-3.5 ${loadingSessions ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {sessions.length === 0 && !loadingSessions && (
                <p className="text-xs text-muted-foreground">No active sessions found.</p>
              )}
              {sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {/mobile|android|iphone/i.test(s.userAgent || "") ? <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" /> : <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{deviceLabel(s.userAgent)}</span>
                        {s.current && <span className="text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5 shrink-0">This device</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{s.ipAddress || "Unknown IP"} · {new Date(s.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => handleRevoke(s.id, false)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── All active sessions (Admin/Manager only) ── */}
          {canManageAll && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAll(v => !v)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer">
                  {showAll ? "Hide" : "Show"} all active sessions (everyone in scope)
                </Label>
              </button>

              {showAll && (
                <>
                  <div className="flex items-center justify-end">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={loadAllSessions} disabled={loadingAll}>
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingAll ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {allSessions.length === 0 && !loadingAll && (
                      <p className="text-xs text-muted-foreground">No active sessions found.</p>
                    )}
                    {allSessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {/mobile|android|iphone/i.test(s.userAgent || "") ? <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" /> : <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{s.user.name}</span>
                              <span className="text-[10px] text-muted-foreground shrink-0">{s.user.activeRole}</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.user.email} · {s.ipAddress || "Unknown IP"} · {new Date(s.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {s.user.id !== user.id && (
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => handleRevoke(s.id, true)}>
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
