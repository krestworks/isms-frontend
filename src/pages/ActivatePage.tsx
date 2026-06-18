import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, CheckCircle2, Loader2, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface InviteUser {
  id: string;
  name: string;
  email: string;
  activeRole: string;
}

type PageState = "loading" | "ready" | "invalid" | "submitting" | "done";

export default function ActivatePage() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get("token") ?? "";

  const [state,    setState]    = useState<PageState>("loading");
  const [invUser,  setInvUser]  = useState<InviteUser | null>(null);
  const [error,    setError]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setState("invalid"); setError("No invite token in this link."); return; }

    api.get<{ success: boolean; data: InviteUser }>(`/auth/invite/${token}`)
      .then(res => {
        if (res.success && res.data) { setInvUser(res.data); setState("ready"); }
        else { setState("invalid"); setError("Invite link is invalid or has expired."); }
      })
      .catch(err => {
        setState("invalid");
        setError(err?.message || "Invite link is invalid or has expired.");
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("Password must contain uppercase, lowercase, and a number.");
      return;
    }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setState("submitting");
    try {
      await api.post("/auth/invite/accept", { token, password });
      setState("done");
      // Auto-redirect to login after 3 s
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setError(err?.message || "Activation failed. The link may have expired.");
      setState("ready");
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────────
  if (state === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">Account Activated!</h1>
          <p className="text-muted-foreground text-sm">
            Your password has been set. You can now log in to ISMS.
          </p>
          <p className="text-xs text-muted-foreground">Redirecting to login in 3 seconds…</p>
          <Button className="w-full" onClick={() => navigate("/login")}>Go to Login</Button>
        </div>
      </div>
    );
  }

  // ── Invalid / expired ─────────────────────────────────────────────────────────
  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Invalid Invite Link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Contact your administrator to resend the invite.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── Set password form ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Activate Your Account</h1>
          {invUser && (
            <div className="space-y-0.5">
              <p className="font-medium text-foreground">{invUser.name}</p>
              <p className="text-sm text-muted-foreground">{invUser.email}</p>
              <span className="inline-block mt-1 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                {invUser.activeRole}
              </span>
            </div>
          )}
        </div>

        <p className="text-sm text-center text-muted-foreground">
          Set a password to activate your ISMS account. You'll use it to log in.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pw">New Password</Label>
            <div className="relative">
              <Input
                id="pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Must contain uppercase, lowercase, and a number.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf">Confirm Password</Label>
            <div className="relative">
              <Input
                id="cf"
                type={showCf ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCf(v => !v)}
              >
                {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={state === "submitting"}>
            {state === "submitting"
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Activating…</>
              : "Activate Account & Set Password"
            }
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
