"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Briefcase, Plus, Search, RefreshCw, ChevronRight, Bot,
  MessageSquare, Star, ExternalLink, Eye, Users,
  Calendar, MapPin, Clock, CheckCircle, XCircle, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ModalForm } from "@/components/shared/ModalForm";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DangerConfirmModal } from "@/components/shared/DangerConfirmModal";
import { toast } from "sonner";
import {
  hrApi,
  ApiJob, ApiJobApplication, ApiAiScreening, ApiInterviewQuestions,
} from "@/lib/hrApi";
import { usePermissions } from "@/lib/permissions";
import { useSession } from "@/data/sessionStore";
import { useStations } from "@/data/stationsCache";
import { useBranding } from "@/data/brandingStore";
import { CareersApiKeysSection } from "./CareersApiKeysSection";

// ── Constants ─────────────────────────────────────────────────────────────────

const EMP_TYPES = ["FullTime", "PartTime", "Contract", "Internship", "Freelance", "Casual"];

const STAGES: { key: ApiJobApplication["status"]; label: string; color: string }[] = [
  { key: "Applied",     label: "Applied",     color: "bg-slate-100 text-slate-700" },
  { key: "Screening",   label: "Screening",   color: "bg-purple-100 text-purple-700" },
  { key: "Shortlisted", label: "Shortlisted", color: "bg-blue-100 text-blue-700" },
  { key: "Interview",   label: "Interview",   color: "bg-amber-100 text-amber-700" },
  { key: "Offered",     label: "Offered",     color: "bg-green-100 text-green-700" },
  { key: "Rejected",    label: "Rejected",    color: "bg-red-100 text-red-700" },
  { key: "Withdrawn",   label: "Withdrawn",   color: "bg-gray-100 text-gray-600" },
];

const STATUS_COLORS: Record<string, string> = {
  Draft:      "bg-yellow-100 text-yellow-800",
  Published:  "bg-green-100 text-green-800",
  Closed:     "bg-red-100 text-red-800",
  Archived:   "bg-gray-100 text-gray-600",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n?: number | null, cur = "KES") =>
  n != null ? `${cur} ${n.toLocaleString()}` : "";

function parseAiSummary(raw?: string | null): ApiAiScreening | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function parseInterviewQ(raw?: string | null): ApiInterviewQuestions | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

const emptyJob = {
  title: "", departmentId: "", description: "", requirements: "", responsibilities: "",
  salaryMin: "", salaryMax: "", currency: "KES",
  employmentType: "FullTime", location: "", isRemote: false,
  slots: "1", closingDate: "", tags: "", stationId: "",
};

// ── Sub-views ─────────────────────────────────────────────────────────────────

type View = "jobs" | "applications" | "application-detail";

