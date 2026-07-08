import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Briefcase, MapPin, Clock, DollarSign, ArrowLeft, Send, ChevronRight,
  Loader2, Plus, Trash2, Upload, FileText, X, GraduationCap, Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
const pubBase = (slug: string) =>
  `${BASE_URL.replace("/api/v1", "")}/api/v1/public/${slug}/jobs`;

interface PublicJob {
  id: string; jobCode: string; title: string;
  description: string; requirements?: string; responsibilities?: string;
  employmentType: string; location?: string; isRemote: boolean;
  salaryMin?: number; salaryMax?: number; currency?: string;
  closingDate?: string; tags?: string;
  department?: { name: string };
  station?: { name: string };
  _count?: { applications: number };
}

interface EducationEntry {
  level: string;
  institution: string;
  field: string;
  yearGraduated: string;
  grade: string;
}

interface WorkExpEntry {
  jobTitle: string;
  company: string;
  fromDate: string;
  toDate: string;
  isCurrent: boolean;
  description: string;
}

const EDUCATION_LEVELS = [
  "KCPE / Primary Certificate",
  "KCSE / O-Level",
  "Certificate",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD / Doctorate",
  "Professional Certification",
  "Vocational / Technical",
  "Other",
];

const emptyEdu: EducationEntry = { level: "", institution: "", field: "", yearGraduated: "", grade: "" };
const emptyWork: WorkExpEntry = { jobTitle: "", company: "", fromDate: "", toDate: "", isCurrent: false, description: "" };

const STEP_TITLES: Record<number, string> = {
  1: "Personal Details",
  2: "Academic & Professional",
  3: "Work Experience",
  4: "Documents",
};

const fmt = (n?: number | null, cur = "KES") => n != null ? `${cur} ${n.toLocaleString()}` : "";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

