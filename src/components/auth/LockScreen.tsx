import { useState } from "react";
import { Lock, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSession } from "@/data/sessionStore";

// Full-screen overlay shown when the user (or the idle timer) locks the
// terminal. The underlying JWT session stays alive the whole time — this only
// gates the UI, so re-entering it is a quick PIN, not a full re-login. If no
// PIN was ever set the only way forward is a real logout, so the user is never
// stranded behind a lock they can't clear.
export function LockScreen() {
  const { unlockWithPin, logout } = useAuth();
  const { user } = useSession();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await unlockWithPin(pin);
    } catch {
      setError("Incorrect PIN");
      setPin("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-800/90 shadow-2xl p-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-white text-lg font-bold">Screen locked</h2>
          <p className="text-slate-400 text-sm mt-1">{user.name || "Signed in"} — enter your PIN to continue</p>
        </div>

        {user.hasPin ? (
          <form onSubmit={handleUnlock} className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="PIN"
              value={pin}
              onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setError(null); }}
              className="h-12 text-center text-xl tracking-[0.5em] bg-slate-700/60 border-slate-600/60 text-white"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button type="submit" className="w-full h-11 font-semibold" disabled={submitting || pin.length < 4}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Unlock
            </Button>
          </form>
        ) : (
          <p className="text-sm text-amber-400">No quick-unlock PIN is set on this account.</p>
        )}

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors pt-1">
          <LogOut className="w-3.5 h-3.5" /> Log out instead
        </button>
      </div>
    </div>
  );
}