export default function RecruitmentTab() {
  const can = usePermissions();
  const canManage = can("hr.recruitment.manage");
  const { user, activeLocation } = useSession();
  const stations = useStations();
  const branding = useBranding();

  // global admin has no specific station selected
  const isGlobal = activeLocation === "All Locations";
  const accountId = user.accountId || "";
  const accountSlug = branding?.slug || accountId;
  const [showApiEndpoints, setShowApiEndpoints] = useState(false);

  type MainTab = "jobs" | "pipeline" | "screening";
  const [mainTab, setMainTab]         = useState<MainTab>("jobs");
  const [view, setView]               = useState<View>("jobs");
  const [jobs, setJobs]               = useState<ApiJob[]>([]);
  const [applications, setApplications] = useState<ApiJobApplication[]>([]);
  const [selectedJob, setSelectedJob]   = useState<ApiJob | null>(null);
  const [selectedApp, setSelectedApp]   = useState<ApiJobApplication | null>(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [aiWorking, setAiWorking]       = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Pipeline / Screening tab state
  const [allApps, setAllApps]           = useState<ApiJobApplication[]>([]);
  const [allAppsLoading, setAllAppsLoading] = useState(false);
  const [pipelineStage, setPipelineStage]   = useState<string>("Applied");

  // Job modal
  const [jobModal, setJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ApiJob | null>(null);
  const [jobForm, setJobForm] = useState(emptyJob);

  // Filters
  const [statusFilter, setStatusFilter] = useState("_all_");
  const [appStatusFilter, setAppStatusFilter] = useState("_all_");
  const [searchQ, setSearchQ] = useState("");

  // Stage modal
  const [stageModal, setStageModal] = useState(false);
  const [stageForm, setStageForm] = useState({
    status: "" as ApiJobApplication["status"] | "",
    note: "", interviewDate: "", offerSalary: "", rejectionReason: "",
  });

  // Confirm
  const [confirmDlg, setConfirmDlg] = useState<{ title: string; onConfirm: () => void } | null>(null);

  // AI results
  const [aiScreening, setAiScreening] = useState<ApiAiScreening | null>(null);
  const [interviewQs, setInterviewQs] = useState<ApiInterviewQuestions | null>(null);

  // Load all applications (for Pipeline / Screening tabs)
  const loadAllApps = useCallback(async () => {
    setAllAppsLoading(true);
    try {
      const res = await hrApi.recruitment.applications.list({ limit: 500 });
      setAllApps(res.data ?? []);
    } catch { /* non-critical */ }
    finally { setAllAppsLoading(false); }
  }, []);

  // Load jobs
  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hrApi.recruitment.jobs.list({ limit: 100 });
      setJobs(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load jobs"); }
    finally { setLoading(false); }
  }, []);

  // Load applications for a job (or all)
  const loadApplications = useCallback(async (jobId?: string) => {
    setLoading(true);
    try {
      const res = await hrApi.recruitment.applications.list({ jobId, limit: 200 });
      setApplications(res.data ?? []);
    } catch (e: any) { toast.error(e?.message || "Failed to load applications"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Job form ─────────────────────────────────────────────────────────────────

  const openNewJob = () => {
    setEditingJob(null);
    setJobForm(emptyJob);
    setJobModal(true);
  };

  const openEditJob = (job: ApiJob) => {
    setEditingJob(job);
    setJobForm({
      title: job.title, departmentId: job.departmentId || "",
      description: job.description, requirements: job.requirements || "",
      responsibilities: job.responsibilities || "",
      salaryMin: job.salaryMin?.toString() || "", salaryMax: job.salaryMax?.toString() || "",
      currency: job.currency || "KES", employmentType: job.employmentType,
      location: job.location || "", isRemote: job.isRemote,
      slots: job.slots?.toString() || "1",
      closingDate: job.closingDate ? job.closingDate.split("T")[0] : "",
      tags: job.tags || "", stationId: "",
    });
    setJobModal(true);
  };

  const handleSaveJob = async () => {
    if (!jobForm.title.trim()) return toast.error("Job title is required");
    if (!jobForm.description.trim()) return toast.error("Job description is required");
    if (isGlobal && !editingJob && !jobForm.stationId) return toast.error("Please select a station for this job posting");
    setSaving(true);
    try {
      const payload: any = {
        title: jobForm.title, departmentId: jobForm.departmentId || undefined,
        description: jobForm.description,
        requirements: jobForm.requirements || undefined,
        responsibilities: jobForm.responsibilities || undefined,
        salaryMin: jobForm.salaryMin ? parseFloat(jobForm.salaryMin) : undefined,
        salaryMax: jobForm.salaryMax ? parseFloat(jobForm.salaryMax) : undefined,
        currency: jobForm.currency, employmentType: jobForm.employmentType,
        location: jobForm.location || undefined, isRemote: jobForm.isRemote,
        slots: parseInt(jobForm.slots || "1", 10),
        closingDate: jobForm.closingDate || undefined,
        tags: jobForm.tags || undefined,
      };
      if (jobForm.stationId) payload.stationId = jobForm.stationId;
      if (editingJob) {
        await hrApi.recruitment.jobs.update(editingJob.id, payload);
        toast.success("Job updated");
      } else {
        await hrApi.recruitment.jobs.create(payload);
        toast.success("Job created");
      }
      setJobModal(false);
      loadJobs();
    } catch (e: any) { toast.error(e.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleGeneratePost = async () => {
    if (!jobForm.title.trim()) return toast.error("Enter a job title first");
    setAiGenerating(true);
    try {
      const res = await hrApi.recruitment.jobs.generatePost({
        title: jobForm.title,
        employmentType: jobForm.employmentType,
      });
      setJobForm(f => ({
        ...f,
        description: res.data.description || f.description,
        requirements: res.data.requirements || f.requirements,
        responsibilities: res.data.responsibilities || f.responsibilities,
      }));
      toast.success("Job content generated — review and adjust as needed");
    } catch (e: any) { toast.error(e.message || "AI generation failed"); }
    finally { setAiGenerating(false); }
  };

  // ── Job actions ───────────────────────────────────────────────────────────────

  const handlePublish = (job: ApiJob) => {
    setConfirmDlg({
      title: `Publish "${job.title}"? It will be visible to the public.`,
      onConfirm: async () => {
        try { await hrApi.recruitment.jobs.publish(job.id); toast.success("Job published"); loadJobs(); }
        catch (e: any) { toast.error(e.message); }
      },
    });
  };

  const handleClose = (job: ApiJob, archive = false) => {
    setConfirmDlg({
      title: `${archive ? "Archive" : "Close"} "${job.title}"?`,
      onConfirm: async () => {
        try { await hrApi.recruitment.jobs.close(job.id, archive); toast.success(`Job ${archive ? "archived" : "closed"}`); loadJobs(); }
        catch (e: any) { toast.error(e.message); }
      },
    });
  };

  const [pendingDeleteJob, setPendingDeleteJob] = useState<ApiJob | null>(null);
  const [deletingJob, setDeletingJob] = useState(false);

  const handleDeleteJob = (job: ApiJob) => setPendingDeleteJob(job);

  const confirmDeleteJob = async () => {
    if (!pendingDeleteJob) return;
    setDeletingJob(true);
    try {
      await hrApi.recruitment.jobs.remove(pendingDeleteJob.id);
      toast.success("Job deleted");
      setPendingDeleteJob(null);
      loadJobs();
    } catch (e: any) { toast.error(e.message); }
    finally { setDeletingJob(false); }
  };

  const openJobApplications = async (job: ApiJob) => {
    setSelectedJob(job);
    setView("applications");
    await loadApplications(job.id);
  };

  // ── Application detail ────────────────────────────────────────────────────────

  const openAppDetail = async (app: ApiJobApplication) => {
    setLoading(true);
    try {
      const res = await hrApi.recruitment.applications.get(app.id);
      setSelectedApp(res.data);
      setAiScreening(parseAiSummary(res.data.aiSummary));
      setInterviewQs(parseInterviewQ(res.data.aiInterviewQ));
      setView("application-detail");
    } catch (e: any) { toast.error(e?.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  // ── AI features ───────────────────────────────────────────────────────────────

  const handleScreen = async () => {
    if (!selectedApp) return;
    setAiWorking(true);
    try {
      const res = await hrApi.recruitment.applications.screen(selectedApp.id);
      setAiScreening(res.ai);
      setSelectedApp(a => a ? { ...a, aiScore: res.ai.score, aiSummary: JSON.stringify(res.ai), aiScreenedAt: new Date().toISOString() } : a);
      toast.success("AI screening complete");
    } catch (e: any) { toast.error(e.message || "AI screening failed"); }
    finally { setAiWorking(false); }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedApp) return;
    setAiWorking(true);
    try {
      const res = await hrApi.recruitment.applications.questions(selectedApp.id);
      setInterviewQs(res.data);
      toast.success("Interview questions generated");
    } catch (e: any) { toast.error(e.message || "Failed to generate questions"); }
    finally { setAiWorking(false); }
  };

  const handleBatchScreen = async (job: ApiJob) => {
    setAiWorking(true);
    try {
      const res = await hrApi.recruitment.jobs.batchScreen(job.id);
      toast.success(`Screened ${res.screened} applications`);
      loadApplications(job.id);
    } catch (e: any) { toast.error(e.message || "Batch screening failed"); }
    finally { setAiWorking(false); }
  };

  // ── Stage update ──────────────────────────────────────────────────────────────

  const openStageModal = (app: ApiJobApplication) => {
    setSelectedApp(app);
    setStageForm({ status: app.status, note: "", interviewDate: "", offerSalary: "", rejectionReason: "" });
    setStageModal(true);
  };

  const handleStageSubmit = async () => {
    if (!selectedApp || !stageForm.status) return;
    setSaving(true);
    try {
      const updated = await hrApi.recruitment.applications.stage(selectedApp.id, {
        status: stageForm.status as ApiJobApplication["status"],
        note: stageForm.note || undefined,
        interviewDate: stageForm.interviewDate || undefined,
        offerSalary: stageForm.offerSalary ? parseFloat(stageForm.offerSalary) : undefined,
        rejectionReason: stageForm.rejectionReason || undefined,
      });
      setSelectedApp(updated.data);
      toast.success(`Moved to ${stageForm.status}`);
      setStageModal(false);
      if (view === "applications") loadApplications(selectedJob?.id);
    } catch (e: any) { toast.error(e.message || "Failed to update stage"); }
    finally { setSaving(false); }
  };

  // ── Filtered lists ────────────────────────────────────────────────────────────

  const filteredJobs = jobs.filter(j =>
    (statusFilter === "_all_" || j.status === statusFilter) &&
    (!searchQ || j.title.toLowerCase().includes(searchQ.toLowerCase()))
  );

  const filteredApps = applications.filter(a =>
    appStatusFilter === "_all_" || a.status === appStatusFilter
  );

  // ── Shared top-tab nav ────────────────────────────────────────────────────────

  const MainTabNav = () => (
    <div className="flex rounded-lg border overflow-hidden w-fit">
      {(["jobs", "pipeline", "screening"] as MainTab[]).map((t, i) => {
        const labels: Record<MainTab, string> = { jobs: "Jobs", pipeline: "Applications Pipeline", screening: "AI Screening" };
        return (
          <button key={t} onClick={() => {
            setMainTab(t);
            if (t !== "jobs") { setView("jobs"); loadAllApps(); }
          }}
            className={`px-4 py-2 text-sm transition-colors ${mainTab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"} ${i > 0 ? "border-l" : ""}`}>
            {labels[t]}
          </button>
        );
      })}
    </div>
  );

  // ── Pipeline view ─────────────────────────────────────────────────────────────

  if (mainTab === "pipeline") {
    const stageApps = pipelineStage === "_all_" ? allApps : allApps.filter(a => a.status === pipelineStage);
    return (
      <div className="space-y-4">
        <MainTabNav />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold">Applications Pipeline</h3>
            <p className="text-sm text-muted-foreground">{allApps.length} total applications across all jobs</p>
          </div>
          <Button variant="ghost" size="icon" onClick={loadAllApps} disabled={allAppsLoading}>
            <RefreshCw className={`h-4 w-4 ${allAppsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Stage stats */}
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {[{ key: "_all_", label: "All" }, ...STAGES].map(s => {
            const count = s.key === "_all_" ? allApps.length : allApps.filter(a => a.status === s.key).length;
            return (
              <button key={s.key} onClick={() => setPipelineStage(s.key)}
                className={`p-2 rounded-lg border text-center transition-colors ${pipelineStage === s.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>
                <p className="text-xs text-inherit opacity-80 truncate">{s.label}</p>
                <p className="text-lg font-bold">{count}</p>
              </button>
            );
          })}
        </div>

        {allAppsLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading applications…</div>
        ) : stageApps.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No applications in this stage</div>
        ) : (
          <div className="space-y-2">
            {stageApps.map(app => {
              const stage = STAGES.find(s => s.key === app.status);
              return (
                <Card key={app.id} className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => { setSelectedJob(null); openAppDetail(app); setMainTab("jobs"); }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{app.applicantName}</span>
                          <Badge className={`text-xs ${stage?.color || ""}`}>{app.status}</Badge>
                          {app.aiScore != null && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${app.aiScore >= 70 ? "bg-green-100 text-green-700" : app.aiScore >= 45 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              AI: {app.aiScore}/100
                            </span>
                          )}
                          {app.job && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{app.job.title}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {app.applicantEmail} · Applied {app.createdAt?.split("T")[0]}
                          {app.expectedSalary && ` · Exp: KES ${app.expectedSalary.toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {canManage && (
                          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); openStageModal(app); }}>
                            Move Stage
                          </Button>
                        )}
                        <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <ModalForm open={stageModal} onClose={() => setStageModal(false)}
          title={`Update Stage — ${selectedApp?.applicantName}`} onSubmit={handleStageSubmit}
          submitLabel={saving ? "Saving…" : "Update Stage"}>
          <div className="space-y-4">
            <div><Label>Move to Stage</Label>
              <Select value={stageForm.status} onValueChange={v => setStageForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {stageForm.status === "Interview" && <div><Label>Interview Date</Label><Input type="datetime-local" value={stageForm.interviewDate} onChange={e => setStageForm(f => ({ ...f, interviewDate: e.target.value }))} /></div>}
            {stageForm.status === "Offered"   && <div><Label>Offer Salary (KES)</Label><Input type="number" value={stageForm.offerSalary} onChange={e => setStageForm(f => ({ ...f, offerSalary: e.target.value }))} /></div>}
            {stageForm.status === "Rejected"  && <div><Label>Rejection Reason</Label><Input value={stageForm.rejectionReason} onChange={e => setStageForm(f => ({ ...f, rejectionReason: e.target.value }))} /></div>}
            <div><Label>Note</Label><Textarea rows={2} value={stageForm.note} onChange={e => setStageForm(f => ({ ...f, note: e.target.value }))} /></div>
          </div>
        </ModalForm>
      </div>
    );
  }

  // ── AI Screening view ─────────────────────────────────────────────────────────

  if (mainTab === "screening") {
    const screened  = allApps.filter(a => a.aiScore != null).sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));
    const unscreened = allApps.filter(a => a.aiScore == null);

    const handleBatchScreenAll = async () => {
      const publishedJobs = jobs.filter(j => j.status === "Published");
      if (publishedJobs.length === 0) { toast.info("No published jobs to screen"); return; }
      setAiWorking(true);
      try {
        let total = 0;
        for (const job of publishedJobs) {
          const res = await hrApi.recruitment.jobs.batchScreen(job.id);
          total += res.screened;
        }
        toast.success(`Screened ${total} applications across ${publishedJobs.length} jobs`);
        loadAllApps();
      } catch (e: any) { toast.error(e.message || "Batch screening failed"); }
      finally { setAiWorking(false); }
    };

    const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 45 ? "text-amber-600" : "text-red-600";
    const scoreBg    = (s: number) => s >= 70 ? "bg-green-100" : s >= 45 ? "bg-amber-100" : "bg-red-100";

    return (
      <div className="space-y-4">
        <MainTabNav />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-semibold">AI Screening Dashboard</h3>
            <p className="text-sm text-muted-foreground">{screened.length} screened · {unscreened.length} pending screening</p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button onClick={handleBatchScreenAll} disabled={aiWorking} variant="outline">
                <Bot className="h-4 w-4 mr-2" />{aiWorking ? "Screening…" : "Screen All Published Jobs"}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={loadAllApps} disabled={allAppsLoading}>
              <RefreshCw className={`h-4 w-4 ${allAppsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Screened</p><p className="text-2xl font-bold text-green-600">{screened.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-amber-600">{unscreened.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Avg Score</p><p className="text-2xl font-bold">{screened.length > 0 ? Math.round(screened.reduce((s, a) => s + (a.aiScore ?? 0), 0) / screened.length) : "—"}</p></CardContent></Card>
        </div>

        {allAppsLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading…</div>
        ) : screened.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No applications screened yet.</p>
            {canManage && <p className="text-xs mt-1">Run AI Screen on individual applications or click "Screen All Published Jobs".</p>}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Ranked by AI Score (highest first)</p>
            {screened.map((app, idx) => (
              <Card key={app.id} className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => { setSelectedJob(null); openAppDetail(app); setMainTab("jobs"); }}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm w-6 shrink-0">#{idx + 1}</span>
                    <div className={`text-xl font-bold w-12 ${scoreColor(app.aiScore ?? 0)}`}>{app.aiScore}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{app.applicantName}</span>
                        {app.job && <span className="text-xs bg-muted px-2 py-0.5 rounded">{app.job.title}</span>}
                        <Badge className={`text-xs ${STAGES.find(s => s.key === app.status)?.color || ""}`}>{app.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{app.applicantEmail}</p>
                    </div>
                    {app.aiScore != null && (
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                        <div className={`h-full rounded-full ${scoreBg(app.aiScore)}`} style={{ width: `${app.aiScore}%` }} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Breadcrumb nav ────────────────────────────────────────────────────────────

  const Breadcrumbs = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <button className="hover:text-foreground" onClick={() => { setView("jobs"); loadJobs(); }}>Jobs</button>
      {(view === "applications" || view === "application-detail") && selectedJob && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <button className="hover:text-foreground" onClick={() => { setView("applications"); loadApplications(selectedJob.id); }}>
            {selectedJob.title}
          </button>
        </>
      )}
      {view === "application-detail" && selectedApp && (
        <>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground">{selectedApp.applicantName}</span>
        </>
      )}
    </div>
  );

  // ── Jobs view ─────────────────────────────────────────────────────────────────

  if (view === "jobs") {
    const stats = {
      total: jobs.length,
      published: jobs.filter(j => j.status === "Published").length,
      draft: jobs.filter(j => j.status === "Draft").length,
      total_apps: jobs.reduce((sum, j) => sum + (j._count?.applications || 0), 0),
    };

    return (
      <div className="space-y-4">
        <MainTabNav />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Recruitment</h3>
            <p className="text-sm text-muted-foreground">Manage job postings and applications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadJobs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {canManage && <Button onClick={openNewJob}><Plus className="h-4 w-4 mr-2" /> Post Job</Button>}
          </div>
        </div>

        {/* Public careers portal banner */}
        {accountId && (() => {
          const careersUrl = `${window.location.origin}/careers/${accountSlug}`;
          const apiBase    = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace("/api/v1", "") + `/api/v1/public/${accountSlug}/jobs`;
          return (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Public Careers Portal</p>
                  <p className="text-xs text-muted-foreground">Share this link on your website or social media so candidates can view and apply for open positions.</p>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <code className="text-xs bg-background border px-2 py-1 rounded select-all">{careersUrl}</code>
                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { navigator.clipboard.writeText(careersUrl); toast.success("Copied!"); }}>Copy</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => window.open(careersUrl, "_blank")}>
                      <ExternalLink className="h-3 w-3 mr-1" />Open
                    </Button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-primary/10">
                  <Button size="sm" variant="ghost" className="h-6 text-xs px-2 -ml-2" onClick={() => setShowApiEndpoints(v => !v)}>
                    {showApiEndpoints ? "Hide" : "Show"} public API endpoints
                  </Button>
                  {showApiEndpoints && (
                    <div className="space-y-1 text-xs text-muted-foreground mt-1.5">
                      <p><code className="bg-background border px-1 rounded">GET {apiBase}</code> — list published jobs</p>
                      <p><code className="bg-background border px-1 rounded">GET {apiBase}/:id</code> — job details</p>
                      <p><code className="bg-background border px-1 rounded">POST {apiBase}/:id/apply</code> — submit application</p>
                      <p className="text-[10px]">No authentication required · CORS enabled for all origins — this is the same data the /careers page fetches.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {canManage && <CareersApiKeysSection />}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Jobs",   value: stats.total },
            { label: "Published",    value: stats.published,  cls: "text-green-600" },
            { label: "Drafts",       value: stats.draft,      cls: "text-yellow-600" },
            { label: "Applications", value: stats.total_apps, cls: "text-blue-600" },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold ${s.cls || ""}`}>{loading ? "…" : s.value}</p>
            </CardContent></Card>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input className="pl-8" placeholder="Search jobs..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all_">All Statuses</SelectItem>
              {["Draft", "Published", "Closed", "Archived"].map(s =>
                <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading jobs…</div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No jobs found</div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map(job => (
              <Card key={job.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-base">{job.title}</h4>
                        <Badge className={`text-xs ${STATUS_COLORS[job.status] || ""}`}>{job.status}</Badge>
                        <span className="text-xs text-muted-foreground">{job.jobCode}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                        {job.department && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{job.department.name}</span>}
                        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        {job.isRemote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.employmentType}</span>
                        {(job.salaryMin || job.salaryMax) && (
                          <span>{fmt(job.salaryMin, job.currency)} {job.salaryMax ? `– ${fmt(job.salaryMax, job.currency)}` : ""}</span>
                        )}
                        {job.closingDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Closes {job.closingDate.split("T")[0]}</span>}
                      </div>
                      <div className="mt-2 text-sm line-clamp-2 text-muted-foreground">{job.description}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => openJobApplications(job)}
                        className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        <Users className="h-4 w-4" />
                        {job._count?.applications || 0} applicant{(job._count?.applications || 0) !== 1 ? "s" : ""}
                      </button>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {job.status === "Published" && accountId && (
                          <Button variant="ghost" size="sm" title="Copy public application link"
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/careers/${accountSlug}/${job.id}`); toast.success("Link copied"); }}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openJobApplications(job)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        {canManage && job.status === "Draft" && (
                          <Button variant="ghost" size="sm" onClick={() => openEditJob(job)}>Edit</Button>
                        )}
                        {canManage && job.status === "Draft" && (
                          <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handlePublish(job)}>Publish</Button>
                        )}
                        {canManage && job.status === "Published" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleBatchScreen(job)} disabled={aiWorking}>
                              <Bot className="h-3.5 w-3.5 mr-1" />{aiWorking ? "Screening…" : "AI Screen All"}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleClose(job)}>Close</Button>
                          </>
                        )}
                        {canManage && job.status === "Closed" && (
                          <>
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handlePublish(job)}>Reopen</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleClose(job, true)}>Archive</Button>
                          </>
                        )}
                        {canManage && job.status === "Draft" && (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteJob(job)}>Delete</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Job form modal */}
        <ModalForm
          open={jobModal}
          onClose={() => setJobModal(false)}
          title={editingJob ? "Edit Job" : "Post New Job"}
          onSubmit={handleSaveJob}
          submitLabel={saving ? "Saving..." : editingJob ? "Update" : "Create Job"}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Station picker — only shown for global admins creating a new job */}
              {isGlobal && !editingJob && (
                <div className="col-span-2">
                  <Label>Station *</Label>
                  <Select value={jobForm.stationId} onValueChange={v => setJobForm(f => ({ ...f, stationId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select which station this job is for" /></SelectTrigger>
                    <SelectContent>
                      {stations.filter(s => s.status === "Active").map(s =>
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label>Job Title *</Label>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                    onClick={handleGeneratePost} disabled={aiGenerating || !jobForm.title.trim()}>
                    <Wand2 className="h-3 w-3" />
                    {aiGenerating ? "Generating…" : "Generate with AI"}
                  </Button>
                </div>
                <Input value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Fuel Attendant" />
              </div>
              <div><Label>Employment Type</Label>
                <Select value={jobForm.employmentType} onValueChange={v => setJobForm(f => ({ ...f, employmentType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMP_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Slots</Label>
                <Input type="number" min="1" value={jobForm.slots} onChange={e => setJobForm(f => ({ ...f, slots: e.target.value }))} />
              </div>
              <div><Label>Location</Label>
                <Input value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Nairobi, Westlands" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={jobForm.isRemote} onCheckedChange={v => setJobForm(f => ({ ...f, isRemote: v }))} />
                <Label>Remote / Hybrid</Label>
              </div>
              <div><Label>Min Salary (KES)</Label>
                <Input type="number" value={jobForm.salaryMin} onChange={e => setJobForm(f => ({ ...f, salaryMin: e.target.value }))} placeholder="e.g. 30000" />
              </div>
              <div><Label>Max Salary (KES)</Label>
                <Input type="number" value={jobForm.salaryMax} onChange={e => setJobForm(f => ({ ...f, salaryMax: e.target.value }))} placeholder="e.g. 50000" />
              </div>
              <div><Label>Closing Date</Label>
                <Input type="date" value={jobForm.closingDate} onChange={e => setJobForm(f => ({ ...f, closingDate: e.target.value }))} />
              </div>
              <div><Label>Tags (comma-separated)</Label>
                <Input value={jobForm.tags} onChange={e => setJobForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. urgent, management" />
              </div>
            </div>
            <div><Label>Job Description *</Label>
              <Textarea rows={4} value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role..." />
            </div>
            <div><Label>Requirements</Label>
              <Textarea rows={3} value={jobForm.requirements} onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))} placeholder="Qualifications and skills required..." />
            </div>
            <div><Label>Responsibilities</Label>
              <Textarea rows={3} value={jobForm.responsibilities} onChange={e => setJobForm(f => ({ ...f, responsibilities: e.target.value }))} placeholder="Key responsibilities..." />
            </div>
          </div>
        </ModalForm>

        <ConfirmDialog
          open={!!confirmDlg} title={confirmDlg?.title ?? ""} confirmLabel="Confirm"
          onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
          onCancel={() => setConfirmDlg(null)}
        />

        <DangerConfirmModal
          open={!!pendingDeleteJob}
          title={`Delete "${pendingDeleteJob?.title}"?`}
          description="This job posting cannot be recovered once deleted."
          confirmLabel="Delete"
          loading={deletingJob}
          onConfirm={confirmDeleteJob}
          onCancel={() => setPendingDeleteJob(null)}
        />
      </div>
    );
  }

  // ── Applications Kanban view ───────────────────────────────────────────────

  if (view === "applications") {
    return (
      <div className="space-y-4">
        <MainTabNav />
        <Breadcrumbs />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{selectedJob?.title}</h3>
            <p className="text-sm text-muted-foreground">{selectedJob?.jobCode} · {filteredApps.length} applicant{filteredApps.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex gap-2">
            {canManage && (
              <Button variant="outline" onClick={() => selectedJob && handleBatchScreen(selectedJob)} disabled={aiWorking} size="sm">
                <Bot className="h-4 w-4 mr-1.5" />{aiWorking ? "Screening…" : "AI Screen All"}
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => loadApplications(selectedJob?.id)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            variant={appStatusFilter === "_all_" ? "default" : "outline"} size="sm"
            onClick={() => setAppStatusFilter("_all_")}
          >All ({applications.length})</Button>
          {STAGES.map(s => {
            const count = applications.filter(a => a.status === s.key).length;
            return (
              <Button
                key={s.key}
                variant={appStatusFilter === s.key ? "default" : "outline"}
                size="sm"
                onClick={() => setAppStatusFilter(s.key)}
              >{s.label} ({count})</Button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading applications…</div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No applications yet</div>
        ) : (
          <div className="space-y-2">
            {filteredApps.map(app => {
              const stage = STAGES.find(s => s.key === app.status);
              const aiScore = app.aiScore;
              return (
                <Card key={app.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openAppDetail(app)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{app.applicantName}</span>
                          <Badge className={`text-xs ${stage?.color || ""}`}>{app.status}</Badge>
                          {aiScore != null && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${aiScore >= 70 ? "bg-green-100 text-green-700" : aiScore >= 45 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                              <Star className="h-2.5 w-2.5 inline mr-0.5" />{aiScore}/100
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {app.applicantEmail}
                          {app.noticePeriod && <span className="ml-2">· Notice: {app.noticePeriod}</span>}
                          {app.expectedSalary && <span className="ml-2">· Expected: {fmt(app.expectedSalary)}</span>}
                          <span className="ml-2">· Applied {app.createdAt?.split("T")[0]}</span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {canManage && (
                          <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); openStageModal(app); }}>
                            Move Stage
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stage update modal */}
        <ModalForm
          open={stageModal}
          onClose={() => setStageModal(false)}
          title={`Update Stage — ${selectedApp?.applicantName}`}
          onSubmit={handleStageSubmit}
          submitLabel={saving ? "Saving..." : "Update Stage"}
        >
          <div className="space-y-4">
            <div><Label>Move to Stage *</Label>
              <Select value={stageForm.status} onValueChange={v => setStageForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {stageForm.status === "Interview" && (
              <div><Label>Interview Date</Label>
                <Input type="datetime-local" value={stageForm.interviewDate} onChange={e => setStageForm(f => ({ ...f, interviewDate: e.target.value }))} />
              </div>
            )}
            {stageForm.status === "Offered" && (
              <div><Label>Offer Salary (KES)</Label>
                <Input type="number" value={stageForm.offerSalary} onChange={e => setStageForm(f => ({ ...f, offerSalary: e.target.value }))} />
              </div>
            )}
            {stageForm.status === "Rejected" && (
              <div><Label>Rejection Reason</Label>
                <Input value={stageForm.rejectionReason} onChange={e => setStageForm(f => ({ ...f, rejectionReason: e.target.value }))} placeholder="Brief reason" />
              </div>
            )}
            <div><Label>Note (optional)</Label>
              <Textarea rows={2} value={stageForm.note} onChange={e => setStageForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
        </ModalForm>

        <ConfirmDialog
          open={!!confirmDlg} title={confirmDlg?.title ?? ""} confirmLabel="Confirm"
          onConfirm={() => { confirmDlg?.onConfirm(); setConfirmDlg(null); }}
          onCancel={() => setConfirmDlg(null)}
        />
      </div>
    );
  }

  // ── Application detail view ────────────────────────────────────────────────

  if (view === "application-detail" && selectedApp) {
    const stage = STAGES.find(s => s.key === selectedApp.status);

    return (
      <div className="space-y-4">
        <MainTabNav />
        <Breadcrumbs />

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{selectedApp.applicantName}</h3>
              <Badge className={`text-xs ${stage?.color || ""}`}>{selectedApp.status}</Badge>
              {selectedApp.aiScore != null && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${selectedApp.aiScore >= 70 ? "bg-green-100 text-green-700" : selectedApp.aiScore >= 45 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                  AI Score: {selectedApp.aiScore}/100
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {selectedApp.applicantEmail} · {selectedApp.applicantPhone || "No phone"}
            </div>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openStageModal(selectedApp)}>Move Stage</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Candidate info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Candidate Details</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {selectedApp.expectedSalary && <div><span className="text-muted-foreground">Expected Salary:</span> {fmt(selectedApp.expectedSalary)}</div>}
              {selectedApp.noticePeriod && <div><span className="text-muted-foreground">Notice Period:</span> {selectedApp.noticePeriod}</div>}
              {selectedApp.source && <div><span className="text-muted-foreground">Source:</span> {selectedApp.source}</div>}
              {selectedApp.linkedinUrl && (
                <div><span className="text-muted-foreground">LinkedIn:</span>{" "}
                  <a href={selectedApp.linkedinUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 inline-flex">
                    <ExternalLink className="h-3 w-3" /> Profile
                  </a>
                </div>
              )}
              {selectedApp.portfolioUrl && (
                <div><span className="text-muted-foreground">Portfolio:</span>{" "}
                  <a href={selectedApp.portfolioUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 inline-flex">
                    <ExternalLink className="h-3 w-3" /> View
                  </a>
                </div>
              )}
              <div><span className="text-muted-foreground">Applied:</span> {selectedApp.createdAt?.split("T")[0]}</div>
              {selectedApp.interviewDate && <div><span className="text-muted-foreground">Interview:</span> {new Date(selectedApp.interviewDate).toLocaleString()}</div>}
              {selectedApp.offerSalary && <div><span className="text-muted-foreground">Offer:</span> {fmt(selectedApp.offerSalary)}</div>}
              {selectedApp.rejectionReason && <div><span className="text-muted-foreground">Rejection reason:</span> {selectedApp.rejectionReason}</div>}
            </CardContent>
          </Card>

          {/* Stage history */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Stage History</CardTitle></CardHeader>
            <CardContent>
              {(!selectedApp.stages || selectedApp.stages.length === 0) ? (
                <p className="text-sm text-muted-foreground">No stage changes yet</p>
              ) : (
                <ol className="space-y-2">
                  {selectedApp.stages.map(log => (
                    <li key={log.id} className="flex items-start gap-2 text-sm">
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <span className="font-medium">{log.fromStage}</span>
                        <span className="text-muted-foreground mx-1">→</span>
                        <span className="font-medium">{log.toStage}</span>
                        <span className="text-muted-foreground text-xs ml-2">{log.changedAt?.split("T")[0]}</span>
                        {log.note && <p className="text-muted-foreground text-xs">{log.note}</p>}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Cover letter */}
          {selectedApp.coverLetter && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Cover Letter</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{selectedApp.coverLetter}</p>
              </CardContent>
            </Card>
          )}

          {/* CV / Resume text */}
          {selectedApp.resumeText && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center justify-between">
                CV / Resume
              </CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-3 rounded max-h-64 overflow-y-auto">{selectedApp.resumeText}</pre>
              </CardContent>
            </Card>
          )}

          {/* AI Screening */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Bot className="h-4 w-4 text-purple-600" /> AI Screening</span>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={handleScreen} disabled={aiWorking}>
                    {aiWorking ? "Analysing…" : selectedApp.aiScreenedAt ? "Re-screen" : "Run AI Screen"}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiScreening ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl font-bold ${aiScreening.score >= 70 ? "text-green-600" : aiScreening.score >= 45 ? "text-amber-600" : "text-red-600"}`}>
                      {aiScreening.score}<span className="text-base font-normal text-muted-foreground">/100</span>
                    </div>
                    <Badge className={`text-xs ${aiScreening.recommendation === "Shortlist" || aiScreening.recommendation === "Interview" ? "bg-green-100 text-green-700" : aiScreening.recommendation === "Hold" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {aiScreening.recommendation}
                    </Badge>
                    {selectedApp.aiScreenedAt && <span className="text-xs text-muted-foreground">Screened {selectedApp.aiScreenedAt.split("T")[0]}</span>}
                  </div>
                  <p className="text-sm">{aiScreening.summary}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {aiScreening.strengths?.length > 0 && (
                      <div><p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
                        <ul className="space-y-0.5">{aiScreening.strengths.map((s, i) => <li key={i} className="text-xs flex items-start gap-1"><CheckCircle className="h-3 w-3 text-green-600 shrink-0 mt-0.5" />{s}</li>)}</ul>
                      </div>
                    )}
                    {aiScreening.gaps?.length > 0 && (
                      <div><p className="text-xs font-medium text-amber-700 mb-1">Gaps</p>
                        <ul className="space-y-0.5">{aiScreening.gaps.map((g, i) => <li key={i} className="text-xs text-amber-700">· {g}</li>)}</ul>
                      </div>
                    )}
                    {aiScreening.redFlags?.length > 0 && (
                      <div><p className="text-xs font-medium text-red-700 mb-1">Red Flags</p>
                        <ul className="space-y-0.5">{aiScreening.redFlags.map((f, i) => <li key={i} className="text-xs flex items-start gap-1"><XCircle className="h-3 w-3 text-red-600 shrink-0 mt-0.5" />{f}</li>)}</ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No AI screening done yet. {canManage ? "Click \"Run AI Screen\" to analyse this application." : ""}</p>
              )}
            </CardContent>
          </Card>

          {/* Interview questions */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-blue-600" /> Interview Questions</span>
                {canManage && (
                  <Button variant="outline" size="sm" onClick={handleGenerateQuestions} disabled={aiWorking}>
                    {aiWorking ? "Generating…" : interviewQs ? "Regenerate" : "Generate with AI"}
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interviewQs ? (
                <ol className="space-y-3">
                  {interviewQs.questions.map((q, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs text-muted-foreground mt-0.5 w-5 shrink-0">{i + 1}.</span>
                        <div>
                          <Badge variant="outline" className="text-xs mb-1">{q.type}</Badge>
                          <p className="font-medium">{q.question}</p>
                          {q.probe && <p className="text-muted-foreground text-xs mt-0.5 italic">{q.probe}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No interview questions generated yet. {canManage ? "Click \"Generate with AI\" for tailored questions." : ""}</p>
              )}
            </CardContent>
          </Card>

          {/* Internal notes */}
          {canManage && (
            <InternalNotesEditor
              app={selectedApp}
              onChange={updated => setSelectedApp(updated)}
            />
          )}
        </div>

        {/* Stage update modal */}
        <ModalForm
          open={stageModal}
          onClose={() => setStageModal(false)}
          title={`Update Stage — ${selectedApp.applicantName}`}
          onSubmit={handleStageSubmit}
          submitLabel={saving ? "Saving..." : "Update Stage"}
        >
          <div className="space-y-4">
            <div><Label>Move to Stage *</Label>
              <Select value={stageForm.status} onValueChange={v => setStageForm(f => ({ ...f, status: v as any }))}>
                <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {stageForm.status === "Interview" && (
              <div><Label>Interview Date</Label>
                <Input type="datetime-local" value={stageForm.interviewDate} onChange={e => setStageForm(f => ({ ...f, interviewDate: e.target.value }))} />
              </div>
            )}
            {stageForm.status === "Offered" && (
              <div><Label>Offer Salary (KES)</Label>
                <Input type="number" value={stageForm.offerSalary} onChange={e => setStageForm(f => ({ ...f, offerSalary: e.target.value }))} />
              </div>
            )}
            {stageForm.status === "Rejected" && (
              <div><Label>Rejection Reason</Label>
                <Input value={stageForm.rejectionReason} onChange={e => setStageForm(f => ({ ...f, rejectionReason: e.target.value }))} />
              </div>
            )}
            <div><Label>Note</Label>
              <Textarea rows={2} value={stageForm.note} onChange={e => setStageForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </div>
        </ModalForm>
      </div>
    );
  }

  return null;
}

// ── Internal notes sub-component ──────────────────────────────────────────────

function InternalNotesEditor({ app, onChange }: { app: ApiJobApplication; onChange: (a: ApiJobApplication) => void }) {
  const [notes, setNotes] = useState(app.internalNotes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await hrApi.recruitment.applications.notes(app.id, { internalNotes: notes });
      onChange(res.data);
      toast.success("Notes saved");
    } catch (e: any) { toast.error(e.message || "Failed to save notes"); }
    finally { setSaving(false); }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader className="pb-2"><CardTitle className="text-sm">Internal Notes</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Private notes (not visible to candidate)..." />
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save Notes"}</Button>
      </CardContent>
    </Card>
  );
}