export default function CareersPage() {
  const { slug, jobId } = useParams<{ slug?: string; jobId?: string }>();
  const navigate = useNavigate();

  const [jobs,    setJobs]    = useState<PublicJob[]>([]);
  const [job,     setJob]     = useState<PublicJob | null>(null);
  // Only the direct-job-link path needs a spinner on first paint — the listing
  // path stays idle until the visitor clicks "View Open Positions".
  const [loading, setLoading] = useState(!!jobId);
  const [applying, setApplying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  // The listing only fetches once the visitor clicks through — keeps the raw
  // job data (and the public API's existence) out of the very first response
  // a passive crawler/scraper would see.
  const [revealed, setRevealed] = useState(false);

  // ── Form state ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // Step 1: Personal
  const [personal, setPersonal] = useState({
    applicantName: "", applicantEmail: "", applicantPhone: "",
    expectedSalary: "", noticePeriod: "", linkedinUrl: "", portfolioUrl: "",
  });

  // Step 2: Education
  const [education, setEducation] = useState<EducationEntry[]>([{ ...emptyEdu }]);

  // Step 3: Work experience
  const [workExp, setWorkExp] = useState<WorkExpEntry[]>([]);

  // Step 4: Documents
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvFileData, setCvFileData] = useState<string | null>(null);
  const [otherDoc, setOtherDoc] = useState<File | null>(null);
  const [otherDocData, setOtherDocData] = useState<string | null>(null);

  const cvInputRef   = useRef<HTMLInputElement>(null);
  const docInputRef  = useRef<HTMLInputElement>(null);

  // ── Load jobs / single job ────────────────────────────────────────────────────
  // Listing only fires once the visitor reveals it (see `revealed`); a direct
  // link to a specific job (jobId present) always loads immediately — someone
  // followed a link, there's nothing to gate.
  useEffect(() => {
    if (!slug || jobId || !revealed) return;
    setLoading(true);
    fetch(pubBase(slug))
      .then(r => r.json())
      .then(d => setJobs(d.data ?? []))
      .catch(() => toast.error("Failed to load jobs"))
      .finally(() => setLoading(false));
  }, [slug, jobId, revealed]);

  useEffect(() => {
    if (!jobId || !slug) { setJob(null); return; }
    setLoading(true);
    fetch(`${pubBase(slug)}/${jobId}`)
      .then(r => r.json())
      .then(d => setJob(d.data ?? null))
      .catch(() => toast.error("Failed to load job details"))
      .finally(() => setLoading(false));
  }, [jobId, slug]);

  // ── File handlers ──────────────────────────────────────────────────────────────
  const handleCvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("CV file too large. Maximum 5MB.");
    setCvFile(file);
    setCvFileData(await fileToBase64(file));
    e.target.value = "";
  };

  const handleOtherDocFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("File too large. Maximum 5MB.");
    setOtherDoc(file);
    setOtherDocData(await fileToBase64(file));
    e.target.value = "";
  };

  // ── Education helpers ──────────────────────────────────────────────────────────
  const setEdu = (i: number, field: keyof EducationEntry, val: string) =>
    setEducation(arr => arr.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  const addEdu = () => setEducation(arr => [...arr, { ...emptyEdu }]);
  const removeEdu = (i: number) => setEducation(arr => arr.filter((_, idx) => idx !== i));

  // ── Work experience helpers ────────────────────────────────────────────────────
  const setWork = (i: number, field: keyof WorkExpEntry, val: string | boolean) =>
    setWorkExp(arr => arr.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  const addWork = () => setWorkExp(arr => [...arr, { ...emptyWork }]);
  const removeWork = (i: number) => setWorkExp(arr => arr.filter((_, idx) => idx !== i));

  // ── Step navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 1) {
      if (!personal.applicantName.trim()) return toast.error("Full name is required");
      if (!personal.applicantEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.applicantEmail))
        return toast.error("Valid email address is required");
    }
    if (step === 4) return handleSubmit();
    setStep(s => Math.min(s + 1, 4));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!cvFileData || !cvFile) return toast.error("CV/Resume file is required");
    if (!slug || !jobId) return;

    const validEdu = education.filter(e => e.institution.trim());
    const validWork = workExp.filter(w => w.company.trim());

    setApplying(true);
    try {
      const res = await fetch(`${pubBase(slug)}/${jobId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantName:    personal.applicantName.trim(),
          applicantEmail:   personal.applicantEmail.trim(),
          applicantPhone:   personal.applicantPhone || undefined,
          expectedSalary:   personal.expectedSalary ? Number(personal.expectedSalary) : undefined,
          noticePeriod:     personal.noticePeriod || undefined,
          linkedinUrl:      personal.linkedinUrl || undefined,
          portfolioUrl:     personal.portfolioUrl || undefined,
          coverLetter:      coverLetter || undefined,
          education:        validEdu.length ? JSON.stringify(validEdu) : undefined,
          workExperience:   validWork.length ? JSON.stringify(validWork) : undefined,
          resumeFile:       cvFileData,
          cvFileName:       cvFile.name,
          otherDocFile:     otherDocData || undefined,
          otherDocFileName: otherDoc?.name || undefined,
          source:           "Website",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Application failed");
      toast.success(`Application submitted! Reference: ${data.data?.reference ?? ""}`);
      closeForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  const openForm = () => { setStep(1); setShowForm(true); };

  const closeForm = () => {
    setShowForm(false);
    setStep(1);
    setPersonal({ applicantName: "", applicantEmail: "", applicantPhone: "", expectedSalary: "", noticePeriod: "", linkedinUrl: "", portfolioUrl: "" });
    setEducation([{ ...emptyEdu }]);
    setWorkExp([]);
    setCoverLetter("");
    setCvFile(null); setCvFileData(null);
    setOtherDoc(null); setOtherDocData(null);
  };

  // ── Invalid link ───────────────────────────────────────────────────────────────
  if (!slug) {
    return (
      <PageShell>
        <div className="text-center py-20 text-muted-foreground">
          Invalid careers link. Please contact the employer for the correct link.
        </div>
      </PageShell>
    );
  }

  // ── Job detail view ────────────────────────────────────────────────────────────
  if (jobId) {
    if (loading) return <PageShell><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></PageShell>;
    if (!job) return <PageShell><div className="text-center py-20 text-muted-foreground">Job not found or no longer available.</div></PageShell>;

    return (
      <PageShell>
        <button
          onClick={() => navigate(`/careers/${slug}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> All Openings
        </button>

        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <p className="text-muted-foreground text-sm mt-1">{job.jobCode} · {job.department?.name}</p>
              </div>
              <Button size="lg" onClick={openForm} className="shrink-0">
                <Send className="h-4 w-4 mr-2" /> Apply Now
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
              {job.isRemote && <Badge variant="outline">Remote</Badge>}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.employmentType}</span>
              {(job.salaryMin || job.salaryMax) && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {fmt(job.salaryMin, job.currency)}{job.salaryMax ? ` – ${fmt(job.salaryMax, job.currency)}` : ""}
                </span>
              )}
              {job.closingDate && <span>Closes {new Date(job.closingDate).toLocaleDateString()}</span>}
            </div>
          </div>

          {job.description && (
            <Card><CardHeader><CardTitle className="text-base">About the Role</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{job.description}</p></CardContent>
            </Card>
          )}
          {job.responsibilities && (
            <Card><CardHeader><CardTitle className="text-base">Key Responsibilities</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{job.responsibilities}</p></CardContent>
            </Card>
          )}
          {job.requirements && (
            <Card><CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{job.requirements}</p></CardContent>
            </Card>
          )}

          <Button size="lg" className="w-full" onClick={openForm}>
            <Send className="h-4 w-4 mr-2" /> Apply for this Position
          </Button>
        </div>

        {/* ── Application Form Modal ── */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
            <div
              className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "calc(100vh - 24px)" }}
            >
              {/* Header */}
              <div className="border-b px-6 py-4 shrink-0 flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg leading-tight">Apply — {job.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Step {step} of 4 · {STEP_TITLES[step]}
                  </p>
                </div>
                <button
                  onClick={closeForm}
                  className="text-muted-foreground hover:text-foreground w-8 h-8 flex items-center justify-center text-xl leading-none"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex gap-1 px-6 pt-3 shrink-0">
                {[1, 2, 3, 4].map(s => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6">

                {/* ── Step 1: Personal Details ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <SectionHeader icon={<Briefcase className="h-4 w-4" />} title="Personal Details" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Full Name <span className="text-destructive">*</span></Label>
                        <Input
                          value={personal.applicantName}
                          onChange={e => setPersonal(p => ({ ...p, applicantName: e.target.value }))}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email Address <span className="text-destructive">*</span></Label>
                        <Input
                          type="email"
                          value={personal.applicantEmail}
                          onChange={e => setPersonal(p => ({ ...p, applicantEmail: e.target.value }))}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone Number</Label>
                        <Input
                          value={personal.applicantPhone}
                          onChange={e => setPersonal(p => ({ ...p, applicantPhone: e.target.value }))}
                          placeholder="+254 700 000 000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Expected Salary ({job.currency || "KES"})</Label>
                        <Input
                          type="number"
                          value={personal.expectedSalary}
                          onChange={e => setPersonal(p => ({ ...p, expectedSalary: e.target.value }))}
                          placeholder="e.g. 80000"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Notice Period</Label>
                        <Input
                          value={personal.noticePeriod}
                          onChange={e => setPersonal(p => ({ ...p, noticePeriod: e.target.value }))}
                          placeholder="e.g. 1 month, Immediate"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>LinkedIn URL</Label>
                        <Input
                          value={personal.linkedinUrl}
                          onChange={e => setPersonal(p => ({ ...p, linkedinUrl: e.target.value }))}
                          placeholder="https://linkedin.com/in/…"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Portfolio / Website</Label>
                        <Input
                          value={personal.portfolioUrl}
                          onChange={e => setPersonal(p => ({ ...p, portfolioUrl: e.target.value }))}
                          placeholder="https://yourportfolio.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Education ── */}
                {step === 2 && (
                  <div className="space-y-4">
                    <SectionHeader
                      icon={<GraduationCap className="h-4 w-4" />}
                      title="Academic & Professional Qualifications"
                      subtitle="Add your qualifications — most recent first"
                    />

                    {education.map((edu, i) => (
                      <div key={i} className="border rounded-xl p-4 space-y-3 relative bg-muted/20">
                        {education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEdu(i)}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Qualification {i + 1}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Level / Award</Label>
                            <Select value={edu.level} onValueChange={v => setEdu(i, "level", v)}>
                              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                              <SelectContent>
                                {EDUCATION_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Institution / School</Label>
                            <Input
                              value={edu.institution}
                              onChange={e => setEdu(i, "institution", e.target.value)}
                              placeholder="University of Nairobi"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Field of Study / Course</Label>
                            <Input
                              value={edu.field}
                              onChange={e => setEdu(i, "field", e.target.value)}
                              placeholder="Business Administration"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Year Graduated</Label>
                            <Input
                              value={edu.yearGraduated}
                              onChange={e => setEdu(i, "yearGraduated", e.target.value)}
                              placeholder="2022"
                              maxLength={4}
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label>Grade / Result <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input
                              value={edu.grade}
                              onChange={e => setEdu(i, "grade", e.target.value)}
                              placeholder="e.g. 2nd Class Upper, 3.8 GPA, Credit, Distinction"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" className="w-full" onClick={addEdu}>
                      <Plus className="h-4 w-4 mr-2" /> Add Another Qualification
                    </Button>
                  </div>
                )}

                {/* ── Step 3: Work Experience ── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <SectionHeader
                      icon={<Building className="h-4 w-4" />}
                      title="Work Experience"
                      subtitle="List your employment history — most recent first. Leave blank if this is your first role."
                    />

                    {workExp.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-xl">
                        <Building className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No work experience added yet</p>
                        <p className="text-xs mt-1">This section is optional for fresh graduates</p>
                      </div>
                    )}

                    {workExp.map((exp, i) => (
                      <div key={i} className="border rounded-xl p-4 space-y-3 relative bg-muted/20">
                        <button
                          type="button"
                          onClick={() => removeWork(i)}
                          className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Experience {i + 1}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Job Title</Label>
                            <Input
                              value={exp.jobTitle}
                              onChange={e => setWork(i, "jobTitle", e.target.value)}
                              placeholder="Software Engineer"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Company / Organization</Label>
                            <Input
                              value={exp.company}
                              onChange={e => setWork(i, "company", e.target.value)}
                              placeholder="Acme Ltd"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>From</Label>
                            <Input
                              value={exp.fromDate}
                              onChange={e => setWork(i, "fromDate", e.target.value)}
                              placeholder="Jan 2021"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>To</Label>
                            <Input
                              value={exp.isCurrent ? "Present" : exp.toDate}
                              onChange={e => setWork(i, "toDate", e.target.value)}
                              placeholder="Dec 2023"
                              disabled={exp.isCurrent}
                            />
                            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={exp.isCurrent}
                                onChange={e => setWork(i, "isCurrent", e.target.checked)}
                                className="rounded"
                              />
                              Currently working here
                            </label>
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label>Key Responsibilities & Achievements</Label>
                            <Textarea
                              rows={3}
                              value={exp.description}
                              onChange={e => setWork(i, "description", e.target.value)}
                              placeholder="Describe your main responsibilities, achievements, and impact…"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" className="w-full" onClick={addWork}>
                      <Plus className="h-4 w-4 mr-2" /> Add Work Experience
                    </Button>
                  </div>
                )}

                {/* ── Step 4: Documents ── */}
                {step === 4 && (
                  <div className="space-y-6">
                    <SectionHeader
                      icon={<FileText className="h-4 w-4" />}
                      title="Documents"
                      subtitle="Upload your CV and any supporting documents"
                    />

                    {/* CV Upload */}
                    <div className="space-y-2">
                      <Label>
                        CV / Resume <span className="text-destructive">*</span>
                        <span className="text-muted-foreground text-xs ml-1">(PDF or Word · Max 5MB)</span>
                      </Label>
                      <div
                        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
                          ${cvFile ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"}`}
                        onClick={() => cvInputRef.current?.click()}
                      >
                        {cvFile ? (
                          <div className="flex items-center justify-center gap-3">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-sm font-medium truncate">{cvFile.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({(cvFile.size / 1024).toFixed(0)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setCvFile(null); setCvFileData(null); }}
                              className="text-destructive hover:text-destructive/80 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm font-medium">Click to upload your CV / Resume</p>
                            <p className="text-xs text-muted-foreground mt-1">PDF preferred · .pdf, .doc, .docx</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={cvInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleCvFile}
                      />
                    </div>

                    {/* Other Documents */}
                    <div className="space-y-2">
                      <Label>
                        Other Supporting Documents
                        <span className="text-muted-foreground text-xs ml-1">(optional · Max 1 file · Max 5MB)</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Include certificates, transcripts, or references. If you have multiple documents, please compile them into one PDF before uploading.
                      </p>
                      <div
                        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors
                          ${otherDoc ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"}`}
                        onClick={() => docInputRef.current?.click()}
                      >
                        {otherDoc ? (
                          <div className="flex items-center justify-center gap-3">
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                            <span className="text-sm font-medium truncate">{otherDoc.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              ({(otherDoc.size / 1024).toFixed(0)} KB)
                            </span>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setOtherDoc(null); setOtherDocData(null); }}
                              className="text-destructive hover:text-destructive/80 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="h-7 w-7 text-muted-foreground mx-auto mb-1.5" />
                            <p className="text-sm font-medium">Click to upload supporting documents</p>
                            <p className="text-xs text-muted-foreground mt-0.5">.pdf, .doc, .docx</p>
                          </>
                        )}
                      </div>
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={handleOtherDocFile}
                      />
                    </div>

                    {/* Cover Letter */}
                    <div className="space-y-1.5">
                      <Label>
                        Cover Letter
                        <span className="text-muted-foreground text-xs ml-1">(optional)</span>
                      </Label>
                      <Textarea
                        rows={5}
                        value={coverLetter}
                        onChange={e => setCoverLetter(e.target.value)}
                        placeholder="Tell us why you're a great fit for this role and what you'd bring to the team…"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer navigation */}
              <div className="border-t px-6 py-4 shrink-0 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <Button variant="outline" onClick={() => setStep(s => s - 1)}>
                    ← Back
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={closeForm}>Cancel</Button>
                )}

                {step < 4 ? (
                  <Button onClick={handleNext}>
                    Continue →
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={applying || !cvFileData}>
                    {applying
                      ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</>
                      : <><Send className="h-4 w-4 mr-2" />Submit Application</>
                    }
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </PageShell>
    );
  }

  // ── Jobs listing ───────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Career Opportunities</h1>
          <p className="text-muted-foreground mt-1">Join our team — explore open positions below</p>
        </div>

        {!revealed ? (
          <div className="text-center py-16">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <Button size="lg" onClick={() => setRevealed(true)}>View Open Positions</Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No open positions at the moment. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(j => (
              <Card
                key={j.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/careers/${slug}/${j.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-lg leading-tight">{j.title}</h2>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        {j.department && <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.department.name}</span>}
                        {j.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>}
                        {j.isRemote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{j.employmentType}</span>
                        {(j.salaryMin || j.salaryMax) && (
                          <span>{fmt(j.salaryMin, j.currency)}{j.salaryMax ? ` – ${fmt(j.salaryMax, j.currency)}` : ""}</span>
                        )}
                      </div>
                      {j.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{j.description}</p>}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-2 pb-1">
      <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">Careers</span>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-5xl">{children}</main>
    </div>
  );
}
