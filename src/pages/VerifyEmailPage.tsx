import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, Loader2, AlertCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

type PageState = "verifying" | "done" | "invalid";

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<PageState>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setState("invalid"); setError("No verification token in this link."); return; }

    api.post<{ success: boolean; message: string }>("/auth/verify-email", { token }, { skipAuth: true })
      .then(() => setState("done"))
      .catch(err => {
        setState("invalid");
        setError(err?.message || "Verification link is invalid or has expired.");
      });
  }, [token]);

  if (state === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Invalid Verification Link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Request a new verification email from the login page.
          </p>
          <Link to="/login">
            <Button variant="outline" className="w-full">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-10 max-w-md w-full text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Email Verified!</h1>
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-1.5">
          <MailCheck className="h-4 w-4" /> Your email address has been confirmed.
        </p>
        <Link to="/login">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
