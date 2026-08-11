import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  BarChart3, BookOpen, ChevronDown, CircleHelp, FileImage, ImagePlus,
  LayoutDashboard, LogOut, Menu, Package, Pencil, Plus, RefreshCw, Save, ShieldCheck,
  Sparkles, Trash2, Upload, Users, X,
} from "lucide-react";
import { API_BASE } from "@/lib/noor-api";

type SessionResponse = { session: string };
type Campaign = {
  id: string; imageUrl: string | null; gifUrl: string | null; videoUrl: string | null;
  title: string; description: string; buttonText: string | null; url: string | null;
  durationSeconds: number; enabled: boolean;
};
type Product = {
  id: string; title: string; description: string; imageUrl: string | null; contactInfo: string;
  productLink: string | null; category: string; status: "pending" | "approved" | "rejected";
  displayOrder: number; createdAt: string;
};
type Analytics = {
  totalUsers: number; totalLessons: number; overallCompletedLessons: number;
  overallProgressPercent: number; averageAccuracy: number;
  levels: { level: number; title: string; totalLessons: number; completedLessons: number; users: number }[];
  lessons: { id: string; level: number; order: number; completedBy: number }[];
  users: { learner: string; currentLevel: number; completedLessons: number; progressPercent: number; avgAccuracy: number; totalRetries: number; timeSpentMs: number; lastSyncedAt: string }[];
};

const json = (token: string | null, path: string, init: RequestInit = {}) =>
  fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  }).then(async (res) => {
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);
    return res.status === 204 ? null : res.json();
  });

const blankCampaign = (): Omit<Campaign, "id"> => ({
  imageUrl: null, gifUrl: null, videoUrl: null, title: "", description: "", buttonText: "Explore",
  url: "", durationSeconds: 6, enabled: false,
});
const blankProduct = (): Omit<Product, "id" | "createdAt"> => ({
  title: "", description: "", imageUrl: null, contactInfo: "", productLink: "",
  category: "other", status: "approved", displayOrder: 0,
});

const MAX_MEDIA_DATA_URL_LENGTH = 1_900_000;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function readMediaFile(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  if (dataUrl.length > MAX_MEDIA_DATA_URL_LENGTH) {
    throw new Error("This file is too large. Choose media under 1.9 MB.");
  }
  return dataUrl;
}

function AdminLogin({ onSession }: { onSession: (session: string) => void }) {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const data = await json(null, "/admin/session", { method: "POST", body: JSON.stringify({ token }) }) as SessionResponse; onSession(data.session); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); }
    finally { setBusy(false); }
  }
  return (
    <main className="admin-shell flex min-h-[100dvh] items-center justify-center px-5 py-10">
      <div className="admin-panel admin-rise w-full max-w-[460px] rounded-[22px] p-7 sm:p-10">
        <div className="mb-10 flex items-start justify-between">
          <div>
            <div className="admin-kicker mb-3">Noor Quran / private workspace</div>
            <h1 className="text-3xl font-semibold tracking-[-.04em]">Admin access</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[hsl(var(--admin-muted))]">A quiet control room for the people caring for Noor’s learning tools and live collections.</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--admin-teal))] text-[hsl(var(--admin-cream))]">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="admin-kicker mb-2 block">Access token</span>
            <input className="admin-field" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Enter the trusted admin token" autoComplete="current-password" autoFocus required />
          </label>
          {error && <div className="rounded-lg border border-[hsl(1_52%_42%)] bg-[hsl(1_45%_20%)] px-3 py-2.5 text-sm text-[hsl(1_80%_76%)]">{error}</div>}
          <button className="admin-button admin-button-primary w-full py-3" disabled={busy}>{busy ? "Checking access…" : "Enter workspace"} <ChevronDown className="h-4 w-4 -rotate-90" /></button>
        </form>
        <div className="mt-8 flex items-center gap-2 border-t pt-5 text-xs text-[hsl(var(--admin-muted))]"><CircleHelp className="h-3.5 w-3.5" /> Session access is held only in this browser tab.</div>
      </div>
    </main>
  );
}

