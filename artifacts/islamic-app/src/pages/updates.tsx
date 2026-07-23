import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, RefreshCw, Play, ExternalLink, Sparkles,
  Clock, Tag, ImageOff, Wifi, X, Eye, EyeOff, Plus,
  Pencil, Trash2, Shield, Save, ChevronDown, Copy,
  CheckCircle, AlertCircle, Loader2, Settings2, ImagePlus,
} from "lucide-react";
import {
  UpdateItem, LocalAdminItem, OverrideEntry,
  resolveImageUrl, fetchUpdates, adminData,
  generateId, mergeItems, scriptSync, APPS_SCRIPT_TEMPLATE,
} from "@/lib/updates-data";
import { openUrl as openExternalUrl } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";

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
  if (c.includes("quran"))   return { bg: "bg-primary/15", text: "text-foreground", border: "border-border" };
  if (c.includes("prayer"))  return { bg: "bg-primary/15", text: "text-foreground", border: "border-border" };
  if (c.includes("event"))   return { bg: "bg-primary/15", text: "text-foreground", border: "border-border" };
  if (c.includes("feature")) return { bg: "bg-primary/15", text: "text-foreground", border: "border-border" };
  if (c.includes("update"))  return { bg: "bg-primary/15", text: "text-foreground", border: "border-border" };
  return                            { bg: "bg-muted", text: "text-foreground", border: "border-border" };
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
    <div className="w-full flex flex-col items-center justify-center gap-2 border-b border-border bg-card"
      style={{ aspectRatio: "16/8" }}>
      <ImageOff className="w-8 h-8 text-muted-foreground" />
      <span className="text-muted-foreground text-xs">Image unavailable</span>
    </div>
  ) : (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/8" }}>
      {status === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-muted" />
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
       <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
      {hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <Play className="w-5 h-5 text-foreground ml-0.5" />
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
    void openExternalUrl(url);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-border transition-all duration-300 hover:border-border active:scale-[0.99] bg-card"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "fadeSlideUp 0.4s ease both",
      }}
      data-testid={`update-card-${item.id || index}`}
    >
      {hasImage && item.category && (
        <div className="relative">
          <CardImage url={item.image_url} title={item.title} hasVideo={hasVideo} />
            <span
              className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${cat.text} ${cat.border} ${cat.bg}`}
              style={{ backdropFilter: "blur(4px)" }}
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
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cat.text} ${cat.border} ${cat.bg}`}>
                <Tag className="w-2.5 h-2.5 inline mr-1" />{item.category}
              </span>
            )}
            {item.created_at && (
              <span className="text-muted-foreground text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />{formatDate(item.created_at)}
              </span>
            )}
          </div>
        )}

        {hasImage && item.created_at && (
          <span className="text-muted-foreground text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />{formatDate(item.created_at)}
          </span>
        )}

        {/* Title — tap 20× to trigger secret admin access */}
        <h3
          className="text-foreground font-bold text-base leading-snug select-none cursor-default"
          onPointerDown={onTitleTap}
        >
          {item.title}
        </h3>

        {item.description && (
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{item.description}</p>
        )}

        {(hasVideo || hasLink) && (
          <div className="flex gap-2 pt-1">
            {hasVideo && (
              <button onClick={() => openUrl(item.video_url)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground bg-primary transition-all active:scale-[0.97]"
                data-testid={`button-watch-${item.id}`}>
                <Play className="w-3.5 h-3.5" />{watchLabel}
              </button>
            )}
            {hasLink && (
              <button onClick={() => openUrl(item.target_link)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] ${hasVideo ? "text-foreground border border-border bg-card" : "text-primary-foreground bg-primary"}`}
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
        className={`w-full max-w-sm rounded-3xl p-7 border border-border bg-card ${shake ? "animate-bounce" : ""}`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-foreground font-bold text-lg">Admin Access</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
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
               className="w-full px-4 py-3 pr-12 rounded-xl text-foreground text-base border border-border outline-none focus:border-border transition-colors bg-card"
               style={{ letterSpacing: show ? "normal" : "4px" }}
              autoComplete="off"
            />
            <button onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button onClick={submit}
            className="w-full py-3 rounded-xl font-bold text-primary-foreground text-base transition-all active:scale-[0.98] bg-primary">
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

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-foreground text-sm border border-border outline-none focus:border-border transition-colors bg-card placeholder:text-muted-foreground";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-primary text-xs font-semibold uppercase tracking-wider">{label}</label>
      <div className="rounded-xl bg-card">
        {children}
      </div>
    </div>
  );
}

function AdminFormModal({ item, mode, onSave, onClose, submitting = false }: {
  item: UpdateItem | null;
  mode: "create" | "edit";
  onSave: (data: Omit<UpdateItem, "id">) => void;
  onClose: () => void;
  submitting?: boolean;
}) {
  const [form, setForm] = useState<Omit<UpdateItem, "id">>(
    item ? { ...item } : { ...EMPTY_ITEM }
  );
  const [imgPreview, setImgPreview] = useState(() => !!item?.image_url?.startsWith("data:"));
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const resolved = resolveImageUrl(form.image_url);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function compressImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else                { width  = Math.round(width  * MAX / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("canvas unavailable")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = reject;
        img.src = ev.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function onGalleryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryLoading(true);
    try {
      const dataUrl = await compressImageFile(file);
      set("image_url", dataUrl);
      setImgPreview(true);
    } catch { /* keep existing */ }
    finally {
      setGalleryLoading(false);
      e.target.value = ""; // allow re-selecting the same file
    }
  }

  function handleSave() {
    if (!form.title.trim()) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
        <h2 className="text-primary font-bold text-lg">
          {mode === "create" ? "Create Item" : "Edit Item"}
        </h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors">
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

        <Field label="Image">
          {/* Hidden file input — triggered by the button below */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onGalleryChange}
          />

          {/* Gallery picker button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={galleryLoading}
            className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-border transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              color: form.image_url?.startsWith("data:") ? "#86efac" : "#34d399",
              background: "rgba(52,211,153,0.06)",
            }}
          >
            {galleryLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ImagePlus className="w-4 h-4" />}
            {galleryLoading
              ? "Processing image…"
              : form.image_url?.startsWith("data:")
                ? "Change Gallery Image"
                : "Choose Image from Gallery"}
          </button>

          {/* OR divider */}
          <div className="flex items-center gap-2 my-2 px-1">
            <div className="flex-1 h-px" style={{ background: "rgba(52,211,153,0.12)" }} />
            <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">or paste URL</span>
            <div className="flex-1 h-px" style={{ background: "rgba(52,211,153,0.12)" }} />
          </div>

          {/* URL fallback — hidden when a gallery image is active */}
          <input
            value={form.image_url?.startsWith("data:") ? "" : form.image_url}
            onChange={(e) => { set("image_url", e.target.value); setImgPreview(false); }}
            placeholder="https://drive.google.com/file/d/.../view"
            className={inputCls}
          />

          {/* Preview */}
          {form.image_url && (
            <>
              {!form.image_url.startsWith("data:") && (
                <button
                  type="button"
                  onClick={() => setImgPreview((v) => !v)}
                  className="mt-1.5 ml-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <Eye className="w-3 h-3" />
                  {imgPreview ? "Hide preview" : "Preview image"}
                </button>
              )}
              {(imgPreview || form.image_url.startsWith("data:")) && (
                <div className="mt-2 relative">
                  <img
                    src={form.image_url.startsWith("data:") ? form.image_url : resolved}
                    alt="preview"
                    className="w-full rounded-xl object-cover border border-border"
                    style={{ maxHeight: 160 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {form.image_url.startsWith("data:") && (
                    <button
                      type="button"
                      onClick={() => { set("image_url", ""); setImgPreview(false); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                      style={{ background: "rgba(0,0,0,0.6)" }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              {form.image_url && !form.image_url.startsWith("data:") && (
                <p className="mt-1 ml-1 text-muted-foreground text-[10px] break-all">
                  Resolved: {resolveImageUrl(form.image_url)}
                </p>
              )}
            </>
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
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
                    ? "bg-primary text-primary-foreground border-border"
                    : "text-muted-foreground border-border hover:border-border"
                }`}
                style={form.status !== s ? { background: "transparent" } : {}}>
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

      <div className="px-5 py-4 border-t border-border"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button onClick={handleSave}
          disabled={!form.title.trim() || submitting}
          className="w-full py-3.5 rounded-2xl font-bold text-primary-foreground text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-primary">
          {submitting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Save className="w-4 h-4" />}
          {submitting ? "Saving…" : mode === "create" ? "Create Item" : "Save Changes"}
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
    <div className="mx-5 mb-4 rounded-2xl border border-border overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)" }}>

      {/* Header — always shows Connected since URL is pre-configured */}
      <button onClick={() => setShow(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-primary text-sm font-semibold">Google Sheet Sync</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full border font-bold text-green-400 border-green-800/50 bg-green-900/20">
            ✓ Connected
          </span>
          {saved && (
            <span className="text-[10px] text-primary font-semibold animate-in fade-in">
              URL updated
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${show ? "rotate-180" : ""}`} />
      </button>

      {show && (
        <div className="border-t border-border px-4 pt-4 pb-5 space-y-4">

          {/* Active URL */}
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              Active Apps Script URL
            </p>
            <div className="rounded-xl p-3 border border-green-900/30 flex items-start gap-2"
              style={{ background: "rgba(52,211,153,0.04)" }}>
              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-[10px] font-mono break-all leading-relaxed">
                {activeUrl}
              </p>
            </div>
            <p className="text-muted-foreground text-[10px]">
              Every Create / Edit / Delete writes directly to your Google Sheet.
            </p>
          </div>

          {/* Sheet columns reference */}
          <div className="rounded-xl p-3 border border-border"
            style={{ background: "rgba(0,0,0,0.15)" }}>
            <p className="text-muted-foreground text-[10px] font-bold mb-1.5 uppercase tracking-wider">
              Sheet columns (Row 1 headers)
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {(["A=id","B=title","C=description","D=image_url","E=video_url",
                 "F=button_text","G=target_link","H=category","I=status","J=created_at"] as const
              ).map((col) => {
                const [letter, field] = col.split("=");
                return (
                  <div key={col} className="flex items-center gap-1.5">
                    <span className="text-muted-foreground font-mono text-[10px] w-4">{letter}</span>
                    <span className="text-muted-foreground text-[10px] font-mono">{field}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Override URL (advanced) */}
          <div className="space-y-2">
            <button onClick={() => setEditing(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors">
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
                  className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40">
                  <Save className="w-3.5 h-3.5" /> Save New URL
                </button>

                {/* Copy script option for re-deployment */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)" }}>
                    <span className="text-muted-foreground text-[10px] font-mono">noor-quran-sheet-api.gs</span>
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

  const { toast } = useToast();

  const [formState, setFormState] = useState<{
    open: boolean; mode: "create" | "edit"; item: UpdateItem | null;
  }>({ open: false, mode: "create", item: null });

  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError,  setSyncError]  = useState<string | undefined>(undefined);

  // ── Persist local state + update TanStack cache immediately ─────────────────
  function persistLocal(l: LocalAdminItem[], d: string[], o: OverrideEntry[]) {
    try {
      adminData.saveLocal(l);
      adminData.saveDeleted(d);
      adminData.saveOverrides(o);
    } catch (storageErr) {
      // localStorage quota exceeded — likely caused by large base64 gallery images.
      // Surface a clear error so the user can use the Clear Cache button.
      const msg = (storageErr as Error)?.message ?? "Storage full";
      throw new Error(
        `Storage full: ${msg}. Use "Clear Local Cache" in Admin Panel to free up space, then try again.`,
      );
    }
    setLocal(l); setDeleted(d); setOverrides(o);
    // Optimistically update the TanStack cache so the UI reflects changes at once
    const current = qc.getQueryData<UpdateItem[]>(["updates"]) ?? sheetItems;
    qc.setQueryData(["updates"], mergeItems(current, l, d, o));
  }

  // ── Clear all local admin data + refresh from Sheet ──────────────────────────
  function handleClearCache() {
    try {
      adminData.saveLocal([]);
      adminData.saveDeleted([]);
      adminData.saveOverrides([]);
    } catch { /* ignore — we are clearing, errors don't matter */ }
    setLocal([]); setDeleted([]); setOverrides([]);
    qc.invalidateQueries({ queryKey: ["updates"] });
    toast({ title: "✓ Local cache cleared", description: "Fetching fresh data from Sheet…" });
  }

  // ── After a write: trigger a background GViz re-fetch ────────────────────────
  // NOTE: We intentionally do NOT clear localItems / overrides / deletedIds here.
  //
  // scriptSync uses mode:"no-cors" — the browser never reads the response, so we
  // cannot confirm whether the Sheet write actually succeeded.  Clearing local
  // state eagerly (before GViz confirms it) causes items to disappear from the UI
  // whenever the write is slow, the Script URL is stale, or GViz cache (~5 min)
  // hasn't updated yet.
  //
  // Local state stays in localStorage permanently:
  //   • localItems  — new items created by the admin; mergeItems deduplicates
  //                   by ID so Sheet items with the same ID are never shown twice.
  //   • overrides   — edited values always win over Sheet values (single-admin).
  //   • deletedIds  — deleted items stay hidden regardless of Sheet state.
  //
  // The user can explicitly remove items by deleting them through the admin UI.
  function refreshFromSheet() {
    qc.invalidateQueries({ queryKey: ["updates"] });
    console.log("[Noor/Admin] ✓ GViz query invalidated — background re-fetch triggered");
  }

  // ── Main sync: write to Sheet, then trigger a background GViz refresh ────────
  async function doSync(
    action: "create" | "edit" | "delete",
    payload: { item?: Partial<UpdateItem>; id?: string },
  ) {
    setSyncStatus("syncing");
    setSyncError(undefined);

    const result = await scriptSync(action, payload);

    if (result.ok) {
      setSyncStatus("ok");
      refreshFromSheet();
      setTimeout(() => setSyncStatus("idle"), 3000);
    } else {
      setSyncStatus("fail");
      setSyncError(result.error);
      console.error("[Noor/Admin] Sync failed:", result.error);
    }
  }

  // ── Create / Edit ────────────────────────────────────────────────────────────
  async function handleSave(data: Omit<UpdateItem, "id">) {
    if (submitting) return; // guard against double-tap
    setSubmitting(true);

    // Capture before any state resets (formState will be cleared below)
    const capturedMode = formState.mode;
    const capturedItem = formState.item;

    try {
      if (capturedMode === "create") {
        const tempId = generateId();
        const newItem: LocalAdminItem = {
          ...data, id: tempId, _local: true, _ts: Date.now(),
        };
        persistLocal([newItem, ...localItems], deletedIds, overrides);
        // ↓ Reset submitting + close form BEFORE the background Sheet sync so
        //   re-opening the form while sync is in-flight doesn't see a locked button.
        setFormState({ open: false, mode: "create", item: null });
        setSubmitting(false);
        toast({ title: "✓ Item saved locally", description: "Syncing to Sheet in background…" });
        await doSync("create", { item: { ...data, id: tempId } });
      } else if (capturedItem) {
        const id = capturedItem.id;
        const isLocal = localItems.some((it) => it.id === id);
        if (isLocal) {
          persistLocal(
            localItems.map((it) => it.id === id ? { ...it, ...data } : it),
            deletedIds, overrides,
          );
        } else {
          persistLocal(
            localItems, deletedIds,
            overrides.filter((o) => o.id !== id).concat({ id, data }),
          );
        }
        setFormState({ open: false, mode: "create", item: null });
        setSubmitting(false);
        toast({ title: "✓ Changes saved", description: "Syncing to Sheet in background…" });
        await doSync("edit", { id: capturedItem.id, item: { ...data } });
      }
    } catch (err) {
      const msg = (err as Error)?.message ?? "Unknown error";
      toast({ title: "Save error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false); // safety reset — already false in the happy path
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
    // Write delete to Sheet. The deletedId is intentionally kept in localStorage
    // so the item stays hidden regardless of GViz cache or write confirmation.
    await doSync(
      "delete",
      { id },
    );
  }

  // allItems reflects the merged state (optimistic + Sheet)
  const currentSheet = qc.getQueryData<UpdateItem[]>(["updates"]) ?? sheetItems;
  const allItems = mergeItems(currentSheet, localItems, deletedIds, overrides);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-foreground font-bold text-xl">Admin Panel</h1>
          <span className="text-muted-foreground text-xs border border-border rounded-full px-2 py-0.5">
            {allItems.length} items
          </span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sheet Sync Setup */}
      <div className="pt-3">
        <SheetSyncPanel />
      </div>

      {/* Clear Local Cache button — helps when localStorage is full or data is stale */}
      <div className="px-5 pb-2">
        <button
          onClick={handleClearCache}
          className="w-full py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 bg-card">
          <Trash2 className="w-3 h-3" /> Clear Local Cache
        </button>
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
          className="w-full py-3 rounded-2xl font-bold text-primary-foreground text-sm flex items-center justify-center gap-2 border border-border transition-all active:scale-[0.98] bg-primary">
          <Plus className="w-4 h-4" /> Create New Item
        </button>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3">
        {allItems.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">No items yet. Create one above.</div>
        )}
        {allItems.map((item) => {
          const isLocal      = localItems.some((l) => l.id === item.id);
          const isOverridden = overrides.some((o) => o.id === item.id);
          return (
            <div key={item.id}
              className="rounded-2xl p-4 border border-border space-y-2 bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isLocal
                        ? "text-foreground border-border bg-primary/15"
                        : "text-muted-foreground border-border bg-card"
                    }`}>
                      {isLocal ? "📱 Local" : isOverridden ? "📊 Sheet (edited)" : "📊 Sheet"}
                    </span>
                    {item.category && (
                      <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      item.status?.toLowerCase() === "active"
                        ? "text-foreground border-border"
                        : "text-muted-foreground border-border"
                    }`}>
                      {item.status || "active"}
                    </span>
                  </div>
                  <p className="text-foreground font-semibold text-sm leading-snug truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  {item.image_url && (
                    <p className="text-muted-foreground text-[10px] mt-1 truncate">🖼 {item.image_url}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => setFormState({ open: true, mode: "edit", item })}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all bg-card">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setConfirmDelete(item.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:border-border transition-all bg-card">
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl p-6 border border-border bg-card">
            <p className="text-foreground font-bold text-base mb-2">Delete Item?</p>
            <p className="text-muted-foreground text-sm mb-5">
              {localItems.some((l) => l.id === confirmDelete)
                ? "This will permanently remove the local item."
                : "This will hide the Sheet item from the app (and delete from Sheet if sync is set up)."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-muted-foreground border border-border text-sm font-semibold bg-card">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl text-primary-foreground text-sm font-bold bg-primary">Delete</button>
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
          submitting={submitting}
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
        className="min-h-screen pb-28 md:pb-10 overflow-y-auto"onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        <div className="flex items-center justify-center overflow-hidden transition-all duration-300"
          style={{ height: pullY > 0 ? `${pullY}px` : 0 }}>
          <RefreshCw className="w-5 h-5 text-primary"
            style={{ transform: `rotate(${(pullY / 64) * 180}deg)` }} />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <Link href="/more" className="text-muted-foreground hover:text-primary transition-colors"
            data-testid="link-back-more">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-serif font-bold text-primary">Updates</h1>
            {lastUpdated && !isLoading && (
              <p className="text-muted-foreground text-xs mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Refreshed at {lastUpdated}
              </p>
            )}
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-border text-primary hover:text-primary hover:border-emerald-600 transition-all"
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
                      ? "bg-primary text-primary-foreground border-emerald-600"
                      : "text-muted-foreground border-border hover:border-primary"
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
                <div key={i} className="rounded-2xl overflow-hidden border border-border"
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
                <Sparkles className="w-9 h-9 text-muted-foreground" />
              </div>
              <p className="text-primary font-semibold text-base">No updates available</p>
              <p className="text-muted-foreground text-sm mt-1">Check back soon for news and features</p>
            </div>
          )}

          {/* Cards */}
          {!isLoading && !isError && filtered.map((item, i) => (
            <UpdateCard key={item.id || i} item={item} index={i} onTitleTap={onTitleTap} />
          ))}

          {!isLoading && !isError && filtered.length > 0 && (
            <p className="text-muted-foreground text-xs text-center pb-4">
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
