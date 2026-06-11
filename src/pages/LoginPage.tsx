import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, ShieldCheck, BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/AuthProvider";
import { authService } from "@/lib/authService";
import { toast } from "sonner";

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

type LoginValues  = z.infer<typeof loginSchema>;
type ForgotValues = z.infer<typeof forgotSchema>;
type ResetValues  = z.infer<typeof resetSchema>;
type View = "login" | "forgot" | "reset";

const features = [
  { icon: BarChart3, title: "Real-time Operations",  desc: "Monitor fuel, inventory, and service bays from a single dashboard" },
  { icon: Users,     title: "Team Management",       desc: "HR, shifts, payroll, and performance — all integrated" },
  { icon: ShieldCheck, title: "Role-based Access",  desc: "Fine-grained permissions ensure the right people see the right data" },
];

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";

  const [view, setView]               = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const loginForm  = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const forgotForm = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });
  const resetForm  = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

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
      if (res.dev_otp) toast.info(`DEV — OTP code: ${res.dev_otp}`, { duration: 60000 });
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
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-2">

      {/* ── Left branding panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 p-10 relative overflow-hidden">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* Glow accent */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <img src="/krstlogo.png" alt="Krestworks" className="h-12 w-auto object-contain brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Station Flow
            </h1>
            <p className="text-slate-400 mt-2 text-lg leading-relaxed">
              Integrated Station Management System
            </p>
            <p className="text-slate-500 mt-1 text-sm">by Krestworks Solutions</p>
          </div>

          <div className="space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-600 text-xs">&copy; {new Date().getFullYear()} Krestworks Solutions. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="w-full max-w-md space-y-6">

          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-3">
            <div className="flex justify-center">
              <img src="/krstlogo.png" alt="Krestworks" className="h-12 w-auto object-contain brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Station Flow</h1>
              <p className="text-slate-400 text-sm">Integrated Station Management System</p>
            </div>
          </div>

          {/* ── Login form ── */}
          {view === "login" && (
            <Card className="border-slate-700/60 bg-slate-800/70 backdrop-blur-sm shadow-2xl shadow-black/40">
              <CardHeader className="pb-4 space-y-1">
                <CardTitle className="text-white text-xl">Welcome back</CardTitle>
                <CardDescription className="text-slate-400">Sign in to access your station dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="border-red-800/60 bg-red-950/40 text-red-300">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-slate-200 text-sm">Email address</Label>
                    <Input
                      id="email" type="email" placeholder="you@company.co.ke"
                      autoComplete="email"
                      className="bg-slate-700/60 border-slate-600/60 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary/40 h-10"
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-red-400">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-slate-200 text-sm">Password</Label>
                      <button type="button"
                        onClick={() => { clearError(); setView("forgot"); }}
                        className="text-xs text-primary hover:text-primary/80 transition-colors">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="bg-slate-700/60 border-slate-600/60 text-white placeholder:text-slate-500 focus:border-primary focus:ring-1 focus:ring-primary/40 h-10 pr-10"
                        {...loginForm.register("password")}
                      />
                      <button type="button"
                        onClick={() => setShowPassword(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-red-400">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full h-10 font-semibold" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Sign in
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Forgot password ── */}
          {view === "forgot" && (
            <Card className="border-slate-700/60 bg-slate-800/70 backdrop-blur-sm shadow-2xl shadow-black/40">
              <CardHeader className="pb-4 space-y-1">
                <CardTitle className="text-white text-xl">Reset password</CardTitle>
                <CardDescription className="text-slate-400">Enter your email — we'll send a reset code to your phone</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email" className="text-slate-200 text-sm">Email address</Label>
                    <Input
                      id="forgot-email" type="email" placeholder="your@email.com"
                      className="bg-slate-700/60 border-slate-600/60 text-white placeholder:text-slate-500 focus:border-primary h-10"
                      {...forgotForm.register("email")}
                    />
                    {forgotForm.formState.errors.email && (
                      <p className="text-xs text-red-400">{forgotForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setView("login")}>Back</Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Send code
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Reset password ── */}
          {view === "reset" && (
            <Card className="border-slate-700/60 bg-slate-800/70 backdrop-blur-sm shadow-2xl shadow-black/40">
              <CardHeader className="pb-4 space-y-1">
                <CardTitle className="text-white text-xl">Set new password</CardTitle>
                <CardDescription className="text-slate-400">Enter the 6-digit code from your SMS and choose a new password</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-token" className="text-slate-200 text-sm">Verification code</Label>
                    <Input
                      id="reset-token" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                      placeholder="6-digit code"
                      className="bg-slate-700/60 border-slate-600/60 text-white placeholder:text-slate-500 focus:border-primary tracking-[0.4em] text-center text-lg font-mono h-10"
                      {...resetForm.register("token")}
                    />
                    {resetForm.formState.errors.token && (
                      <p className="text-xs text-red-400">{resetForm.formState.errors.token.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-slate-200 text-sm">New password</Label>
                    <Input id="new-password" type="password" placeholder="Min 8 chars, upper + lower + number"
                      className="bg-slate-700/60 border-slate-600/60 text-white placeholder:text-slate-500 focus:border-primary h-10"
                      {...resetForm.register("password")}
                    />
                    {resetForm.formState.errors.password && (
                      <p className="text-xs text-red-400">{resetForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-slate-200 text-sm">Confirm password</Label>
                    <Input id="confirm-password" type="password" placeholder="Repeat new password"
                      className="bg-slate-700/60 border-slate-600/60 text-white placeholder:text-slate-500 focus:border-primary h-10"
                      {...resetForm.register("confirmPassword")}
                    />
                    {resetForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-red-400">{resetForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700" onClick={() => setView("forgot")}>Back</Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Reset password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-slate-600 text-xs lg:hidden">
            &copy; {new Date().getFullYear()} Krestworks Solutions
          </p>
        </div>
      </div>
    </div>
  );
}
