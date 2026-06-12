import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Eye, EyeOff, Loader2, ShieldCheck, BarChart3,
  Users, TrendingUp, Building2, Zap, ArrowRight,
  CheckCircle2, KeyRound, RotateCcw, Sun, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/auth/AuthProvider";
import { authService } from "@/lib/authService";
import { useTheme } from "@/lib/theme";
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

const metricCards = [
  { label: "Live Monitoring",  value: "Real-time",    icon: Zap        },
  { label: "Revenue Tracked",  value: "Daily Reports", icon: TrendingUp },
  { label: "Multi-Station",    value: "All Locations", icon: Building2  },
  { label: "HR & Payroll",     value: "Integrated",   icon: Users      },
];

const checklist = [
  "Real-time fuel sales, deliveries and reconciliation",
  "Fine-grained roles — Admin, Manager, Attendant, Employee",
  "Leave, shifts, payroll and compliance in one platform",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function LoginPage() {
  const { login, error, clearError } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const { theme, toggle } = useTheme();
  const from = (location.state as { from?: string })?.from || "/";

  const [view, setView]                 = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting]     = useState(false);

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
      toast.success("Password reset successfully. Please log in.");
      setView("login");
      resetForm.reset();
    } catch {
      toast.error("Invalid or expired reset token.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes orb-drift {
          0%, 100% { transform: translate(0,    0)    scale(1);    }
          33%       { transform: translate(20px, -15px) scale(1.05); }
          66%       { transform: translate(-10px, 20px) scale(0.97); }
        }
        @keyframes card-float {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-5px); }
        }
        .orb-1 { animation: orb-drift 12s ease-in-out infinite; }
        .orb-2 { animation: orb-drift 15s ease-in-out infinite 3s; }
        .orb-3 { animation: orb-drift 10s ease-in-out infinite 6s; }
        .orb-4 { animation: orb-drift 18s ease-in-out infinite 1.5s; }
        .card-float-1 { animation: card-float 4s   ease-in-out infinite; }
        .card-float-2 { animation: card-float 5s   ease-in-out infinite 1s; }
        .card-float-3 { animation: card-float 4.5s ease-in-out infinite 0.5s; }
        .card-float-4 { animation: card-float 6s   ease-in-out infinite 1.5s; }
      `}</style>

      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[57%_43%]">

        {/* ── Left branding panel ───────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col bg-slate-950 relative overflow-hidden p-10 transition-colors duration-300">

          {/* Orbs */}
          <div className="orb-1 absolute top-16   right-24   w-80 h-80 rounded-full bg-primary/20  blur-[80px]  pointer-events-none" />
          <div className="orb-2 absolute -bottom-16 -left-8  w-96 h-96 rounded-full bg-primary/10  blur-[100px] pointer-events-none" />
          <div className="orb-3 absolute top-1/2   right-4   w-48 h-48 rounded-full bg-blue-500/10 blur-[60px]  pointer-events-none" />
          <div className="orb-4 absolute top-1/3   left-1/3  w-56 h-56 rounded-full bg-blue-500/8  blur-[70px]  pointer-events-none" />

          {/* Grid texture */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)", backgroundSize: "56px 56px" }} />

          <div className="absolute top-0    left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />

          {/* Logo */}
          <div className="relative z-10">
            <img src="/krstlogo.png" alt="Krestworks" className="h-10 w-auto object-contain brightness-0 invert opacity-90" />
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center space-y-8 mt-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-px w-8 bg-primary/70" />
                <span className="text-primary/80 text-[11px] font-semibold uppercase tracking-[0.2em]">Integrated Platform</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white leading-tight">Station Flow</h1>
              <p className="text-slate-400 mt-3 text-base leading-relaxed max-w-sm">
                The complete platform for running fuel stations, managing teams, and tracking performance — all from one dashboard.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {metricCards.map(({ label, value, icon: Icon }, i) => (
                <div key={label}
                  className={`card-float-${i + 1} p-4 rounded-2xl bg-slate-800/60 border border-slate-700/50 backdrop-blur-sm hover:border-primary/40 hover:bg-slate-800/80 hover:scale-[1.03] transition-all duration-300 cursor-default group`}>
                  <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/25 transition-colors duration-300">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={1.8} />
                  </div>
                  <p className="text-white font-semibold text-sm">{value}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {checklist.map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-slate-400 text-sm leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <p className="text-slate-500 text-xs">&copy; {new Date().getFullYear()} Krestworks Solutions. All rights reserved.</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-pulse" />
              <span className="text-slate-400 text-[10px]">Systems operational</span>
            </div>
          </div>
        </div>

        {/* ── Right form panel ─────────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden px-6 py-8 light-panel transition-colors duration-300">

          {/* Subtle bg accents */}
          <div className="absolute top-1/4  -right-20 w-60 h-60 rounded-full bg-primary/5  blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -left-20 w-60 h-60 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />

          {/* Theme toggle — top right corner */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
                       bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-800
                       dark:bg-slate-700/80 dark:hover:bg-slate-600 dark:text-slate-300 dark:hover:text-white">
            {theme === "dark"
              ? <Sun  className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
          </button>

          <div className="w-full max-w-[580px] space-y-5 relative z-10">

            {/* Mobile branding */}
            <div className="lg:hidden text-center space-y-2 pb-2">
              <div className="flex justify-center">
                <img src="/krstlogo.png" alt="Krestworks"
                  className="h-10 w-auto object-contain dark:brightness-0 dark:invert dark:opacity-90
                             brightness-0 opacity-80" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Station Flow</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Integrated Station Management</p>
              </div>
            </div>

            {/* ── Login card ── */}
            {view === "login" && (
              <div className="rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300
                              border border-slate-200 bg-white
                              dark:border-slate-700/60 dark:bg-slate-800/70 dark:backdrop-blur-sm dark:shadow-black/40">
                <div className="h-[3px] bg-primary/80" />
                <div className="p-8">
                  <div className="mb-6">
                    <p className="text-primary text-sm font-medium">{getGreeting()}</p>
                    <h2 className="text-slate-900 dark:text-white text-2xl font-bold mt-0.5">Welcome back</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Sign in to access your station dashboard</p>
                  </div>

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    {error && (
                      <Alert className="border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-950/40 py-2.5">
                        <AlertDescription className="text-red-700 dark:text-red-300 text-xs">{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        Email address
                      </Label>
                      <Input
                        id="email" type="email" placeholder="you@company.co.ke"
                        autoComplete="email"
                        className="h-11 rounded-lg text-sm transition-all duration-200
                                   bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400
                                   focus:border-primary focus:ring-1 focus:ring-primary/40
                                   dark:bg-slate-700/60 dark:border-slate-600/60 dark:text-white dark:placeholder:text-slate-500"
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-xs text-red-500 dark:text-red-400">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                          Password
                        </Label>
                        <button type="button"
                          onClick={() => { clearError(); setView("forgot"); }}
                          className="text-xs text-primary hover:text-primary/80 transition-colors duration-150 hover:underline">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="current-password"
                          className="h-11 rounded-lg pr-11 text-sm transition-all duration-200
                                     bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400
                                     focus:border-primary focus:ring-1 focus:ring-primary/40
                                     dark:bg-slate-700/60 dark:border-slate-600/60 dark:text-white dark:placeholder:text-slate-500"
                          {...loginForm.register("password")}
                        />
                        <button type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors
                                     text-slate-400 hover:text-slate-600
                                     dark:text-slate-400 dark:hover:text-slate-200">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-xs text-red-500 dark:text-red-400">{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full h-11 font-semibold rounded-lg mt-1 group" disabled={submitting}>
                      {submitting
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
                        : <><ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" /> Sign in to dashboard</>
                      }
                    </Button>
                  </form>

                  <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      Your session is encrypted and secured with role-based access control
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Forgot password card ── */}
            {view === "forgot" && (
              <div className="rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300
                              border border-slate-200 bg-white
                              dark:border-slate-700/60 dark:bg-slate-800/70 dark:backdrop-blur-sm dark:shadow-black/40">
                <div className="h-[3px] bg-primary/80" />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <KeyRound className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-slate-900 dark:text-white text-xl font-bold">Reset password</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">We'll send a reset code to your phone</p>
                    </div>
                  </div>

                  <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        Your email address
                      </Label>
                      <Input
                        id="forgot-email" type="email" placeholder="your@email.com"
                        className="h-11 rounded-lg text-sm
                                   bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400
                                   focus:border-primary focus:ring-1 focus:ring-primary/40
                                   dark:bg-slate-700/60 dark:border-slate-600/60 dark:text-white dark:placeholder:text-slate-500"
                        {...forgotForm.register("email")}
                      />
                      {forgotForm.formState.errors.email && (
                        <p className="text-xs text-red-500 dark:text-red-400">{forgotForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline"
                        className="flex-1 h-11 rounded-lg
                                   border-slate-300 text-slate-700 hover:bg-slate-100
                                   dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={() => setView("login")}>
                        Back to login
                      </Button>
                      <Button type="submit" className="flex-1 h-11 rounded-lg font-semibold" disabled={submitting}>
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Send code
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Reset password card ── */}
            {view === "reset" && (
              <div className="rounded-2xl overflow-hidden shadow-2xl transition-colors duration-300
                              border border-slate-200 bg-white
                              dark:border-slate-700/60 dark:bg-slate-800/70 dark:backdrop-blur-sm dark:shadow-black/40">
                <div className="h-[3px] bg-primary/80" />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <RotateCcw className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-slate-900 dark:text-white text-xl font-bold">Set new password</h2>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Enter the 6-digit SMS code and choose a new password</p>
                    </div>
                  </div>

                  <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        SMS verification code
                      </Label>
                      <Input
                        id="reset-token" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                        placeholder="_ _ _ _ _ _"
                        className="h-12 rounded-lg tracking-[0.5em] text-center text-lg font-mono
                                   bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400
                                   focus:border-primary focus:ring-1 focus:ring-primary/40
                                   dark:bg-slate-700/60 dark:border-slate-600/60 dark:text-white dark:placeholder:text-slate-500"
                        {...resetForm.register("token")}
                      />
                      {resetForm.formState.errors.token && (
                        <p className="text-xs text-red-500 dark:text-red-400">{resetForm.formState.errors.token.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        New password
                      </Label>
                      <Input id="new-password" type="password" placeholder="Min 8 chars · upper · lower · number"
                        className="h-11 rounded-lg text-sm
                                   bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400
                                   focus:border-primary focus:ring-1 focus:ring-primary/40
                                   dark:bg-slate-700/60 dark:border-slate-600/60 dark:text-white dark:placeholder:text-slate-500"
                        {...resetForm.register("password")}
                      />
                      {resetForm.formState.errors.password && (
                        <p className="text-xs text-red-500 dark:text-red-400">{resetForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider">
                        Confirm password
                      </Label>
                      <Input id="confirm-password" type="password" placeholder="Repeat new password"
                        className="h-11 rounded-lg text-sm
                                   bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400
                                   focus:border-primary focus:ring-1 focus:ring-primary/40
                                   dark:bg-slate-700/60 dark:border-slate-600/60 dark:text-white dark:placeholder:text-slate-500"
                        {...resetForm.register("confirmPassword")}
                      />
                      {resetForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-500 dark:text-red-400">{resetForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button type="button" variant="outline"
                        className="flex-1 h-11 rounded-lg
                                   border-slate-300 text-slate-700 hover:bg-slate-100
                                   dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                        onClick={() => setView("forgot")}>
                        Back
                      </Button>
                      <Button type="submit" className="flex-1 h-11 rounded-lg font-semibold" disabled={submitting}>
                        {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Reset password
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Mini stats strip */}
            <div className="flex items-center justify-center gap-6 py-1">
              {[
                { icon: BarChart3,   label: "Live Analytics"   },
                { icon: Zap,         label: "Real-time Sync"   },
                { icon: ShieldCheck, label: "Secure & Audited" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">{label}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-slate-500 dark:text-slate-500 text-[11px] lg:hidden">
              &copy; {new Date().getFullYear()} Krestworks Solutions
            </p>
          </div>
        </div>

      </div>
    </>
  );
}
