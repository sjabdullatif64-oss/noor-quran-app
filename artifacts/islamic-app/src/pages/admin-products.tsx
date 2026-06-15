import { useState, useEffect, useCallback } from "react";
import { noorApi, type NoorProduct } from "@/lib/noor-api";
import {
  CheckCircle, XCircle, Trash2, Loader2, ShieldCheck, Eye, RefreshCw, Package, Pencil, Save, X,
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
      status === "approved" ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-400" :
      status === "rejected" ? "border-red-700/50 bg-red-900/20 text-red-400" :
      "border-yellow-700/50 bg-yellow-900/20 text-yellow-400"
    }`}>{status}</span>
  );
}

type AdminRow = {
  product: NoorProduct;
  user: { id: string; deviceId: string; referralCode: string; coinsBalance: number } | null;
};

export function AdminProducts() {
  const { toast } = useToast();
  const [token,       setToken]       = useState(localStorage.getItem("noor-admin-token") ?? "");
  const [authed,      setAuthed]      = useState(false);
  const [tokenInput,  setTokenInput]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [rows,        setRows]        = useState<AdminRow[]>([]);
  const [tab,         setTab]         = useState<"pending" | "all">("pending");
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [acting,      setActing]      = useState<Record<string, boolean>>({});
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editTitle,   setEditTitle]   = useState("");
  const [editDesc,    setEditDesc]    = useState("");
  const [editContact, setEditContact] = useState("");
  const [editLink,    setEditLink]    = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editName,    setEditName]    = useState("");

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
      toast({ title: "Product approved!", description: "Promotion timer started." });
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

  function startEdit(p: NoorProduct) {
    setEditTitle(p.title);
    setEditDesc(p.description);
    setEditContact(p.contactInfo);
    setEditLink(p.productLink ?? "");
    setEditCategory(p.category);
    setEditName(p.submittedBy ?? "");
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

  if (!authed) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
      >
        <ShieldCheck className="w-14 h-14 text-emerald-500 mb-4" />
        <h1 className="text-2xl font-serif font-bold text-emerald-300 mb-1">Admin Panel</h1>
        <p className="text-emerald-700 text-sm mb-6">Enter admin token to continue</p>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
          <Input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
            autoFocus
          />
          <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Access Admin Panel"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-emerald-400" />
        <div className="flex-1">
          <h1 className="text-xl font-serif font-bold text-emerald-300">Product Admin</h1>
          <p className="text-emerald-700 text-xs">{rows.length} item(s)</p>
        </div>
        <button onClick={() => load(token, tab)} className="w-9 h-9 rounded-full border border-emerald-800/50 flex items-center justify-center text-emerald-500">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="px-4 flex gap-2 mb-4">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              tab === t ? "bg-emerald-700 text-white" : "text-emerald-600 border border-emerald-900/50 bg-emerald-950/30"
            }`}
          >
            {t === "pending" ? "Pending" : "All Products"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-emerald-700">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No products in this view.</p>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {rows.map(({ product: p, user: u }) => (
            <div
              key={p.id}
              className="rounded-2xl border border-emerald-900/50 overflow-hidden"
              style={{ background: "rgba(10,30,18,0.7)" }}
            >
              {p.imageUrl && expandedId === p.id && (
                <img src={p.imageUrl} alt={p.title} className="w-full h-40 object-cover" />
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-white text-base leading-tight">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-emerald-500 text-xs">{CATEGORY_LABELS[p.category] ?? p.category}</p>

                {expandedId === p.id && (
                  editingId === p.id ? (
                    <div className="space-y-2 pt-1">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        className="bg-emerald-950/60 border-emerald-800/60 text-white placeholder:text-emerald-800 h-9 text-sm"
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Description"
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-white placeholder:text-emerald-800 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      />
                      <Input
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        placeholder="Contact info"
                        className="bg-emerald-950/60 border-emerald-800/60 text-white placeholder:text-emerald-800 h-9 text-sm"
                      />
                      <Input
                        value={editLink}
                        onChange={(e) => setEditLink(e.target.value)}
                        placeholder="Product link (optional)"
                        className="bg-emerald-950/60 border-emerald-800/60 text-white placeholder:text-emerald-800 h-9 text-sm"
                      />
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-700"
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Seller name (optional)"
                        className="bg-emerald-950/60 border-emerald-800/60 text-white placeholder:text-emerald-800 h-9 text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <p className="text-emerald-400 text-sm">{p.description}</p>
                      <p className="text-emerald-600 text-xs">📞 {p.contactInfo}</p>
                      {p.productLink && (
                        <p className="text-emerald-600 text-xs">🔗 {p.productLink}</p>
                      )}
                      {p.submittedBy && <p className="text-emerald-600 text-xs">👤 {p.submittedBy}</p>}
                      {u && <p className="text-emerald-800 text-xs">Device: {u.deviceId.slice(0, 16)}… | Coins: {u.coinsBalance}</p>}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="text-emerald-700">Submitted: {new Date(p.createdAt).toLocaleString()}</span>
                        {p.promotionType !== "none" && (
                          <span className="text-amber-500 font-semibold">⭐ Promo: {p.promotionType} ({p.coinsSpent} coins)</span>
                        )}
                        {p.rejectionReason && <span className="text-red-400">Reason: {p.rejectionReason}</span>}
                        {p.approvedAt && <span className="text-emerald-500">Approved: {new Date(p.approvedAt).toLocaleString()}</span>}
                        {p.promotionExpiry && (
                          <span className={new Date(p.promotionExpiry) > new Date() ? "text-amber-400" : "text-emerald-800"}>
                            Promo expires: {new Date(p.promotionExpiry).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </>
                  )
                )}

                <button
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="flex items-center gap-1 text-emerald-600 text-xs mt-1"
                >
                  <Eye className="w-3.5 h-3.5" /> {expandedId === p.id ? "Less" : "Details"}
                </button>
              </div>

              {p.status === "pending" && (
                <div className="px-4 pb-4 space-y-2">
                  {editingId === p.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(p.id)}
                        disabled={acting[p.id]}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl gap-1"
                      >
                        {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                      </Button>
                      <Button
                        size="sm"
                        onClick={cancelEdit}
                        variant="ghost"
                        className="text-emerald-500 rounded-xl"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        value={rejectReason[p.id] ?? ""}
                        onChange={(e) => setRejectReason((r) => ({ ...r, [p.id]: e.target.value }))}
                        placeholder="Rejection reason (optional)"
                        className="bg-emerald-950/50 border-emerald-900/50 text-white placeholder:text-emerald-800 h-9 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => approve(p.id)}
                          disabled={acting[p.id]}
                          className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl gap-1"
                        >
                          {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Approve</>}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => reject(p.id)}
                          disabled={acting[p.id]}
                          variant="destructive"
                          className="flex-1 rounded-xl gap-1"
                        >
                          {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject</>}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => startEdit(p)}
                          disabled={acting[p.id]}
                          variant="ghost"
                          className="text-sky-400 hover:text-sky-300 rounded-xl"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => remove(p.id)}
                          disabled={acting[p.id]}
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {p.status !== "pending" && (
                <div className="px-4 pb-3">
                  {editingId === p.id ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(p.id)}
                        disabled={acting[p.id]}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl gap-1"
                      >
                        {acting[p.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save</>}
                      </Button>
                      <Button
                        size="sm"
                        onClick={cancelEdit}
                        variant="ghost"
                        className="text-emerald-500 rounded-xl"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <Button
                        size="sm"
                        onClick={() => startEdit(p)}
                        disabled={acting[p.id]}
                        variant="ghost"
                        className="text-sky-400/80 hover:text-sky-400 rounded-xl gap-1 text-xs"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => remove(p.id)}
                        disabled={acting[p.id]}
                        variant="ghost"
                        className="text-red-400/60 hover:text-red-400 rounded-xl gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