function Metric({ label, value, note, accent = false }: { label: string; value: string | number; note: string; accent?: boolean }) {
  return <div className={`admin-panel rounded-2xl p-5 ${accent ? "bg-[hsl(var(--admin-teal))] text-[hsl(var(--admin-cream))]" : ""}`}>
    <div className={`admin-kicker ${accent ? "text-[hsl(var(--admin-cream)/.64)]" : ""}`}>{label}</div>
    <div className="mt-4 text-3xl font-semibold tracking-[-.05em]">{value}</div>
    <div className={`mt-2 text-xs ${accent ? "text-[hsl(var(--admin-cream)/.72)]" : "text-[hsl(var(--admin-muted))]"}`}>{note}</div>
  </div>;
}

function AnalyticsView({ data, loading, onRefresh }: { data: Analytics | null; loading: boolean; onRefresh: () => void }) {
  const [lessonLevel, setLessonLevel] = useState(1);
  if (loading && !data) return <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-[hsl(var(--admin-line))]" />)}</div>;
  if (!data) return <EmptyState icon={<BarChart3 />} title="Analytics unavailable" text="The learning snapshot could not be loaded." action={onRefresh} />;
  const visibleLessons = data.lessons.filter((lesson) => lesson.level === lessonLevel);
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><div className="admin-kicker mb-2">AI Teacher / pulse</div><h2 className="text-2xl font-semibold tracking-[-.04em]">Learning at a glance</h2><p className="mt-1 text-sm text-[hsl(var(--admin-muted))]">A minimized view of the latest learner snapshots.</p></div>
      <button className="admin-button admin-button-quiet" onClick={onRefresh}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh snapshot</button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Learners" value={data.totalUsers} note="Teacher accounts with a snapshot" accent />
      <Metric label="Average progress" value={`${data.overallProgressPercent}%`} note={`${data.overallCompletedLessons.toLocaleString()} lessons completed`} />
      <Metric label="Average accuracy" value={`${data.averageAccuracy}%`} note="Across scored practice" />
      <Metric label="Lesson library" value={data.totalLessons.toLocaleString()} note="Available lessons across five levels" />
    </div>
    <div className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <section className="admin-panel rounded-2xl p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><div className="admin-kicker mb-1">Curriculum shape</div><h3 className="font-semibold">Progress by level</h3></div><BookOpen className="h-5 w-5 text-[hsl(var(--admin-teal))]" /></div>
        <div className="space-y-5">{data.levels.map((level) => <div key={level.level}><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-medium">{String(level.level).padStart(2, "0")} · {level.title}</span><span className="admin-mono text-xs text-[hsl(var(--admin-muted))]">{level.completedLessons.toLocaleString()} / {level.totalLessons.toLocaleString()}</span></div><div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--admin-teal-soft))]"><div className="h-full rounded-full bg-[hsl(var(--admin-teal))] transition-all duration-500" style={{ width: `${Math.min(100, level.completedLessons / level.totalLessons * 100)}%` }} /></div></div>)}</div>
      </section>
      <section className="admin-panel rounded-2xl p-5 sm:p-6"><div className="mb-6 flex items-center justify-between"><div><div className="admin-kicker mb-1">Learner distribution</div><h3 className="font-semibold">Where people are</h3></div><Users className="h-5 w-5 text-[hsl(var(--admin-copper))]" /></div>
        <div className="space-y-4">{data.levels.map((level) => <div key={level.level} className="flex items-center gap-3"><span className="admin-mono w-5 text-xs text-[hsl(var(--admin-muted))]">L{level.level}</span><div className="h-2 flex-1 rounded-full bg-[hsl(var(--admin-line))]"><div className="h-full rounded-full bg-[hsl(var(--admin-copper))]" style={{ width: `${Math.max(level.users ? 5 : 0, data.totalUsers ? level.users / data.totalUsers * 100 : 0)}%` }} /></div><span className="admin-mono w-8 text-right text-xs">{level.users}</span></div>)}</div>
        <div className="mt-8 border-t pt-4 text-xs leading-5 text-[hsl(var(--admin-muted))]">Level placement reflects the next unfinished milestone in each learner’s saved progress.</div>
      </section>
    </div>
    <section className="admin-panel overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b p-5"><div><div className="admin-kicker mb-1">Learner snapshots</div><h3 className="font-semibold">Every learner</h3></div><span className="admin-mono text-xs text-[hsl(var(--admin-muted))]">{data.users.length} records</span></div>
       <div className="admin-scrollbar overflow-x-auto"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-[hsl(var(--admin-input))] text-xs text-[hsl(var(--admin-muted))]"><tr>{["Learner", "Current level", "Lessons completed", "Progress", "Accuracy", "Retries", "Last synced"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{data.users.map((user) => <tr key={user.learner} className="border-t"><td className="px-5 py-3.5 font-medium">{user.learner}</td><td className="px-5 py-3.5">Level {user.currentLevel}</td><td className="px-5 py-3.5">{user.completedLessons.toLocaleString()}</td><td className="px-5 py-3.5"><span className="admin-mono text-xs">{user.progressPercent}%</span></td><td className="px-5 py-3.5">{user.avgAccuracy ? `${user.avgAccuracy}%` : "—"}</td><td className="px-5 py-3.5">{user.totalRetries}</td><td className="px-5 py-3.5 text-xs text-[hsl(var(--admin-muted))]">{new Date(user.lastSyncedAt).toLocaleDateString()}</td></tr>)}</tbody></table></div>
    </section>
    <section className="admin-panel overflow-hidden rounded-2xl"><div className="flex flex-wrap items-end justify-between gap-4 border-b p-5"><div><div className="admin-kicker mb-1">Lesson completion</div><h3 className="font-semibold">Learners completing each lesson</h3><p className="mt-1 text-xs text-[hsl(var(--admin-muted))]">Select a level to inspect each lesson or Quran passage.</p></div><select className="admin-field w-auto min-w-52" value={lessonLevel} onChange={(event) => setLessonLevel(Number(event.target.value))}>{data.levels.map((level) => <option key={level.level} value={level.level}>Level {level.level} · {level.title}</option>)}</select></div>
       <div className="admin-scrollbar max-h-[520px] overflow-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="sticky top-0 bg-[hsl(var(--admin-input))] text-xs text-[hsl(var(--admin-muted))]"><tr><th className="px-5 py-3 font-medium">Lesson</th><th className="px-5 py-3 font-medium">Learners completed</th><th className="px-5 py-3 font-medium">Share of learners</th></tr></thead><tbody>{visibleLessons.map((lesson) => <tr key={lesson.id} className="border-t"><td className="admin-mono px-5 py-3 text-xs">{lesson.level === 5 ? `Quran passage ${String(lesson.order).padStart(4, "0")}` : `Lesson ${String(lesson.order).padStart(2, "0")}`}</td><td className="px-5 py-3">{lesson.completedBy}</td><td className="px-5 py-3 text-xs text-[hsl(var(--admin-muted))]">{data.totalUsers ? `${Math.round(lesson.completedBy / data.totalUsers * 100)}%` : "0%"}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: () => void }) {
  return <div className="admin-panel flex min-h-64 flex-col items-center justify-center rounded-2xl p-8 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--admin-teal-soft))] text-[hsl(var(--admin-teal))]">{icon}</div><h3 className="font-semibold">{title}</h3><p className="mt-2 max-w-sm text-sm text-[hsl(var(--admin-muted))]">{text}</p><button className="admin-button admin-button-quiet mt-5" onClick={action}><RefreshCw className="h-4 w-4" /> Try again</button></div>;
}

