import { useParams, Navigate, Link } from "react-router-dom";
import {
  LayoutDashboard, UserCircle, Clock, Calendar, Umbrella,
  Receipt, TrendingUp, AlertTriangle, FileText, ArrowRight,
} from "lucide-react";
import { useSession } from "@/data/sessionStore";
import { useMyEmployee } from "@/lib/useMyEmployee";
import { Card, CardContent } from "@/components/ui/card";
import MyDetailsTab from "@/components/employee/MyDetailsTab";
import MyAttendanceTab from "@/components/employee/MyAttendanceTab";
import MyShiftsTab from "@/components/employee/MyShiftsTab";
import MyLeaveTab from "@/components/employee/MyLeaveTab";
import MyPayslipsTab from "@/components/employee/MyPayslipsTab";
import MyPerformanceTab from "@/components/employee/MyPerformanceTab";
import MyDisciplinaryTab from "@/components/employee/MyDisciplinaryTab";
import MyDocumentsTab from "@/components/employee/MyDocumentsTab";

const SECTIONS = {
  details: {
    title: "My Details",
    description: "Profile and personal information",
    icon: UserCircle,
    component: MyDetailsTab,
  },
  attendance: {
    title: "Clock In / Out",
    description: "Attendance tracking and daily records",
    icon: Clock,
    component: MyAttendanceTab,
  },
  shifts: {
    title: "My Shifts",
    description: "Shift schedules and assignments",
    icon: Calendar,
    component: MyShiftsTab,
  },
  leave: {
    title: "My Leave",
    description: "Leave requests and available balances",
    icon: Umbrella,
    component: MyLeaveTab,
  },
  payslips: {
    title: "My Payslips",
    description: "Pay statements and payroll history",
    icon: Receipt,
    component: MyPayslipsTab,
  },
  performance: {
    title: "My Performance",
    description: "Performance reviews and task history",
    icon: TrendingUp,
    component: MyPerformanceTab,
  },
  disciplinary: {
    title: "Disciplinary",
    description: "Disciplinary records and notices",
    icon: AlertTriangle,
    component: MyDisciplinaryTab,
  },
  documents: {
    title: "My Documents",
    description: "HR documents and uploaded files",
    icon: FileText,
    component: MyDocumentsTab,
  },
} as const;

type SectionKey = keyof typeof SECTIONS;

function NotOnboarded() {
  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardContent className="p-10 text-center space-y-3">
        <UserCircle className="h-12 w-12 text-muted-foreground mx-auto" />
        <p className="font-semibold text-lg">Employee profile not set up</p>
        <p className="text-sm text-muted-foreground">
          Your account is not yet linked to an employee record.
          Contact HR to complete your onboarding before using the Employee Portal.
        </p>
      </CardContent>
    </Card>
  );
}

export default function EmployeePortalPage() {
  const { section } = useParams<{ section?: string }>();
  const { user } = useSession();
  const { employee, loading } = useMyEmployee();

  // Only employees can access this portal
  if (user.activeRole !== "Employee") {
    return <Navigate to="/" replace />;
  }

  // Wait for employee record check before rendering any tab
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading your workspace…
      </div>
    );
  }

  // No employee record linked — block the whole portal cleanly (no 404 spam from tabs)
  if (!employee) {
    return <NotOnboarded />;
  }

  // Render a specific section
  if (section && section in SECTIONS) {
    const cfg = SECTIONS[section as SectionKey];
    const ContentComponent = cfg.component;
    return (
      <div className="space-y-4">
        <div className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <cfg.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{cfg.title}</h2>
              <p className="text-sm text-muted-foreground">{cfg.description}</p>
            </div>
          </div>
        </div>
        <ContentComponent />
      </div>
    );
  }

  // Employee Dashboard (no section or unknown section)
  const firstName = user.name.split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            Welcome back, {firstName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your employee workspace. Everything you need is here.
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
          Active Role: <span className="font-semibold text-foreground">Employee</span>
        </div>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(SECTIONS) as [SectionKey, typeof SECTIONS[SectionKey]][]).map(([key, cfg]) => (
          <Link key={key} to={`/employee-portal/${key}`} className="group">
            <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all">
              <CardContent className="p-5 flex flex-col gap-3 h-full">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <cfg.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {cfg.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {cfg.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
