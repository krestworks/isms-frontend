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
  { label: "Live Monitoring",  value: "Real-time",     icon: Zap        },
  { label: "Revenue Tracked",  value: "Daily Reports", icon: TrendingUp },
  { label: "Multi-Station",    value: "All Locations", icon: Building2  },
  { label: "HR & Payroll",     value: "Integrated",    icon: Users      },
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

// ── Amber brand tokens ──────────────────────────────────────────────────────
const A = {
  bg:           "#0a0800",
  bgMid:        "#110e00",
  primary:      "#F5A623",
  primaryLight: "#FFD166",
  primaryDark:  "#C47A00",
  orb1:         "rgba(245,166,35,0.18)",
  orb2:         "rgba(194,120,0,0.12)",
  orb3:         "rgba(245,166,35,0.08)",
  cardBg:       "rgba(255,255,255,0.05)",
  cardBorder:   "rgba(245,166,35,0.18)",
  cardBorderHov:"rgba(245,166,35,0.40)",
  iconBg:       "rgba(245,166,35,0.12)",
  iconBorder:   "rgba(245,166,35,0.22)",
  checkBg:      "rgba(245,166,35,0.12)",
  checkBorder:  "rgba(245,166,35,0.28)",
  btnGrad:      "linear-gradient(135deg, #C47A00, #F5A623, #FFD166)",
  btnShadow:    "0 4px 20px rgba(245,166,35,0.35)",
  topLine:      "linear-gradient(to right, transparent, rgba(245,166,35,0.40), transparent)",
  botLine:      "linear-gradient(to right, transparent, rgba(245,166,35,0.15), transparent)",
  grid:         "linear-gradient(to right,rgba(245,166,35,0.04) 1px,transparent 1px),linear-gradient(to bottom,rgba(245,166,35,0.04) 1px,transparent 1px)",
  logoFilter:   "brightness(0) saturate(100%) invert(68%) sepia(76%) saturate(600%) hue-rotate(5deg) brightness(105%)",
};

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

  // Right panel colours driven by theme state (not CSS class)
  const isLight = theme !== "dark";
  const rp = {
    bg:          isLight ? "#ffffff"                      : "#0f0e17",
    cardBg:      isLight ? "#ffffff"                      : "rgba(30,27,48,0.85)",
    cardBorder:  isLight ? "#e2e8f0"                      : "rgba(255,255,255,0.08)",
    labelColor:  isLight ? "#475569"                      : "rgba(255,255,255,0.50)",
    inputBg:     isLight ? "#f8fafc"                      : "rgba(255,255,255,0.06)",
    inputBorder: isLight ? "#cbd5e1"                      : "rgba(255,255,255,0.10)",
    inputColor:  isLight ? "#0f172a"                      : "#ffffff",
    inputPH:     isLight ? "#94a3b8"                      : "rgba(255,255,255,0.30)",
    headColor:   isLight ? "#0f172a"                      : "#ffffff",
    subColor:    isLight ? "#64748b"                      : "rgba(255,255,255,0.40)",
    greetColor:  A.primary,
    divider:     isLight ? "#e2e8f0"                      : "rgba(255,255,255,0.08)",
    secureColor: isLight ? "#94a3b8"                      : "rgba(255,255,255,0.30)",
    toggleBg:    isLight ? "#f1f5f9"                      : "rgba(255,255,255,0.08)",
    toggleHov:   isLight ? "#e2e8f0"                      : "rgba(255,255,255,0.14)",
    toggleColor: isLight ? "#475569"                      : "rgba(255,255,255,0.60)",
    stripColor:  isLight ? "#94a3b8"                      : "rgba(255,255,255,0.35)",
    footColor:   isLight ? "#94a3b8"                      : "rgba(255,255,255,0.20)",
    orbA:        isLight ? "rgba(245,166,35,0.06)"        : "rgba(245,166,35,0.07)",
    orbB:        isLight ? "rgba(245,166,35,0.04)"        : "rgba(245,166,35,0.05)",
    outlineBg:   isLight ? "#ffffff"                      : "rgba(255,255,255,0.06)",
    outlineBord: isLight ? "#cbd5e1"                      : "rgba(255,255,255,0.10)",
    outlineCol:  isLight ? "#334155"                      : "rgba(255,255,255,0.70)",
  };

  const sharedInput: React.CSSProperties = {
    background:  rp.inputBg,
    border:      `1px solid ${rp.inputBorder}`,
    color:       rp.inputColor,
  };

  return (
    <>
      <style>{`
        @keyframes orb-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(20px,-15px) scale(1.05); }
          66%      { transform: translate(-10px,20px) scale(0.97); }
        }
        @keyframes card-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-5px); }
        }
        .orb-1 { animation: orb-drift 12s ease-in-out infinite; }
        .orb-2 { animation: orb-drift 15s ease-in-out infinite 3s; }
        .orb-3 { animation: orb-drift 10s ease-in-out infinite 6s; }
        .orb-4 { animation: orb-drift 18s ease-in-out infinite 1.5s; }
        .cf1  { animation: card-float 4s   ease-in-out infinite; }
        .cf2  { animation: card-float 5s   ease-in-out infinite 1s; }
        .cf3  { animation: card-float 4.5s ease-in-out infinite 0.5s; }
        .cf4  { animation: card-float 6s   ease-in-out infinite 1.5s; }
        .metric-card:hover { transform: scale(1.03); }
        .metric-card { transition: transform 0.25s, border-color 0.25s, background 0.25s; }
      `}</style>

      <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[57%_43%]">

        {/* ── LEFT — amber-branded branding panel ──────────────────────────── */}
        <div
          className="hidden lg:flex flex-col relative overflow-hidden p-12"
          style={{ background: `linear-gradient(160deg, ${A.bg} 0%, ${A.bgMid} 50%, ${A.bg} 100%)`, minHeight: "100vh" }}
        >
          {/* Orbs */}
          <div className="orb-1 absolute top-16   right-24   w-80 h-80 rounded-full pointer-events-none blur-[80px]"  style={{ background: A.orb1 }} />
          <div className="orb-2 absolute -bottom-16 -left-8  w-96 h-96 rounded-full pointer-events-none blur-[100px]" style={{ background: A.orb2 }} />
          <div className="orb-3 absolute top-1/2   right-4   w-48 h-48 rounded-full pointer-events-none blur-[60px]"  style={{ background: A.orb3 }} />
          <div className="orb-4 absolute top-1/3   left-1/3  w-56 h-56 rounded-full pointer-events-none blur-[70px]"  style={{ background: A.orb3 }} />

          {/* Grid texture */}
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: A.grid, backgroundSize: "56px 56px" }} />
          <div className="absolute top-0    left-0 right-0 h-px pointer-events-none" style={{ background: A.topLine }} />
          <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{ background: A.botLine }} />

          {/* ── Centered content ── */}
          <div className="relative z-10 flex flex-col flex-1 justify-center gap-9 max-w-[420px] mx-auto w-full">

            {/* Logo */}
            <div>
              <img src="/krstlogo.png" alt="Krestworks" className="h-10 w-auto object-contain" style={{ filter: A.logoFilter }} />
            </div>

            {/* Hero */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-px w-8" style={{ background: A.primary }} />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: A.primaryLight }}>
                  Integrated Platform
                </span>
              </div>
              <h1 className="text-5xl font-extrabold leading-tight" style={{ color: "#fff" }}>Station Flow</h1>
              <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>
                The complete platform for running fuel stations, managing teams, and tracking performance — all from one dashboard.
              </p>
            </div>

            {/* Metric cards — reduced text sizes */}
            <div className="grid grid-cols-2 gap-3">
              {metricCards.map(({ label, value, icon: Icon }, i) => (
                <div
                  key={label}
                  className={`metric-card cf${i + 1} p-3.5 rounded-2xl cursor-default`}
                  style={{ background: A.cardBg, border: `1px solid ${A.cardBorder}`, backdropFilter: "blur(8px)" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = A.cardBorderHov;
                    (e.currentTarget as HTMLDivElement).style.background  = "rgba(255,255,255,0.08)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = A.cardBorder;
                    (e.currentTarget as HTMLDivElement).style.background  = A.cardBg;
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center mb-2.5"
                    style={{ background: A.iconBg, border: `1px solid ${A.iconBorder}` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: A.primary }} strokeWidth={1.8} />
                  </div>
                  <p className="font-semibold text-xs" style={{ color: "#fff" }}>{value}</p>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.40)" }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Checklist */}
            <div className="space-y-2.5">
              {checklist.map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: A.checkBg, border: `1px solid ${A.checkBorder}` }}
                  >
                    <CheckCircle2 className="w-3 h-3" style={{ color: A.primary }} />
                  </div>
                  <span className="text-sm leading-snug" style={{ color: "rgba(255,255,255,0.42)" }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.20)" }}>
                &copy; {new Date().getFullYear()} Krestworks Solutions. All rights reserved.
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: A.primary }} />
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>Systems operational</span>
              </div>
            </div>

          </div>
        </div>

        {/* ── RIGHT — form panel (white default, dark on toggle) ────────────── */}
        <div
          className="flex-1 flex items-center justify-center relative overflow-hidden px-6 py-8 transition-colors duration-300"
          style={{ background: rp.bg }}
        >
          {/* Subtle bg glows */}
          <div className="absolute top-1/4  -right-20 w-60 h-60 rounded-full pointer-events-none blur-3xl" style={{ background: rp.orbA }} />
          <div className="absolute bottom-1/4 -left-20 w-60 h-60 rounded-full pointer-events-none blur-3xl" style={{ background: rp.orbB }} />

          {/* Theme toggle */}
          <button
            onClick={toggle}
            title={isLight ? "Switch to dark mode" : "Switch to light mode"}
            className="absolute top-4 right-4 z-20 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{ background: rp.toggleBg, color: rp.toggleColor }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = rp.toggleHov}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = rp.toggleBg}
          >
            {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <div className="w-full max-w-[520px] space-y-5 relative z-10">

            {/* Mobile branding */}
            <div className="lg:hidden text-center space-y-2 pb-2">
              <div className="flex justify-center">
                <img src="/krstlogo.png" alt="Krestworks" className="h-10 w-auto object-contain" style={{ filter: A.logoFilter }} />
              </div>
              <h1 className="text-xl font-bold" style={{ color: rp.headColor }}>Station Flow</h1>
              <p className="text-sm" style={{ color: rp.subColor }}>Integrated Station Management</p>
            </div>

            {/* ── Login card ── */}
            {view === "login" && (
              <div
                className="rounded-2xl overflow-hidden shadow-xl transition-colors duration-300"
                style={{ background: rp.cardBg, border: `1px solid ${rp.cardBorder}` }}
              >
                {/* Amber top accent line */}
                <div className="h-[3px]" style={{ background: A.btnGrad }} />
                <div className="p-8">
                  <div className="mb-6">
                    <p className="text-sm font-medium" style={{ color: rp.greetColor }}>{getGreeting()}</p>
                    <h2 className="text-2xl font-bold mt-0.5" style={{ color: rp.headColor }}>Welcome back</h2>
                    <p className="text-xs mt-1" style={{ color: rp.subColor }}>Sign in to access your station dashboard</p>
                  </div>

                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    {error && (
                      <Alert className="py-2.5" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>
                        <AlertDescription className="text-xs" style={{ color: "#f87171" }}>{error}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: rp.labelColor }}>
                        Email address
                      </Label>
                      <Input
                        id="email" type="email" placeholder="you@company.co.ke" autoComplete="email"
                        className="h-11 rounded-lg text-sm transition-all duration-200"
                        style={sharedInput}
                        {...loginForm.register("email")}
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: rp.labelColor }}>
                          Password
                        </Label>
                        <button
                          type="button"
                          onClick={() => { clearError(); setView("forgot"); }}
                          className="text-xs transition-colors hover:underline"
                          style={{ color: A.primary }}
                          onMouseEnter={e => (e.currentTarget.style.color = A.primaryLight)}
                          onMouseLeave={e => (e.currentTarget.style.color = A.primary)}
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
                          className="h-11 rounded-lg pr-11 text-sm transition-all duration-200"
                          style={sharedInput}
                          {...loginForm.register("password")}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(s => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                          style={{ color: rp.secureColor }}
                          onMouseEnter={e => (e.currentTarget.style.color = rp.labelColor)}
                          onMouseLeave={e => (e.currentTarget.style.color = rp.secureColor)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {loginForm.formState.errors.password && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{loginForm.formState.errors.password.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 mt-1 transition-opacity"
                      style={{
                        background: A.btnGrad,
                        color: "#0a0800",
                        border: "none",
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.7 : 1,
                        boxShadow: A.btnShadow,
                      }}
                    >
                      {submitting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                        : <><ArrowRight className="w-4 h-4" /> Sign in to dashboard</>
                      }
                    </button>
                  </form>

                  <div className="mt-5 pt-5 flex items-center gap-2" style={{ borderTop: `1px solid ${rp.divider}` }}>
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: rp.secureColor }} />
                    <span className="text-[11px]" style={{ color: rp.secureColor }}>
                      Your session is encrypted and secured with role-based access control
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Forgot password card ── */}
            {view === "forgot" && (
              <div
                className="rounded-2xl overflow-hidden shadow-xl transition-colors duration-300"
                style={{ background: rp.cardBg, border: `1px solid ${rp.cardBorder}` }}
              >
                <div className="h-[3px]" style={{ background: A.btnGrad }} />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: A.iconBg, border: `1px solid ${A.iconBorder}` }}>
                      <KeyRound className="w-5 h-5" style={{ color: A.primary }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: rp.headColor }}>Reset password</h2>
                      <p className="text-xs" style={{ color: rp.subColor }}>We'll send a reset code to your phone</p>
                    </div>
                  </div>

                  <form onSubmit={forgotForm.handleSubmit(handleForgot)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: rp.labelColor }}>
                        Your email address
                      </Label>
                      <Input
                        id="forgot-email" type="email" placeholder="your@email.com"
                        className="h-11 rounded-lg text-sm"
                        style={sharedInput}
                        {...forgotForm.register("email")}
                      />
                      {forgotForm.formState.errors.email && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{forgotForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setView("login")}
                        className="flex-1 h-11 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: rp.outlineBg, border: `1px solid ${rp.outlineBord}`, color: rp.outlineCol, cursor: "pointer" }}
                      >
                        Back to login
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                        style={{ background: A.btnGrad, color: "#0a0800", border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: A.btnShadow }}
                      >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Send code
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ── Reset password card ── */}
            {view === "reset" && (
              <div
                className="rounded-2xl overflow-hidden shadow-xl transition-colors duration-300"
                style={{ background: rp.cardBg, border: `1px solid ${rp.cardBorder}` }}
              >
                <div className="h-[3px]" style={{ background: A.btnGrad }} />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: A.iconBg, border: `1px solid ${A.iconBorder}` }}>
                      <RotateCcw className="w-5 h-5" style={{ color: A.primary }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: rp.headColor }}>Set new password</h2>
                      <p className="text-xs" style={{ color: rp.subColor }}>Enter the 6-digit SMS code and choose a new password</p>
                    </div>
                  </div>

                  <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: rp.labelColor }}>
                        SMS verification code
                      </Label>
                      <Input
                        id="reset-token" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                        placeholder="_ _ _ _ _ _"
                        className="h-12 rounded-lg tracking-[0.5em] text-center text-lg font-mono"
                        style={sharedInput}
                        {...resetForm.register("token")}
                      />
                      {resetForm.formState.errors.token && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{resetForm.formState.errors.token.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: rp.labelColor }}>
                        New password
                      </Label>
                      <Input id="new-password" type="password" placeholder="Min 8 chars · upper · lower · number"
                        className="h-11 rounded-lg text-sm" style={sharedInput} {...resetForm.register("password")} />
                      {resetForm.formState.errors.password && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{resetForm.formState.errors.password.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider" style={{ color: rp.labelColor }}>
                        Confirm password
                      </Label>
                      <Input id="confirm-password" type="password" placeholder="Repeat new password"
                        className="h-11 rounded-lg text-sm" style={sharedInput} {...resetForm.register("confirmPassword")} />
                      {resetForm.formState.errors.confirmPassword && (
                        <p className="text-xs" style={{ color: "#f87171" }}>{resetForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="flex-1 h-11 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: rp.outlineBg, border: `1px solid ${rp.outlineBord}`, color: rp.outlineCol, cursor: "pointer" }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
                        style={{ background: A.btnGrad, color: "#0a0800", border: "none", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: A.btnShadow }}
                      >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Reset password
                      </button>
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
                  <Icon className="w-3.5 h-3.5" style={{ color: rp.stripColor }} />
                  <span className="text-[11px]" style={{ color: rp.stripColor }}>{label}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-[11px] lg:hidden" style={{ color: rp.footColor }}>
              &copy; {new Date().getFullYear()} Krestworks Solutions
            </p>
          </div>
        </div>

      </div>
    </>
  );
}