function ImageInput({ value, onChange, label = "Image" }: { value: string | null; onChange: (value: string | null) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try { onChange(await readMediaFile(file)); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to read this file."); }
    finally { setBusy(false); }
  }
  return <div><div className="mb-2 flex items-center justify-between"><span className="admin-kicker">{label}</span>{value && <button type="button" className="text-xs text-[hsl(1_80%_76%)]" onClick={() => onChange(null)}>Remove</button>}</div>
    <div className="flex gap-2">{value ? <div className="relative h-20 w-28 overflow-hidden rounded-lg border bg-[hsl(var(--admin-input))]"><img src={value} alt="" className="h-full w-full object-cover" /><button type="button" className="absolute right-1 top-1 rounded-full bg-[hsl(165_50%_6%/.82)] p-1 text-[hsl(var(--admin-cream))]" onClick={() => onChange(null)}><X className="h-3 w-3" /></button></div> : <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed text-[hsl(var(--admin-muted))]"><FileImage className="h-5 w-5" /></div>}<div className="flex flex-1 flex-col gap-2"><input className="admin-field text-xs" value={value || ""} onChange={(e) => onChange(e.target.value || null)} placeholder="Paste image URL or upload a file" /><label className="admin-button admin-button-quiet w-fit cursor-pointer text-xs"><Upload className="h-3.5 w-3.5" /> {busy ? "Reading file…" : "Choose from Gallery"}<input type="file" accept="image/*" onChange={onFile} className="hidden" /></label>{error && <p className="text-xs text-[hsl(1_80%_76%)]">{error}</p>}</div></div>
  </div>;
}

function MediaInput({
  value,
  onChange,
  label,
  accept,
  kind,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  accept: string;
  kind: "video" | "gif";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (kind === "gif" && file.type !== "image/gif") {
        throw new Error("Choose a GIF file.");
      }
      onChange(await readMediaFile(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to read this file.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="admin-kicker">{label}</span>
        {value && <button type="button" className="text-xs text-[hsl(1_80%_76%)]" onClick={() => onChange(null)}>Remove</button>}
      </div>
      <div className="flex gap-2">
        {value ? (
          <div className="relative h-20 w-28 overflow-hidden rounded-lg border bg-[hsl(var(--admin-input))]">
            {kind === "video" ? <video src={value} muted playsInline className="h-full w-full object-cover" /> : <img src={value} alt="" className="h-full w-full object-cover" />}
            <button type="button" className="absolute right-1 top-1 rounded-full bg-[hsl(165_50%_6%/.82)] p-1 text-[hsl(var(--admin-cream))]" onClick={() => onChange(null)}><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <div className="flex h-20 w-28 items-center justify-center rounded-lg border border-dashed text-[hsl(var(--admin-muted))]">
            {kind === "video" ? <span className="text-xs">Video</span> : <span className="text-xs">GIF</span>}
          </div>
        )}
        <div className="flex flex-1 flex-col gap-2">
          <input className="admin-field text-xs" value={value || ""} onChange={(event) => onChange(event.target.value || null)} placeholder={`Paste ${kind} URL or choose from Gallery`} />
          <label className="admin-button admin-button-quiet w-fit cursor-pointer text-xs">
            <Upload className="h-3.5 w-3.5" /> {busy ? "Reading file…" : "Choose from Gallery"}
            <input type="file" accept={accept} onChange={onFile} className="hidden" />
          </label>
          {error && <p className="text-xs text-[hsl(1_80%_76%)]">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="admin-kicker mb-2 block">{label}</span>{children}</label>; }

function CampaignForm({ initial, onSave, onCancel, saving }: { initial: Campaign | null; onSave: (data: Omit<Campaign, "id">) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState<Omit<Campaign, "id">>(initial ? { ...initial } : blankCampaign());
  const set = (key: keyof typeof form, value: unknown) => setForm((old) => ({ ...old, [key]: value }));
  return <div className="admin-panel rounded-2xl p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><div className="admin-kicker mb-1">{initial ? "Edit campaign" : "New campaign"}</div><h3 className="text-xl font-semibold tracking-[-.03em]">{initial ? "Tune the live message" : "Create a welcome message"}</h3></div><button className="rounded-lg p-2 hover:bg-[hsl(var(--admin-teal-soft))]" onClick={onCancel}><X className="h-4 w-4" /></button></div>
     <div className="grid gap-4 sm:grid-cols-2"><FormField label="Title"><input className="admin-field" value={form.title} onChange={(e) => set("title", e.target.value)} required /></FormField><FormField label="Button label"><input className="admin-field" value={form.buttonText || ""} onChange={(e) => set("buttonText", e.target.value || null)} /></FormField><FormField label="Description"><textarea className="admin-field min-h-24 resize-y sm:col-span-2" value={form.description} onChange={(e) => set("description", e.target.value)} /></FormField><FormField label="Destination URL"><input className="admin-field" value={form.url || ""} onChange={(e) => set("url", e.target.value || null)} placeholder="https://" /></FormField><FormField label="Display duration (seconds)"><input className="admin-field" type="number" min="1" max="120" value={form.durationSeconds} onChange={(e) => set("durationSeconds", Number(e.target.value))} /></FormField><div className="sm:col-span-2"><ImageInput label="Still image" value={form.imageUrl} onChange={(value) => set("imageUrl", value)} /></div><MediaInput label="GIF media" value={form.gifUrl} onChange={(value) => set("gifUrl", value)} accept="image/gif,.gif" kind="gif" /><MediaInput label="Video media" value={form.videoUrl} onChange={(value) => set("videoUrl", value)} accept="video/*" kind="video" /></div>
    <label className="mt-5 flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-[hsl(var(--admin-teal))]" /> Make this campaign eligible for the welcome screen</label>
    <div className="mt-7 flex justify-end gap-2 border-t pt-5"><button className="admin-button admin-button-quiet" onClick={onCancel}>Cancel</button><button className="admin-button admin-button-primary" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save campaign"}</button></div>
  </div>;
}

function ProductForm({ initial, onSave, onCancel, saving }: { initial: Product | null; onSave: (data: Omit<Product, "id" | "createdAt">) => void; onCancel: () => void; saving: boolean }) {
  const [form, setForm] = useState<Omit<Product, "id" | "createdAt">>(initial ? { ...initial } : blankProduct());
  const set = (key: keyof typeof form, value: unknown) => setForm((old) => ({ ...old, [key]: value }));
  return <div className="admin-panel rounded-2xl p-5 sm:p-6"><div className="mb-6 flex items-start justify-between"><div><div className="admin-kicker mb-1">{initial ? "Edit product" : "New product"}</div><h3 className="text-xl font-semibold tracking-[-.03em]">{initial ? "Maintain catalog detail" : "Add a catalog product"}</h3></div><button className="rounded-lg p-2 hover:bg-[hsl(var(--admin-teal-soft))]" onClick={onCancel}><X className="h-4 w-4" /></button></div>
    <div className="grid gap-4 sm:grid-cols-2"><FormField label="Product title"><input className="admin-field" value={form.title} onChange={(e) => set("title", e.target.value)} required /></FormField><FormField label="Category"><select className="admin-field" value={form.category} onChange={(e) => set("category", e.target.value)}>{["tasbeeh", "prayer_mat", "books", "attar", "courses", "other"].map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}</select></FormField><FormField label="Description"><textarea className="admin-field min-h-24 resize-y sm:col-span-2" value={form.description} onChange={(e) => set("description", e.target.value)} /></FormField><FormField label="Contact information"><input className="admin-field" value={form.contactInfo} onChange={(e) => set("contactInfo", e.target.value)} placeholder="Email, phone, or social handle" /></FormField><FormField label="Product link"><input className="admin-field" value={form.productLink || ""} onChange={(e) => set("productLink", e.target.value || null)} placeholder="https://" /></FormField><FormField label="Status"><select className="admin-field" value={form.status} onChange={(e) => set("status", e.target.value)}><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></FormField><FormField label="Display order"><input className="admin-field" type="number" min="0" value={form.displayOrder} onChange={(e) => set("displayOrder", Number(e.target.value))} /></FormField><div className="sm:col-span-2"><ImageInput label="Product image" value={form.imageUrl} onChange={(value) => set("imageUrl", value)} /></div></div>
    <div className="mt-7 flex justify-end gap-2 border-t pt-5"><button className="admin-button admin-button-quiet" onClick={onCancel}>Cancel</button><button className="admin-button admin-button-primary" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save product"}</button></div>
  </div>;
}

function CampaignsView({ token }: { token: string }) {
  const [items, setItems] = useState<Campaign[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState<Campaign | null | false>(false); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setItems(((await json(token, "/admin/campaigns")) as { campaigns: Campaign[] }).campaigns); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load campaigns"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function save(data: Omit<Campaign, "id">) { const isEdit = editing !== false && editing !== null; setSaving(true); try { const res = await json(token, isEdit ? `/admin/campaigns/${(editing as Campaign).id}` : "/admin/campaigns", { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(data) }) as { campaign: Campaign }; setItems((old) => isEdit ? old.map((x) => x.id === res.campaign.id ? res.campaign : x) : [res.campaign, ...old]); setEditing(false); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save campaign"); } finally { setSaving(false); } }
  async function remove(item: Campaign) { if (!window.confirm(`Delete “${item.title}”?`)) return; try { await json(token, `/admin/campaigns/${item.id}`, { method: "DELETE" }); setItems((old) => old.filter((x) => x.id !== item.id)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete campaign"); } }
  if (editing !== false) return <CampaignForm initial={editing} onSave={save} onCancel={() => setEditing(false)} saving={saving} />;
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="admin-kicker mb-2">Welcome Campaign / live content</div><h2 className="text-2xl font-semibold tracking-[-.04em]">Welcome messages</h2><p className="mt-1 text-sm text-[hsl(var(--admin-muted))]">Control what a returning reader sees at the front door.</p></div><div className="flex gap-2"><button className="admin-button admin-button-quiet" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Refresh</button><button className="admin-button admin-button-primary" onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> New campaign</button></div></div>
     {error && <div className="flex items-center justify-between rounded-lg border border-[hsl(1_52%_42%)] bg-[hsl(1_45%_20%)] px-3 py-2.5 text-sm text-[hsl(1_80%_76%)]">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
     {loading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((i) => <div key={i} className="h-52 animate-pulse rounded-2xl bg-[hsl(var(--admin-line))]" />)}</div> : !items.length ? <EmptyState icon={<Sparkles />} title="No campaigns yet" text="Create the first welcome message for the live campaign surface." action={() => setEditing(null)} /> : <div className="grid gap-4 md:grid-cols-2">{items.map((item, index) => <article key={item.id} className="admin-panel admin-rise rounded-2xl p-5" style={{ animationDelay: `${index * 70}ms` }}><div className="flex gap-4">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-24 rounded-xl object-cover" /> : <div className="flex h-20 w-24 items-center justify-center rounded-xl bg-[hsl(var(--admin-teal-soft))] text-[hsl(var(--admin-teal))]"><ImagePlus className="h-5 w-5" /></div>}<div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${item.enabled ? "bg-[hsl(151_58%_48%)]" : "bg-[hsl(165_22%_35%)]"}`} /><span className="admin-kicker">{item.enabled ? "Eligible" : "Paused"}</span></div><h3 className="truncate font-semibold">{item.title}</h3><p className="mt-1 line-clamp-2 text-sm text-[hsl(var(--admin-muted))]">{item.description || "No description added."}</p></div></div><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="admin-mono text-xs text-[hsl(var(--admin-muted))]">{item.durationSeconds}s display</span><div className="flex gap-1"><button className="admin-button admin-button-quiet !p-2" onClick={() => setEditing(item)} aria-label="Edit campaign"><Pencil className="h-4 w-4" /></button><button className="admin-button admin-button-danger !p-2" onClick={() => void remove(item)} aria-label="Delete campaign"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div>}
  </div>;
}

function ProductsView({ token }: { token: string }) {
  const [items, setItems] = useState<Product[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [editing, setEditing] = useState<Product | null | false>(false); const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { setLoading(true); setError(""); try { setItems(((await json(token, "/admin/products")) as { products: Product[] }).products.sort((a, b) => a.displayOrder - b.displayOrder)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to load products"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function save(data: Omit<Product, "id" | "createdAt">) { const isEdit = editing !== false && editing !== null; setSaving(true); try { const res = await json(token, isEdit ? `/admin/products/${(editing as Product).id}` : "/admin/products", { method: isEdit ? "PATCH" : "POST", body: JSON.stringify(data) }) as { product: Product }; setItems((old) => (isEdit ? old.map((x) => x.id === res.product.id ? res.product : x) : [...old, res.product]).sort((a, b) => a.displayOrder - b.displayOrder)); setEditing(false); } catch (e) { setError(e instanceof Error ? e.message : "Unable to save product"); } finally { setSaving(false); } }
  async function remove(item: Product) { if (!window.confirm(`Delete “${item.title}”?`)) return; try { await json(token, `/admin/products/${item.id}`, { method: "DELETE" }); setItems((old) => old.filter((x) => x.id !== item.id)); } catch (e) { setError(e instanceof Error ? e.message : "Unable to delete product"); } }
  if (editing !== false) return <ProductForm initial={editing} onSave={save} onCancel={() => setEditing(false)} saving={saving} />;
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="admin-kicker mb-2">Islamic Products / catalog</div><h2 className="text-2xl font-semibold tracking-[-.04em]">Product catalog</h2><p className="mt-1 text-sm text-[hsl(var(--admin-muted))]">Keep the public marketplace accurate, useful, and in the right order.</p></div><div className="flex gap-2"><button className="admin-button admin-button-quiet" onClick={() => void load()}><RefreshCw className="h-4 w-4" /> Refresh</button><button className="admin-button admin-button-primary" onClick={() => setEditing(null)}><Plus className="h-4 w-4" /> Add product</button></div></div>
     {error && <div className="flex items-center justify-between rounded-lg border border-[hsl(1_52%_42%)] bg-[hsl(1_45%_20%)] px-3 py-2.5 text-sm text-[hsl(1_80%_76%)]">{error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button></div>}
     {loading ? <div className="h-72 animate-pulse rounded-2xl bg-[hsl(var(--admin-line))]" /> : !items.length ? <EmptyState icon={<Package />} title="The catalog is empty" text="Add a product to begin shaping the public collection." action={() => setEditing(null)} /> : <div className="admin-panel overflow-hidden rounded-2xl"><div className="admin-scrollbar overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[hsl(var(--admin-input))] text-xs text-[hsl(var(--admin-muted))]"><tr>{["", "Product", "Category", "Status", "Order", "Added", ""].map((h, i) => <th key={i} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t hover:bg-[hsl(var(--admin-input))]"><td className="w-20 px-5 py-3">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-11 w-14 rounded-lg object-cover" /> : <div className="flex h-11 w-14 items-center justify-center rounded-lg bg-[hsl(var(--admin-teal-soft))] text-[hsl(var(--admin-teal))]"><Package className="h-4 w-4" /></div>}</td><td className="max-w-[260px] px-5 py-3"><div className="truncate font-medium">{item.title}</div><div className="mt-1 truncate text-xs text-[hsl(var(--admin-muted))]">{item.description || "No description"}</div></td><td className="px-5 py-3 capitalize">{item.category.replace("_", " ")}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.status === "approved" ? "bg-[hsl(151_47%_31%)] text-[hsl(151_70%_84%)]" : item.status === "rejected" ? "bg-[hsl(1_45%_20%)] text-[hsl(1_80%_76%)]" : "bg-[hsl(39_50%_24%)] text-[hsl(39_82%_80%)]"}`}>{item.status}</span></td><td className="admin-mono px-5 py-3 text-xs">{item.displayOrder}</td><td className="px-5 py-3 text-xs text-[hsl(var(--admin-muted))]">{new Date(item.createdAt).toLocaleDateString()}</td><td className="px-5 py-3"><div className="flex gap-1"><button className="admin-button admin-button-quiet !p-2" onClick={() => setEditing(item)}><Pencil className="h-4 w-4" /></button><button className="admin-button admin-button-danger !p-2" onClick={() => void remove(item)}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div></div>}
  </div>;
}

function AdminWorkspace({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [active, setActive] = useState<"overview" | "campaigns" | "products">("overview"); const [mobileNav, setMobileNav] = useState(false); const [analytics, setAnalytics] = useState<Analytics | null>(null); const [loading, setLoading] = useState(true);
  const loadAnalytics = useCallback(async () => { setLoading(true); try { setAnalytics(await json(token, "/admin/teacher-analytics") as Analytics); } catch { setAnalytics(null); } finally { setLoading(false); } }, [token]);
  useEffect(() => { if (active === "overview") void loadAnalytics(); }, [active, loadAnalytics]);
  const nav = [{ key: "overview" as const, label: "Overview", sub: "Teacher pulse", icon: LayoutDashboard }, { key: "campaigns" as const, label: "Welcome Campaign", sub: "Live messages", icon: Sparkles }, { key: "products" as const, label: "Products", sub: "Public catalog", icon: Package }];
  return <main className="admin-shell"><div className="mx-auto flex min-h-[100dvh] max-w-[1560px]"><aside className={`fixed inset-y-0 left-0 z-30 w-[278px] border-r bg-[hsl(var(--admin-sidebar)/.96)] p-6 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}><div className="flex items-start justify-between"><div><div className="flex items-center gap-2.5"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[hsl(var(--admin-teal))] text-[hsl(var(--admin-cream))]"><ShieldCheck className="h-5 w-5" /></div><span className="text-lg font-semibold tracking-[-.04em]">Noor / Ops</span></div><div className="admin-kicker mt-3 pl-11">trusted workspace</div></div><button className="rounded-lg p-2 md:hidden" onClick={() => setMobileNav(false)}><X className="h-4 w-4" /></button></div><nav className="mt-12 space-y-2">{nav.map(({ key, label, sub, icon: Icon }) => <button key={key} onClick={() => { setActive(key); setMobileNav(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${active === key ? "bg-[hsl(var(--admin-teal))] text-[hsl(var(--admin-cream))]" : "text-[hsl(var(--admin-ink))] hover:bg-[hsl(var(--admin-teal-soft))]"}`}><Icon className="h-[18px] w-[18px]" /><span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className={`mt-0.5 block text-xs ${active === key ? "text-[hsl(var(--admin-cream)/.65)]" : "text-[hsl(var(--admin-muted))]"}`}>{sub}</span></span>{active === key && <ChevronDown className="h-4 w-4 -rotate-90" />}</button>)}</nav><div className="absolute bottom-6 left-6 right-6 border-t pt-5"><div className="mb-4 flex items-center gap-2 text-xs text-[hsl(var(--admin-muted))]"><span className="h-2 w-2 rounded-full bg-[hsl(151_58%_48%)]" /> API connected</div><button onClick={onLogout} className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--admin-muted))] hover:text-[hsl(var(--admin-ink))]"><LogOut className="h-4 w-4" /> Sign out</button></div></aside><div className="min-w-0 flex-1"><header className="flex h-[78px] items-center justify-between border-b px-5 sm:px-8 lg:px-10"><button className="rounded-lg p-2 md:hidden" onClick={() => setMobileNav(true)}><Menu className="h-5 w-5" /></button><div className="hidden md:block"><span className="admin-kicker">Operations console</span><span className="ml-3 text-xs text-[hsl(var(--admin-muted))]">Private · changes publish to the live app</span></div><div className="flex items-center gap-3"><span className="hidden text-right sm:block"><span className="block text-xs font-semibold">Administrator</span><span className="admin-mono block text-[10px] text-[hsl(var(--admin-muted))]">SESSION ACTIVE</span></span><div className="flex h-9 w-9 items-center justify-center rounded-full border bg-[hsl(var(--admin-teal-soft))] text-xs font-bold text-[hsl(var(--admin-teal))]">NQ</div></div></header><div className="mx-auto max-w-[1240px] p-5 sm:p-8 lg:p-10">{active === "overview" && <AnalyticsView data={analytics} loading={loading} onRefresh={() => void loadAnalytics()} />}{active === "campaigns" && <CampaignsView token={token} />}{active === "products" && <ProductsView token={token} />}</div></div></div>{mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-20 bg-[hsl(165_50%_5%/.5)] md:hidden" onClick={() => setMobileNav(false)} />}</main>;
}

export function Admin() {
  const [session, setSession] = useState<string | null>(() => sessionStorage.getItem("noor-admin-session"));
  function setAndStore(value: string | null) { setSession(value); if (value) sessionStorage.setItem("noor-admin-session", value); else sessionStorage.removeItem("noor-admin-session"); }
  if (!session) return <AdminLogin onSession={setAndStore} />;
  return <AdminWorkspace token={session} onLogout={() => setAndStore(null)} />;
}