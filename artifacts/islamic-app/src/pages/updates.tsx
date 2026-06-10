import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, RefreshCw, Play, ExternalLink, Sparkles,
  Clock, Tag, ImageOff, Wifi, X, Eye, EyeOff, Plus,
  Pencil, Trash2, Shield, Save, ChevronDown, Copy,
  CheckCircle, AlertCircle, Loader2, Settings2,
} from "lucide-react";
import {
  UpdateItem, LocalAdminItem, OverrideEntry,
  resolveImageUrl, fetchUpdates, adminData,
  generateId, mergeItems, scriptSync, APPS_SCRIPT_TEMPLATE,
} from "@/lib/updates-data";

// ── TanStack Query ─────────────────────────────────────────────────────────────
function useSheetUpdates() {
  return useQuery({
    queryKey: ["updates"],
    queryFn: fetchUpdates,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: 3 * 60_000,
    retry: 2,
  });
}

// ── Category styles ────────────────────────────────────────────────────────────
function categoryStyle(cat: string) {
  const c = cat?.toLowerCase() ?? "";
  if (c.includes("quran"))   return { bg: "rgba(52,211,153,0.12)",  text: "text-emerald-300", border: "border-emerald-700/40" };
  if (c.includes("prayer"))  return { bg: "rgba(96,165,250,0.12)",  text: "text-blue-300",    border: "border-blue-700/40"   };
  if (c.includes("event"))   return { bg: "rgba(168,85,247,0.12)",  text: "text-purple-300",  border: "border-purple-700/40" };
  if (c.includes("feature")) return { bg: "rgba(234,179,8,0.12)",   text: "text-yellow-300",  border: "border-yellow-700/40" };
  if (c.includes("update"))  return { bg: "rgba(249,115,22,0.12)",  text: "text-orange-300",  border: "border-orange-700/40" };
  return                            { bg: "rgba(45,212,191,0.10)",   text: "text-teal-300",    border: "border-teal-800/40"   };
}

function formatDate(str: string): string {
  if (!str) return "";
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  } catch { return str; }
}

