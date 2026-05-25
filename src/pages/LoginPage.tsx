import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Fuel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/AuthProvider";
import { authService } from "@/lib/authService";
import { toast } from "sonner";

// ── schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

const resetSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your SMS"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Must contain uppercase, lowercase, and a number"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginValues     = z.infer<typeof loginSchema>;
type ForgotValues    = z.infer<typeof forgotSchema>;
type ResetValues     = z.infer<typeof resetSchema>;
type View = "login" | "forgot" | "reset";

// ── component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";

  const [view, setView] = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const forgotForm = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });
  const resetForm = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  async function handleLogin(values: LoginValues) {
    clearError();
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch {
      // error displayed via AuthContext
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(values: ForgotValues) {
    setSubmitting(true);
    try {
      const res = await authService.forgotPassword(values.email);
      toast.success("Reset code sent to your registered phone number");
      if (res.dev_otp) {
        toast.info(`DEV — OTP code: ${res.dev_otp}`, { duration: 60000 });
      }
      setView("reset");
    } catch {
      toast.error("Failed to send reset code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(values: ResetValues) {
    setSubmitting(true);
    try {
      await authService.resetPassword(values.token, values.password);
      toast.success("Password reset. Please log in.");
      setView("login");
      resetForm.reset();
    } catch {
      toast.error("Invalid or expired reset token.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2">
            <Fuel className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ISMS</h1>
          <p className="text-slate-400 text-sm">Integrated Station Management System</p>
        </div>

        {/* Login */}
        {view === "login" && (
          <Card className="border-slate-700 bg-slate-800/60 backdrop-blur shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Sign in</CardTitle>
              <CardDescription className="text-slate-400">Enter your credentials to access the system</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="border-red-800 bg-red-950/50 text-red-300">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@isms.co.ke"
                    autoComplete="email"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                    {...loginForm.register("email")}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-red-400">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-slate-200">Password</Label>
                    <button
                      type="button"
                      onClick={() => { clearError(); setView("forgot"); }}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary pr-10"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Forgot password */}
        {view === "forgot" && (
          <Card className="border-slate-700 bg-slate-800/60 backdrop-blur shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Reset password</CardTitle>
              <CardDescription className="text-slate-400">Enter your email and we'll send reset instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email" className="text-slate-200">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="your@email.com"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                    {...forgotForm.register("email")}
                  />
                  {forgotForm.formState.errors.email && (
                    <p className="text-xs text-red-400">{forgotForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300"
                    onClick={() => setView("login")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Send link
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Reset password */}
        {view === "reset" && (
          <Card className="border-slate-700 bg-slate-800/60 backdrop-blur shadow-2xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-white">Set new password</CardTitle>
              <CardDescription className="text-slate-400">Enter the 6-digit code sent to your phone and choose a new password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-token" className="text-slate-200">Verification code</Label>
                  <Input
                    id="reset-token"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="6-digit code"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary tracking-[0.4em] text-center text-lg font-mono"
                    {...resetForm.register("token")}
                  />
                  {resetForm.formState.errors.token && (
                    <p className="text-xs text-red-400">{resetForm.formState.errors.token.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-slate-200">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min 8 chars, upper + lower + number"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                    {...resetForm.register("password")}
                  />
                  {resetForm.formState.errors.password && (
                    <p className="text-xs text-red-400">{resetForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-slate-200">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat new password"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-primary"
                    {...resetForm.register("confirmPassword")}
                  />
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="text-xs text-red-400">{resetForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300"
                    onClick={() => setView("forgot")}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Reset password
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-slate-600 text-xs">
          &copy; {new Date().getFullYear()} ISMS &mdash; All rights reserved
        </p>
      </div>
    </div>
  );
}
