import { useState, useEffect, useCallback, useRef } from "react";
import { noorApi, type NoorProduct } from "@/lib/noor-api";
import {
  CheckCircle, XCircle, Trash2, Loader2, ShieldCheck, Eye, RefreshCw,
  Package, Pencil, Save, X, Plus, Star, ImagePlus, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  tasbeeh: "Tasbeeh",
  prayer_mat: "Prayer Mat",
  books: "Books",
  attar: "Attar",
  courses: "Courses",
  other: "Other",
};

const CATEGORY_OPTIONS = [
  { value: "tasbeeh",    label: "Tasbeeh" },
  { value: "prayer_mat", label: "Prayer Mat" },
  { value: "books",      label: "Books" },
  { value: "attar",      label: "Attar" },
  { value: "courses",    label: "Courses" },
  { value: "other",      label: "Other" },
];

function isFeaturedNow(p: NoorProduct): boolean {
  return (
    p.promotionType === "7day" &&
    !!p.promotionExpiry &&
    p.promotionExpiry > new Date().toISOString()
  );
}

async function compressImageFile(file: File, maxWidth = 800, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = e.target!.result as string;
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
      status === "approved" ? "border-border bg-muted text-primary" :
      status === "rejected" ? "border-red-700/50 bg-red-900/20 text-red-400" :
      "border-yellow-700/50 bg-yellow-900/20 text-yellow-400"
    }`}>{status}</span>
  );
}

type AdminRow = {
  product: NoorProduct;
  user: { id: string; deviceId: string; referralCode: string; coinsBalance: number } | null;
};

const INPUT_CLS = "bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-sm";
const TEXTAREA_CLS = "w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary";
const SELECT_CLS = "w-full px-3 py-2 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary";

export function AdminProducts() {
  const { toast } = useToast();

  const [token,        setToken]        = useState(localStorage.getItem("noor-admin-token") ?? "");
  const [authed,       setAuthed]       = useState(false);
  const [tokenInput,   setTokenInput]   = useState("");
  const [loading,      setLoading]      = useState(false);
  const [rows,         setRows]         = useState<AdminRow[]>([]);
  const [tab,          setTab]          = useState<"pending" | "all">("pending");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [acting,       setActing]       = useState<Record<string, boolean>>({});
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editTitle,    setEditTitle]    = useState("");
  const [editDesc,     setEditDesc]     = useState("");
  const [editContact,  setEditContact]  = useState("");
  const [editLink,     setEditLink]     = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editName,     setEditName]     = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  const [showCreate,    setShowCreate]    = useState(false);
  const [newTitle,      setNewTitle]      = useState("");
  const [newDesc,       setNewDesc]       = useState("");
  const [newContact,    setNewContact]    = useState("");
  const [newLink,       setNewLink]       = useState("");
  const [newCategory,   setNewCategory]   = useState("other");
  const [newName,       setNewName]       = useState("");
  const [newFeatured,   setNewFeatured]   = useState(false);
  const [newImageUrl,   setNewImageUrl]   = useState("");
  const [creating,      setCreating]      = useState(false);

  const createFileRef = useRef<HTMLInputElement>(null);
  const editFileRef   = useRef<HTMLInputElement>(null);

  const load = useCallback(async (adminToken: string, mode: "pending" | "all") => {
    setLoading(true);
    try {
      const data =
        mode === "pending"
          ? await noorApi.adminGetPending(adminToken)
          : await noorApi.adminGetAll(adminToken);
      setRows(data.products as AdminRow[]);
      setAuthed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("Unauthorized")) {
        toast({ title: "Wrong admin token", variant: "destructive" });
        setAuthed(false);
      } else {
        toast({ title: "Load failed", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authed) load(token, tab);
  }, [tab, authed, token, load]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const t = tokenInput.trim();
    if (!t) return;
    setToken(t);
    localStorage.setItem("noor-admin-token", t);
    load(t, tab).then(() => setAuthed(true));
  }

  async function approve(id: string) {
    setActing((a) => ({ ...a, [id]: true }));
    try {
      await noorApi.adminApprove(token, id);
      toast({ title: "Product approved!" });
      load(token, tab);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setActing((a) => ({ ...a, [id]: false }));
    }
  }

  async function reject(id: string) {
    setActing((a) => ({ ...a, [id]: true }));
    try {
      const reason = rejectReason[id]?.trim();
      const result = await noorApi.adminReject(token, id, reason);
      toast({
        title: "Product rejected",
        description: result.coinsRefunded > 0 ? `${result.coinsRefunded} coins refunded.` : undefined,
      });
      load(token, tab);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setActing((a) => ({ ...a, [id]: false }));
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this product permanently?")) return;
    setActing((a) => ({ ...a, [id]: true }));
    try {
      await noorApi.adminDelete(token, id);
      toast({ title: "Product deleted" });
      setRows((r) => r.filter((x) => x.product.id !== id));
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setActing((a) => ({ ...a, [id]: false }));
    }
  }

  async function toggleFeatured(p: NoorProduct) {
    const currentlyFeatured = isFeaturedNow(p);
    setActing((a) => ({ ...a, [p.id]: true }));
    try {
      await noorApi.adminSetFeatured(token, p.id, !currentlyFeatured);
      toast({ title: currentlyFeatured ? "Feature removed" : "Product featured for 30 days!" });
      load(token, tab);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setActing((a) => ({ ...a, [p.id]: false }));
    }
  }

  function startEdit(p: NoorProduct) {
    setEditTitle(p.title);
    setEditDesc(p.description);
    setEditContact(p.contactInfo);
    setEditLink(p.productLink ?? "");
    setEditCategory(p.category);
    setEditName(p.submittedBy ?? "");
    setEditImageUrl(p.imageUrl ?? "");
    setExpandedId(p.id);
    setEditingId(p.id);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    setActing((a) => ({ ...a, [id]: true }));
    try {
      await noorApi.adminEditProduct(token, id, {
        title:       editTitle.trim() || undefined,
        description: editDesc.trim() || undefined,
        contactInfo: editContact.trim() || undefined,
        productLink: editLink.trim() || undefined,
        category:    editCategory || undefined,
        submittedBy: editName.trim() || undefined,
        imageUrl:    editImageUrl,
      });
      toast({ title: "Product updated" });
      setEditingId(null);
      load(token, tab);
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setActing((a) => ({ ...a, [id]: false }));
    }
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newDesc.trim() || !newContact.trim()) {
      toast({ title: "Title, Description, and Contact are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await noorApi.adminCreateProduct(token, {
        title:       newTitle.trim(),
        description: newDesc.trim(),
        contactInfo: newContact.trim(),
        productLink: newLink.trim() || undefined,
        category:    newCategory,
        submittedBy: newName.trim() || undefined,
        imageUrl:    newImageUrl || undefined,
        featured:    newFeatured,
      });
      toast({ title: "Product created and published!" });
      setShowCreate(false);
      setNewTitle(""); setNewDesc(""); setNewContact(""); setNewLink("");
      setNewCategory("other"); setNewName(""); setNewFeatured(false); setNewImageUrl("");
      setTab("all");
      load(token, "all");
    } catch (err: unknown) {
      toast({ title: "Create failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function pickCreateImage(file: File) {
    try {
      const compressed = await compressImageFile(file);
      setNewImageUrl(compressed);
    } catch {
      toast({ title: "Image error — try a different file", variant: "destructive" });
    }
  }

  async function pickEditImage(file: File) {
    try {
      const compressed = await compressImageFile(file);
      setEditImageUrl(compressed);
    } catch {
      toast({ title: "Image error — try a different file", variant: "destructive" });
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <ShieldCheck className="w-14 h-14 text-primary mb-4" />
        <h1 className="text-2xl font-serif font-bold text-foreground mb-1">Admin Panel</h1>
        <p className="text-muted-foreground text-sm mb-6">Enter admin token to continue</p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
          <Input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Admin Panel"}
          </Button>
        </form>
      </div>
    );
  }

  return (
      <div className="min-h-screen pb-28 animate-in fade-in duration-500 bg-background">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
        <div className="flex-1">
          <h1 className="text-xl font-serif font-bold text-foreground">Product Admin</h1>
          <p className="text-muted-foreground text-xs">{rows.length} item(s)</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/80 text-primary-foreground text-xs font-semibold border border-border active:scale-95 transition-transform"
        >
          {showCreate ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showCreate ? "Close" : "Create"}
        </button>
        <button
          onClick={() => load(token, tab)}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-primary shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Create Product Panel ── */}
      {showCreate && (
        <div
          className="mx-4 mb-4 rounded-2xl border border-border p-4 space-y-3 bg-muted"
        >
          <p className="text-foreground font-bold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Product
          </p>

          {/* Image picker */}
          <input
            ref={createFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickCreateImage(f);
              e.target.value = "";
            }}
          />
          {newImageUrl ? (
            <div className="relative">
              <img
                src={newImageUrl}
                alt="Preview"
                className="w-full h-32 object-cover rounded-xl border border-border"
              />
              <button
                onClick={() => setNewImageUrl("")}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-primary-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => createFileRef.current?.click()}
              className="w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground active:scale-[0.98] transition-transform"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">Tap to pick image from gallery</span>
            </button>
          )}
          {newImageUrl && (
            <button
              onClick={() => createFileRef.current?.click()}
              className="text-primary text-xs underline"
            >
              Change image
            </button>
          )}

          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Product title *"
            className={INPUT_CLS}
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description *"
            rows={3}
            className={TEXTAREA_CLS}
          />
          <Input
            value={newContact}
            onChange={(e) => setNewContact(e.target.value)}
            placeholder="Contact info (phone / WhatsApp / email) *"
            className={INPUT_CLS}
          />
          <Input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="Product link (optional)"
            className={INPUT_CLS}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={SELECT_CLS}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Seller / brand name (optional)"
            className={INPUT_CLS}
          />

          {/* Featured toggle */}
          <button
            onClick={() => setNewFeatured((v) => !v)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              newFeatured
                ? "border-border bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            <span className="flex items-center gap-2">
              <Star className={`w-4 h-4 ${newFeatured ? "fill-primary text-primary" : ""}`} />
              {newFeatured ? "Featured — will appear at top" : "Not featured"}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${newFeatured ? "border-border bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
              {newFeatured ? "ON" : "OFF"}
            </span>
          </button>

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-1.5"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create & Publish</>}
            </Button>
            <Button
              onClick={() => setShowCreate(false)}
              variant="ghost"
              className="text-primary rounded-xl"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="px-4 flex gap-2 mb-4">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground border border-border bg-muted"
            }`}
          >
            {t === "pending" ? "Pending" : "All Products"}
          </button>
        ))}
      </div>

      {/* ── Product list ── */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No products in this view.</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {rows.map(({ product: p, user: u }) => {
            const featured = isFeaturedNow(p);
            return (
              <div
                key={p.id}
                className={`rounded-2xl border overflow-hidden ${featured ? "border-border" : "border-border"} bg-muted`}
              >
                {p.imageUrl && expandedId === p.id && (
                  <img src={p.imageUrl} alt={p.title} className="w-full h-36 object-cover" />
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-base leading-tight flex-1">{p.title}</h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {featured && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-border">
                          ⭐ Featured
                        </span>
                      )}
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <p className="text-primary text-xs">{CATEGORY_LABELS[p.category] ?? p.category}</p>

                  {expandedId === p.id && (
                    editingId === p.id ? (
                      <div className="space-y-2 pt-1">
                        {/* Edit image */}
                        <input
                          ref={editFileRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) pickEditImage(f);
                            e.target.value = "";
                          }}
                        />
                        {editImageUrl ? (
                          <div className="relative">
                            <img
                              src={editImageUrl}
                              alt="Preview"
                              className="w-full h-28 object-cover rounded-xl border border-border"
                            />
                            <button
                              onClick={() => setEditImageUrl("")}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-primary-foreground"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => editFileRef.current?.click()}
                              className="w-full h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-muted-foreground text-xs active:scale-[0.98] transition-transform"
                          >
                            <ImagePlus className="w-4 h-4" /> Pick image from gallery
                          </button>
                        )}
                        {editImageUrl && (
                          <button onClick={() => editFileRef.current?.click()} className="text-primary text-xs underline">
                            Change image
                          </button>
                        )}
                        <Input value={editTitle}    onChange={(e) => setEditTitle(e.target.value)}    placeholder="Title"                    className={INPUT_CLS} />
                        <textarea value={editDesc}  onChange={(e) => setEditDesc(e.target.value)}     placeholder="Description" rows={3}      className={TEXTAREA_CLS} />
                        <Input value={editContact}  onChange={(e) => setEditContact(e.target.value)}  placeholder="Contact info"             className={INPUT_CLS} />
                        <Input value={editLink}     onChange={(e) => setEditLink(e.target.value)}     placeholder="Product link (optional)"  className={INPUT_CLS} />
                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className={SELECT_CLS}>
                          {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <Input value={editName}     onChange={(e) => setEditName(e.target.value)}     placeholder="Seller name (optional)"   className={INPUT_CLS} />
                      </div>
                    ) : (
                      <>
                        <p className="text-muted-foreground text-sm">{p.description}</p>
                        <p className="text-muted-foreground text-xs">📞 {p.contactInfo}</p>
                        {p.productLink && <p className="text-muted-foreground text-xs">🔗 {p.productLink}</p>}
                        {p.submittedBy && <p className="text-muted-foreground text-xs">👤 {p.submittedBy}</p>}
                        {u && <p className="text-muted-foreground text-xs">Device: {u.deviceId.slice(0, 16)}…</p>}
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-muted-foreground">Created: {new Date(p.createdAt).toLocaleString()}</span>
                          {p.promotionType !== "none" && (
                            <span className="text-primary font-semibold">⭐ {p.promotionType}</span>
                          )}
                          {p.rejectionReason && <span className="text-muted-foreground">Reason: {p.rejectionReason}</span>}
                          {p.approvedAt && <span className="text-primary">Approved: {new Date(p.approvedAt).toLocaleString()}</span>}
                          {p.promotionExpiry && (
                            <span className={new Date(p.promotionExpiry) > new Date() ? "text-primary" : "text-muted-foreground"}>
                              Featured until: {new Date(p.promotionExpiry).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </>
                    )
                  )}

                  <button
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="flex items-center gap-1 text-primary text-xs mt-1"
                  >
                    <Eye className="w-3.5 h-3.5" /> {expandedId === p.id ? "Less" : "Details"}
                  </button>
                </div>

                {/* Pending actions */}
                {p.status === "pending" && (
                  <div className="px-4 pb-4 space-y-2">
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(p.id)} disabled={acting[p.id]}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-1">
                          {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                        </Button>
                          <Button size="sm" onClick={cancelEdit} variant="ghost" className="text-primary rounded-xl">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Input
                          value={rejectReason[p.id] ?? ""}
                          onChange={(e) => setRejectReason((r) => ({ ...r, [p.id]: e.target.value }))}
                          placeholder="Rejection reason (optional)"
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-9 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => approve(p.id)} disabled={acting[p.id]}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-1">
                            {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Approve</>}
                          </Button>
                          <Button size="sm" onClick={() => reject(p.id)} disabled={acting[p.id]}
                            variant="destructive" className="flex-1 rounded-xl gap-1">
                            {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject</>}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => toggleFeatured(p)} disabled={acting[p.id]}
                            variant="ghost"
                            className={`flex-1 rounded-xl gap-1 text-xs ${featured ? "text-amber-400 hover:text-amber-300" : "text-amber-600 hover:text-amber-400"}`}>
                            <Star className={`w-3.5 h-3.5 ${featured ? "fill-amber-400" : ""}`} />
                            {featured ? "Remove Feature" : "Mark Featured"}
                          </Button>
                          <Button size="sm" onClick={() => startEdit(p)} disabled={acting[p.id]}
                            variant="ghost" className="text-sky-400 hover:text-sky-300 rounded-xl">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" onClick={() => remove(p.id)} disabled={acting[p.id]}
                            variant="ghost" className="text-red-400 hover:text-red-300 rounded-xl">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Approved / Rejected actions */}
                {p.status !== "pending" && (
                  <div className="px-4 pb-3">
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(p.id)} disabled={acting[p.id]}
                          className="flex-1 bg-primary hover:bg-emerald-600 text-foreground rounded-xl gap-1">
                          {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                        </Button>
                        <Button size="sm" onClick={cancelEdit} variant="ghost" className="text-primary rounded-xl">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        <Button size="sm" onClick={() => toggleFeatured(p)} disabled={acting[p.id]}
                          variant="ghost"
                          className={`rounded-xl gap-1 text-xs ${featured ? "text-amber-400 hover:text-amber-300" : "text-amber-600/70 hover:text-amber-400"}`}>
                          <Star className={`w-3.5 h-3.5 ${featured ? "fill-amber-400" : ""}`} />
                          {featured ? "Remove Feature" : "Feature"}
                        </Button>
                        <Button size="sm" onClick={() => startEdit(p)} disabled={acting[p.id]}
                          variant="ghost" className="text-sky-400/80 hover:text-sky-400 rounded-xl gap-1 text-xs">
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => remove(p.id)} disabled={acting[p.id]}
                          variant="ghost" className="text-red-400/60 hover:text-red-400 rounded-xl gap-1 text-xs">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