// ── Image with fallback ────────────────────────────────────────────────────────
function CardImage({ url, title, hasVideo }: { url: string; title: string; hasVideo: boolean }) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const resolved = resolveImageUrl(url);

  // Re-check when URL changes
  useEffect(() => { setStatus("loading"); }, [resolved]);

  return status === "error" ? (
    <div className="w-full flex flex-col items-center justify-center gap-2 border-b border-emerald-900/30"
      style={{ aspectRatio: "16/8", background: "rgba(52,211,153,0.04)" }}>
      <ImageOff className="w-8 h-8 text-emerald-900" />
      <span className="text-emerald-900 text-xs">Image unavailable</span>
    </div>
  ) : (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/8" }}>
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse" style={{ background: "rgba(52,211,153,0.06)" }} />
      )}
      <img
        src={resolved}
        alt={title}
        className="w-full h-full object-cover"
        style={{ opacity: status === "ok" ? 1 : 0, transition: "opacity 0.3s" }}
        onLoad={() => {
          console.log(`[Noor/Updates] Image loaded ✓ url="${resolved}"`);
          setStatus("ok");
        }}
        onError={() => {
          console.error(
            `[Noor/Updates] Image FAILED — original="${url}" resolved="${resolved}"\n` +
            `  → Make sure the Drive file is shared as "Anyone with the link can view"`
          );
          setStatus("error");
        }}
        loading="lazy"
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, rgba(6,22,16,0.9) 100%)" }} />
      {hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Update Card ────────────────────────────────────────────────────────────────
function UpdateCard({ item, index, onTitleTap }: {
  item: UpdateItem;
  index: number;
  onTitleTap: () => void;
}) {
  const cat      = categoryStyle(item.category);
  const hasVideo = !!item.video_url?.trim();
  const hasLink  = !!item.target_link?.trim();
  const hasImage = !!item.image_url?.trim();
  const watchLabel = item.button_text?.trim() || "Watch";
  const openLabel  = hasVideo ? "Details" : (item.button_text?.trim() || "Open");

  function openUrl(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-emerald-900/40 transition-all duration-300 hover:border-emerald-700/40 active:scale-[0.99]"
      style={{
        background: "rgba(255,255,255,0.03)",
        animationDelay: `${index * 60}ms`,
        animation: "fadeSlideUp 0.4s ease both",
      }}
      data-testid={`update-card-${item.id || index}`}
    >
      {hasImage && item.category && (
        <div className="relative">
          <CardImage url={item.image_url} title={item.title} hasVideo={hasVideo} />
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.text} ${cat.border}`}
            style={{ background: "rgba(6,22,16,0.7)", backdropFilter: "blur(4px)" }}
          >
            {item.category}
          </span>
        </div>
      )}
      {hasImage && !item.category && (
        <CardImage url={item.image_url} title={item.title} hasVideo={hasVideo} />
      )}

      <div className="p-4 space-y-2.5">
        {!hasImage && (
          <div className="flex items-center gap-2 flex-wrap">
            {item.category && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cat.text} ${cat.border}`}
                style={{ background: cat.bg }}>
                <Tag className="w-2.5 h-2.5 inline mr-1" />{item.category}
              </span>
            )}
            {item.created_at && (
              <span className="text-emerald-800 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />{formatDate(item.created_at)}
              </span>
            )}
          </div>
        )}

        {hasImage && item.created_at && (
          <span className="text-emerald-800 text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDate(item.created_at)}
          </span>
        )}

        {/* Title — tap 20× to trigger secret admin access */}
        <h3
          className="text-white font-bold text-base leading-snug select-none cursor-default"
          onPointerDown={onTitleTap}
        >
          {item.title}
        </h3>

        {item.description && (
          <p className="text-emerald-600 text-sm leading-relaxed line-clamp-3">{item.description}</p>
        )}

        {(hasVideo || hasLink) && (
          <div className="flex gap-2 pt-1">
            {hasVideo && (
              <button onClick={() => openUrl(item.video_url)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-emerald-200 transition-all active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}
                data-testid={`button-watch-${item.id}`}>
                <Play className="w-3.5 h-3.5" />{watchLabel}
              </button>
            )}
            {hasLink && (
              <button onClick={() => openUrl(item.target_link)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${hasVideo ? "text-emerald-400 border border-emerald-800/50" : "text-emerald-200"}`}
                style={hasVideo ? { background: "rgba(52,211,153,0.06)" } : { background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}
                data-testid={`button-open-${item.id}`}>
                <ExternalLink className="w-3.5 h-3.5" />{openLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Admin: Login Modal ─────────────────────────────────────────────────────────
const ADMIN_CODE = "2963@531";

function AdminLoginModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [show, setShow]   = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  function submit() {
    if (code === ADMIN_CODE) {
      onSuccess();
    } else {
      setError("Incorrect access code.");
      setShake(true);
      setCode("");
      setTimeout(() => setShake(false), 600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div
        className={`w-full max-w-sm rounded-3xl p-7 border border-emerald-800/40 ${shake ? "animate-bounce" : ""}`}
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0d2314 100%)" }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 font-bold text-lg">Admin Access</span>
          </div>
          <button onClick={onClose} className="text-emerald-700 hover:text-emerald-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type={show ? "text" : "password"}
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Enter access code"
              className="w-full px-4 py-3 pr-12 rounded-xl text-white text-base border border-emerald-800/50 outline-none focus:border-emerald-600 transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", letterSpacing: show ? "normal" : "4px" }}
              autoComplete="off"
            />
            <button onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 hover:text-emerald-400 transition-colors">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button onClick={submit}
            className="w-full py-3 rounded-xl font-bold text-white text-base transition-all active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}>
            Verify
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Admin: Item Form Modal ─────────────────────────────────────────────────────
const EMPTY_ITEM: Omit<UpdateItem, "id"> = {
  title: "", description: "", image_url: "", video_url: "",
  button_text: "", target_link: "", category: "", status: "active", created_at: "",
};

const CATEGORIES = ["Quran", "Prayer", "Event", "Feature", "Update", "General"];
const STATUS_OPTIONS = ["active", "inactive"];

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-white text-sm border border-emerald-900/40 outline-none focus:border-emerald-600 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-emerald-500 text-xs font-semibold uppercase tracking-wider">{label}</label>
      <div style={{ background: "rgba(255,255,255,0.03)" }} className="rounded-xl">
        {children}
      </div>
    </div>
  );
}

function AdminFormModal({ item, mode, onSave, onClose }: {
  item: UpdateItem | null;
  mode: "create" | "edit";
  onSave: (data: Omit<UpdateItem, "id">) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<UpdateItem, "id">>(
    item ? { ...item } : { ...EMPTY_ITEM }
  );
  const [imgPreview, setImgPreview] = useState(false);
  const resolved = resolveImageUrl(form.image_url);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSave() {
    if (!form.title.trim()) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 100%)" }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-emerald-900/40">
        <h2 className="text-emerald-300 font-bold text-lg">
          {mode === "create" ? "Create Item" : "Edit Item"}
        </h2>
        <button onClick={onClose} className="text-emerald-700 hover:text-emerald-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <Field label="Title *">
          <input value={form.title} onChange={(e) => set("title", e.target.value)}
            placeholder="Item title" className={inputCls} />
        </Field>

        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Short description..." rows={3}
            className={inputCls + " resize-none"} />
        </Field>

        <Field label="Image URL (Google Drive or direct)">
          <input value={form.image_url} onChange={(e) => { set("image_url", e.target.value); setImgPreview(false); }}
            placeholder="https://drive.google.com/file/d/.../view" className={inputCls} />
          {form.image_url && (
            <button onClick={() => setImgPreview((v) => !v)}
              className="mt-1.5 ml-1 flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-400">
              <Eye className="w-3 h-3" />
              {imgPreview ? "Hide preview" : "Preview image"}
            </button>
          )}
          {imgPreview && form.image_url && (
            <img src={resolved} alt="preview"
              className="mt-2 w-full rounded-xl object-cover border border-emerald-900/40"
              style={{ maxHeight: 160 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          )}
          {form.image_url && (
            <p className="mt-1 ml-1 text-emerald-900 text-[10px] break-all">
              Resolved: {resolveImageUrl(form.image_url)}
            </p>
          )}
        </Field>

        <Field label="Video URL">
          <input value={form.video_url} onChange={(e) => set("video_url", e.target.value)}
            placeholder="https://youtube.com/..." className={inputCls} />
        </Field>

        <Field label="Target Link">
          <input value={form.target_link} onChange={(e) => set("target_link", e.target.value)}
            placeholder="https://..." className={inputCls} />
        </Field>

        <Field label="Button Text">
          <input value={form.button_text} onChange={(e) => set("button_text", e.target.value)}
            placeholder="e.g. Watch, Read, Learn" className={inputCls} />
        </Field>

        <Field label="Category">
          <div className="relative">
            <select value={CATEGORIES.includes(form.category) ? form.category : "__custom"}
              onChange={(e) => { if (e.target.value !== "__custom") set("category", e.target.value); }}
              className={inputCls + " appearance-none pr-8"}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              {!CATEGORIES.includes(form.category) && <option value="__custom">{form.category || "Custom…"}</option>}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-700 pointer-events-none" />
          </div>
          <input value={form.category} onChange={(e) => set("category", e.target.value)}
            placeholder="Or type custom category" className={inputCls + " mt-2"} />
        </Field>

        <Field label="Status">
          <div className="flex gap-3 p-1">
            {STATUS_OPTIONS.map((s) => (
              <button key={s} onClick={() => set("status", s)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  form.status === s
                    ? "bg-emerald-700 text-white border-emerald-600"
                    : "text-emerald-600 border-emerald-900/40 hover:border-emerald-700"
                }`}
                style={form.status !== s ? { background: "rgba(255,255,255,0.03)" } : {}}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Date (optional)">
          <input value={form.created_at} onChange={(e) => set("created_at", e.target.value)}
            placeholder="e.g. 2025-01-15" className={inputCls} />
        </Field>
      </div>

      <div className="px-5 py-4 border-t border-emerald-900/40">
        <button onClick={handleSave}
          disabled={!form.title.trim()}
          className="w-full py-3.5 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}>
          <Save className="w-4 h-4" />
          {mode === "create" ? "Create Item" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Admin: Sheet Sync Panel ────────────────────────────────────────────────────
// The Apps Script URL is pre-configured in the app — no setup needed.
// This panel lets the user view the active URL or override it with a new one.
function SheetSyncPanel() {
  const [show,    setShow]    = useState(false);
  const [editing, setEditing] = useState(false);
  const [url,     setUrl]     = useState(() => adminData.loadScriptUrl());
  const [saved,   setSaved]   = useState(false);
  const [copied,  setCopied]  = useState(false);

  const activeUrl = adminData.loadScriptUrl();

  function saveUrl() {
    if (!url.trim()) return;
    adminData.saveScriptUrl(url);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  function copyScript() {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  }

  return (
    <div className="mx-5 mb-4 rounded-2xl border border-emerald-900/40 overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}>

      {/* Header — always shows Connected since URL is pre-configured */}
      <button onClick={() => setShow(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-emerald-600" />
          <span className="text-emerald-500 text-sm font-semibold">Google Sheet Sync</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold text-green-400 border-green-800/50 bg-green-900/20">
            ✓ Connected
          </span>
          {saved && (
            <span className="text-[10px] text-emerald-400 font-semibold animate-in fade-in">
              URL updated
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform ${show ? "rotate-180" : ""}`} />
      </button>

      {show && (
        <div className="border-t border-emerald-900/30 px-4 pt-4 pb-5 space-y-4">

          {/* Active URL */}
          <div className="space-y-1.5">
            <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
              Active Apps Script URL
            </p>
            <div className="rounded-xl p-3 border border-green-900/30 flex items-start gap-2"
              style={{ background: "rgba(52,211,153,0.04)" }}>
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-emerald-700 text-[10px] font-mono break-all leading-relaxed">
                {activeUrl}
              </p>
            </div>
            <p className="text-emerald-800 text-[10px]">
              Every Create / Edit / Delete writes directly to your Google Sheet.
            </p>
          </div>

          {/* Sheet columns reference */}
          <div className="rounded-xl p-3 border border-emerald-900/30"
            style={{ background: "rgba(0,0,0,0.15)" }}>
            <p className="text-emerald-600 text-[10px] font-bold mb-1.5 uppercase tracking-wider">
              Sheet columns (Row 1 headers)
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {(["A=id","B=title","C=description","D=image_url","E=video_url",
                 "F=button_text","G=target_link","H=category","I=status","J=created_at"] as const
              ).map((col) => {
                const [letter, field] = col.split("=");
                return (
                  <div key={col} className="flex items-center gap-1.5">
                    <span className="text-emerald-900 font-mono text-[10px] w-4">{letter}</span>
                    <span className="text-emerald-700 text-[10px] font-mono">{field}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Override URL (advanced) */}
          <div className="space-y-2">
            <button onClick={() => setEditing(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-emerald-700 hover:text-emerald-500 transition-colors">
              <Settings2 className="w-3 h-3" />
              {editing ? "Cancel" : "Use a different Apps Script URL"}
            </button>

            {editing && (
              <>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/…/exec"
                  className={inputCls}
                  autoFocus
                />
                <button
                  onClick={saveUrl}
                  disabled={!url.trim()}
                  className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}>
                  <Save className="w-3.5 h-3.5" /> Save New URL
                </button>

                {/* Copy script option for re-deployment */}
                <div className="rounded-xl border border-emerald-900/40 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-emerald-800 text-[10px] font-mono">noor-quran-sheet-api.gs</span>
                    <button onClick={copyScript}
                      className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      style={{ color: copied ? "#4ade80" : "#34d399" }}>
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy script"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sync status badge ──────────────────────────────────────────────────────────
type SyncStatus = "idle" | "syncing" | "ok" | "fail";

function SyncBadge({ status, error }: { status: SyncStatus; error?: string }) {
  if (status === "idle") return null;
  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
      status === "syncing" ? "text-amber-400 border-amber-800/40 bg-amber-900/10" :
      status === "ok"      ? "text-green-400 border-green-800/40 bg-green-900/10" :
                             "text-red-400 border-red-800/40 bg-red-900/10"
    }`}>
      {status === "syncing" && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === "ok"      && <CheckCircle className="w-3 h-3" />}
      {status === "fail"    && <AlertCircle className="w-3 h-3" />}
      {status === "syncing" ? "Syncing to Sheet…" :
       status === "ok"      ? "Sheet updated" :
       `Sheet sync failed${error ? `: ${error}` : ""}`}
    </div>
  );
}

// ── Admin: Panel ───────────────────────────────────────────────────────────────
function AdminPanel({ sheetItems, onClose }: {
  sheetItems: UpdateItem[];
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const [localItems,  setLocal]     = useState<LocalAdminItem[]>(() => adminData.loadLocal());
  const [deletedIds,  setDeleted]   = useState<string[]>(() => adminData.loadDeleted());
  const [overrides,   setOverrides] = useState<OverrideEntry[]>(() => adminData.loadOverrides());

  const [formState, setFormState] = useState<{
    open: boolean; mode: "create" | "edit"; item: UpdateItem | null;
  }>({ open: false, mode: "create", item: null });

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError,  setSyncError]  = useState<string | undefined>(undefined);

  // ── Persist local state + update TanStack cache immediately ─────────────────
  function persistLocal(l: LocalAdminItem[], d: string[], o: OverrideEntry[]) {
    adminData.saveLocal(l);
    adminData.saveDeleted(d);
    adminData.saveOverrides(o);
    setLocal(l); setDeleted(d); setOverrides(o);
    // Optimistically update the TanStack cache so the UI reflects changes at once
    const current = qc.getQueryData<UpdateItem[]>(["updates"]) ?? sheetItems;
    qc.setQueryData(["updates"], mergeItems(current, l, d, o));
  }

  // ── After a successful write: fetch fresh Sheet data and refresh cache ───────
  async function refreshFromSheet(
    opts: {
      clearLocalId?: string;    // remove local placeholder (create confirmed)
      clearDeletedId?: string;  // remove from deletedIds (delete confirmed)
      clearOverrideId?: string; // remove override (edit confirmed)
    } = {}
  ) {
    // Since scriptSync uses no-cors (write always goes through), we can
    // immediately commit the optimistic cleanup — the Sheet already has the data.
    let nextLocal     = adminData.loadLocal();
    let nextDeleted   = adminData.loadDeleted();
    let nextOverrides = adminData.loadOverrides();

    if (opts.clearLocalId) {
      // Remove the local placeholder — Sheet now has this row with the same ID.
      // mergeItems deduplicates by ID, so GViz re-fetch won't create duplicates.
      nextLocal = nextLocal.filter((it) => it.id !== opts.clearLocalId);
      adminData.saveLocal(nextLocal);
      setLocal(nextLocal);
      console.log("[Noor/Admin] ✓ Local placeholder cleared:", opts.clearLocalId);
    }
    if (opts.clearDeletedId) {
      // Remove from deletedIds — Sheet row is gone, GViz won't return it again.
      nextDeleted = nextDeleted.filter((id) => id !== opts.clearDeletedId);
      adminData.saveDeleted(nextDeleted);
      setDeleted(nextDeleted);
      console.log("[Noor/Admin] ✓ Deleted ID cleared:", opts.clearDeletedId);
    }
    if (opts.clearOverrideId) {
      // Remove override — Sheet row already has the updated values.
      nextOverrides = nextOverrides.filter((o) => o.id !== opts.clearOverrideId);
      adminData.saveOverrides(nextOverrides);
      setOverrides(nextOverrides);
      console.log("[Noor/Admin] ✓ Override cleared:", opts.clearOverrideId);
    }

    // Invalidate TanStack query so GViz re-fetches fresh Sheet data in background.
    // GViz may take up to ~5 min to reflect changes (cache), but optimistic UI
    // already shows the correct state via localItems/deletedIds/overrides.
    qc.invalidateQueries({ queryKey: ["updates"] });
    console.log("[Noor/Admin] ✓ GViz query invalidated — background re-fetch triggered");
  }

  // ── Main sync: write to Sheet, then refresh ──────────────────────────────────
  async function doSync(
    action: "create" | "edit" | "delete",
    payload: { item?: Partial<UpdateItem>; id?: string },
    refreshOpts: Parameters<typeof refreshFromSheet>[0] = {}
  ) {
    setSyncStatus("syncing");
    setSyncError(undefined);

    const result = await scriptSync(action, payload);

    if (result.ok) {
      setSyncStatus("ok");
      await refreshFromSheet(refreshOpts);
      setTimeout(() => setSyncStatus("idle"), 3000);
    } else {
      setSyncStatus("fail");
      setSyncError(result.error);
      console.error("[Noor/Admin] Sync failed:", result.error);
    }
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  async function handleSave(data: Omit<UpdateItem, "id">) {
    if (formState.mode === "create") {
      const tempId = generateId();
      const newItem: LocalAdminItem = {
        ...data, id: tempId, _local: true, _ts: Date.now(),
      };
      // Optimistic: add to local list immediately
      persistLocal([newItem, ...localItems], deletedIds, overrides);
      setFormState({ open: false, mode: "create", item: null });
      // Write to Sheet — include tempId so the Sheet row gets the same ID.
      // When GViz eventually re-fetches, mergeItems will deduplicate by ID.
      await doSync(
        "create",
        { item: { ...data, id: tempId } },
        { clearLocalId: tempId },
      );
    } else if (formState.item) {
      const id = formState.item.id;
      const isLocal = localItems.some((it) => it.id === id);
      if (isLocal) {
        const updated = localItems.map((it) => it.id === id ? { ...it, ...data } : it);
        persistLocal(updated, deletedIds, overrides);
      } else {
        // Optimistic override for Sheet items
        const newOvr = overrides.filter((o) => o.id !== id).concat({ id, data });
        persistLocal(localItems, deletedIds, newOvr);
      }
      setFormState({ open: false, mode: "create", item: null });
      // Write edit to Sheet, then clear the override (Sheet is now authoritative)
      await doSync(
        "edit",
        { id, item: { ...data } },
        { clearOverrideId: id },
      );
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    const isLocal = localItems.some((it) => it.id === id);
    if (isLocal) {
      persistLocal(localItems.filter((it) => it.id !== id), deletedIds, overrides);
    } else {
      // Optimistic: mark deleted immediately
      persistLocal(localItems, [...deletedIds, id], overrides);
    }
    setConfirmDelete(null);
    // Write delete to Sheet, then remove from deletedIds (row is gone)
    await doSync(
      "delete",
      { id },
      { clearDeletedId: id },
    );
  }

  // allItems reflects the merged state (optimistic + Sheet)
  const currentSheet = qc.getQueryData<UpdateItem[]>(["updates"]) ?? sheetItems;
  const allItems = mergeItems(currentSheet, localItems, deletedIds, overrides);

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-emerald-900/40">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h1 className="text-emerald-300 font-bold text-xl">Admin Panel</h1>
          <span className="text-emerald-800 text-xs border border-emerald-900/40 rounded-full px-2 py-0.5">
            {allItems.length} items
          </span>
        </div>
        <button onClick={onClose} className="text-emerald-700 hover:text-emerald-400 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sheet Sync Setup */}
      <div className="pt-3">
        <SheetSyncPanel />
      </div>

      {/* Sync status */}
      {syncStatus !== "idle" && (
        <div className="px-5 pb-2">
          <SyncBadge status={syncStatus} error={syncError} />
        </div>
      )}

      {/* Create button */}
      <div className="px-5 pb-3">
        <button onClick={() => setFormState({ open: true, mode: "create", item: null })}
          className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 border border-emerald-700/50 transition-all active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #1a5c38 0%, #16a34a 100%)" }}>
          <Plus className="w-4 h-4" /> Create New Item
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {allItems.length === 0 && (
          <div className="text-center py-16 text-emerald-800 text-sm">No items yet. Create one above.</div>
        )}
        {allItems.map((item) => {
          const isLocal      = localItems.some((l) => l.id === item.id);
          const isOverridden = overrides.some((o) => o.id === item.id);
          return (
            <div key={item.id}
              className="rounded-2xl p-4 border border-emerald-900/40 space-y-2"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isLocal
                        ? "text-emerald-300 border-emerald-700/50 bg-emerald-900/30"
                        : "text-amber-400 border-amber-800/50 bg-amber-900/20"
                    }`}>
                      {isLocal ? "📱 Local" : isOverridden ? "📊 Sheet (edited)" : "📊 Sheet"}
                    </span>
                    {item.category && (
                      <span className="text-[10px] text-emerald-700 border border-emerald-900/40 px-1.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      item.status?.toLowerCase() === "active"
                        ? "text-green-400 border-green-900/40"
                        : "text-red-400 border-red-900/40"
                    }`}>
                      {item.status || "active"}
                    </span>
                  </div>
                  <p className="text-white font-semibold text-sm leading-snug truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-emerald-700 text-xs mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.image_url && (
                    <p className="text-emerald-900 text-[10px] mt-1 truncate">🖼 {item.image_url}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => setFormState({ open: true, mode: "edit", item })}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-emerald-800/40 text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 transition-all"
                    style={{ background: "rgba(52,211,153,0.06)" }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(item.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-red-900/30 text-red-700 hover:text-red-400 hover:border-red-700 transition-all"
                    style={{ background: "rgba(239,68,68,0.06)" }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-xs rounded-3xl p-6 border border-red-900/40"
            style={{ background: "linear-gradient(150deg, #1a0707 0%, #0f0a0a 100%)" }}>
            <p className="text-white font-bold text-base mb-2">Delete Item?</p>
            <p className="text-red-400 text-sm mb-5">
              {localItems.some((l) => l.id === confirmDelete)
                ? "This will permanently remove the local item."
                : "This will hide the Sheet item from the app (and delete from Sheet if sync is set up)."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-emerald-400 border border-emerald-900/40 text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.04)" }}>Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #7f1d1d, #ef4444)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {formState.open && (
        <AdminFormModal
          item={formState.item}
          mode={formState.mode}
          onSave={handleSave}
          onClose={() => setFormState({ open: false, mode: "create", item: null })}
        />
      )}
    </div>
  );
}

// ── Main: Updates page ─────────────────────────────────────────────────────────
export function Updates() {
  const { data: sheetItems = [], isLoading, isError, isFetching, refetch, dataUpdatedAt } = useSheetUpdates();

  // adminRefresh increments when admin panel closes → forces re-read from localStorage
  const [adminRefresh, setAdminRefresh] = useState(0);

  // Re-read from localStorage whenever adminRefresh changes (i.e. after admin panel closes)
  const localItems = useMemo(() => adminData.loadLocal(),     [adminRefresh]);
  const deletedIds = useMemo(() => adminData.loadDeleted(),   [adminRefresh]);
  const overrides  = useMemo(() => adminData.loadOverrides(), [adminRefresh]);

  const merged = useMemo(
    () => mergeItems(sheetItems, localItems, deletedIds, overrides),
    [sheetItems, localItems, deletedIds, overrides],
  );

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(merged.map((i) => i.category).filter(Boolean)))],
    [merged],
  );
  const [activeCategory, setActiveCategory] = useState("All");
  const filtered = activeCategory === "All" ? merged : merged.filter((i) => i.category === activeCategory);

  // Pull-to-refresh
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef    = useRef(0);
  const [pullY, setPullY]         = useState(0);
  const [isPulling, setIsPulling] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 0) === 0) startYRef.current = e.touches[0].clientY;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if ((containerRef.current?.scrollTop ?? 1) > 0) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy > 0) { setPullY(Math.min(dy * 0.45, 64)); setIsPulling(true); }
  }, []);
  const onTouchEnd = useCallback(async () => {
    if (pullY >= 48) refetch();
    setPullY(0); setIsPulling(false);
  }, [pullY, refetch]);

  // ── 20-tap secret admin access ─────────────────────────────────────────────
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [adminState, setAdminState] = useState<"hidden" | "login" | "panel">("hidden");

  const onTitleTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 4000);
    if (tapCountRef.current >= 20) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      setAdminState("login");
    }
  }, []);

  // Suppress unused variable warning
  void isPulling;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <>
      <div
        ref={containerRef}
        className="min-h-screen pb-28 md:pb-10 overflow-y-auto"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div className="flex items-center justify-center overflow-hidden transition-all duration-300"
          style={{ height: pullY > 0 ? `${pullY}px` : 0 }}>
          <RefreshCw className="w-5 h-5 text-emerald-400"
            style={{ transform: `rotate(${(pullY / 64) * 180}deg)` }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors"
            data-testid="link-back-more">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold text-emerald-300">Updates</h1>
            {lastUpdated && !isLoading && (
              <p className="text-emerald-800 text-xs mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Refreshed at {lastUpdated}
              </p>
            )}
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-800/40 text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 transition-all"
            style={{ background: "rgba(52,211,153,0.06)" }}
            data-testid="button-refresh-updates">
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Fetching bar */}
        {isFetching && !isLoading && (
          <div className="h-0.5 mx-4 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, #34d399, transparent)", backgroundSize: "200% 100%", animation: "shimmer 1.2s ease-in-out infinite" }} />
          </div>
        )}

        <div className="px-4 space-y-4 animate-in fade-in duration-400">
          {/* Category pills */}
          {!isLoading && categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    activeCategory === cat
                      ? "bg-emerald-700 text-white border-emerald-600"
                      : "text-emerald-600 border-emerald-900/50 hover:border-emerald-700"
                  }`}
                  style={activeCategory === cat ? {} : { background: "rgba(255,255,255,0.04)" }}>
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-emerald-900/40"
                  style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="w-full h-44 animate-pulse" style={{ background: "rgba(52,211,153,0.06)" }} />
                  <div className="p-4 space-y-3">
                    <div className="h-3 w-20 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.08)" }} />
                    <div className="h-5 w-4/5 rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.06)" }} />
                    <div className="h-3 w-full rounded-full animate-pulse" style={{ background: "rgba(52,211,153,0.05)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <div className="rounded-2xl p-8 text-center border border-red-900/30"
              style={{ background: "rgba(239,68,68,0.05)" }}>
              <Wifi className="w-10 h-10 text-red-700 mx-auto mb-3" />
              <p className="text-red-400 font-semibold text-sm">Could not load updates</p>
              <p className="text-red-800 text-xs mt-1 mb-4">Check your internet connection</p>
              <button onClick={() => refetch()}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-red-300 border border-red-800/50"
                style={{ background: "rgba(239,68,68,0.08)" }}>
                Try Again
              </button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5"
                style={{ background: "rgba(52,211,153,0.08)" }}>
                <Sparkles className="w-9 h-9 text-emerald-700" />
              </div>
              <p className="text-emerald-500 font-semibold text-base">No updates available</p>
              <p className="text-emerald-800 text-sm mt-1">Check back soon for news and features</p>
            </div>
          )}

          {/* Cards */}
          {!isLoading && !isError && filtered.map((item, i) => (
            <UpdateCard key={item.id || i} item={item} index={i} onTitleTap={onTitleTap} />
          ))}

          {!isLoading && !isError && filtered.length > 0 && (
            <p className="text-emerald-900 text-xs text-center pb-4">
              {filtered.length} update{filtered.length !== 1 ? "s" : ""} · Refreshes automatically
            </p>
          )}
        </div>
      </div>

      {/* Admin overlays — hidden from normal users */}
      {adminState === "login" && (
        <AdminLoginModal
          onSuccess={() => setAdminState("panel")}
          onClose={() => setAdminState("hidden")}
        />
      )}
      {adminState === "panel" && (
        <AdminPanel
          sheetItems={sheetItems}
          onClose={() => {
            // Re-read localStorage so the main list reflects any admin changes immediately
            setAdminRefresh((r) => r + 1);
            setAdminState("hidden");
          }}
        />
      )}
    </>
  );
}
