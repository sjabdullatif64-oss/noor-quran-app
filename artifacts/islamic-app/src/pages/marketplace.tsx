import { useState, useEffect } from "react";
import { noorApi, type NoorProduct } from "@/lib/noor-api";
import { openUrl, nativeShare } from "@/lib/capacitor";
import { Star, Tag, Phone, Calendar, Loader2, Sparkles, Package, ExternalLink, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_LABELS: Record<string, string> = {
  tasbeeh: "Tasbeeh",
  prayer_mat: "Prayer Mat",
  books: "Islamic Books",
  attar: "Attar / Perfume",
  courses: "Islamic Courses",
  other: "Other",
};

function timeAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(ms / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(ms / 3600000);
  if (h > 0) return `${h}h ago`;
  return "Just now";
}

function ProductCard({ p, featured }: { p: NoorProduct; featured?: boolean }) {
  const { toast } = useToast();
  const hasLink = !!p.productLink?.trim();

  async function handleShare() {
    const lines = [p.description, `Contact: ${p.contactInfo}`];
    if (p.submittedBy) lines.push(`By ${p.submittedBy}`);
    lines.push("— Shared via Noor Quran Islamic Marketplace");

    const productUrl = p.productLink?.startsWith("http") ? p.productLink : undefined;

    const result = await nativeShare({
      title: p.title,
      text: lines.join("\n"),
      url: productUrl,
      dialogTitle: "Share Product",
    });

    if (result === "failed") {
      toast({ title: "Share unavailable", description: "Please try again.", variant: "destructive" });
    }
  }

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all ${
        featured ? "border-amber-600/40" : "border-emerald-900/50"
      }`}
      style={{
        background: featured
          ? "linear-gradient(135deg, rgba(120,80,0,0.25) 0%, rgba(50,30,0,0.25) 100%)"
          : "rgba(10,30,18,0.7)",
      }}
    >
      {featured && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600/80 text-amber-100 text-[10px] font-bold z-10">
          <Star className="w-2.5 h-2.5 fill-amber-200" /> Featured
        </div>
      )}

      {p.imageUrl && (
        <div className="w-full h-28 overflow-hidden bg-black/20">
          <img
            src={p.imageUrl}
            alt={p.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-white text-sm leading-tight">{p.title}</h3>
          <span className="shrink-0 text-[10px] text-emerald-500 px-1.5 py-0.5 rounded-full border border-emerald-900/60 bg-emerald-950/40">
            {CATEGORY_LABELS[p.category] ?? p.category}
          </span>
        </div>

        <p className="text-emerald-400 text-xs leading-relaxed line-clamp-2">{p.description}</p>

        <div className="flex items-center gap-1.5 text-emerald-600 text-[10px]">
          <Phone className="w-3 h-3" />
          <span className="truncate">{p.contactInfo}</span>
        </div>

        {p.submittedBy && (
          <div className="flex items-center gap-1.5 text-emerald-700 text-[10px]">
            <Tag className="w-3 h-3" />
            <span>By {p.submittedBy}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-emerald-800 text-[10px]">
          <Calendar className="w-3 h-3" />
          <span>{timeAgo(p.createdAt)}</span>
          {featured && p.promotionExpiry && (
            <span className="ml-auto text-amber-600">
              Until {new Date(p.promotionExpiry).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex gap-2 pt-0.5">
          {hasLink && (
            <button
              onClick={() => openUrl(p.productLink!)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-emerald-700/50 bg-emerald-800/30 text-emerald-300 text-xs font-semibold active:scale-[0.97] transition-transform"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Visit
            </button>
          )}
          <button
            onClick={handleShare}
            className={`${hasLink ? "px-4" : "flex-1"} flex items-center justify-center gap-1.5 py-1.5 rounded-xl border border-emerald-900/50 bg-emerald-950/40 text-emerald-400 text-xs font-semibold active:scale-[0.97] transition-transform`}
          >
            <Share2 className="w-3.5 h-3.5" />
            {!hasLink && "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Marketplace() {
  const [featured, setFeatured] = useState<NoorProduct[]>([]);
  const [all, setAll] = useState<NoorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"browse" | "featured">("browse");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([noorApi.getFeaturedProducts(), noorApi.getProducts()])
      .then(([f, a]) => {
        if (!alive) return;
        setFeatured(f.products);
        setAll(a.products);
      })
      .catch(console.warn)
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const nonFeatured = all;

  return (
    <div
      className="min-h-screen pb-28 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Marketplace</h1>
        <p className="text-emerald-700 text-sm mt-0.5">Discover Islamic products</p>
      </div>

      <div className="px-4 flex gap-2 mb-5">
        {(["browse", "featured"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              tab === t
                ? "bg-emerald-700 text-white"
                : "text-emerald-600 border border-emerald-900/50 bg-emerald-950/30"
            }`}
          >
            {t === "browse" ? "All Products" : "⭐ Featured"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      ) : tab === "featured" ? (
        <div className="px-4 space-y-2.5">
          {featured.length === 0 ? (
            <div className="text-center py-16 text-emerald-700">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No featured products yet.</p>
            </div>
          ) : (
            featured.map((p) => <ProductCard key={p.id} p={p} featured />)
          )}
        </div>
      ) : (
        <div className="px-4 space-y-2.5">
          {featured.length > 0 && (
            <>
              <p className="text-amber-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500" /> Featured
              </p>
              {featured.map((p) => <ProductCard key={p.id} p={p} featured />)}
              {nonFeatured.length > 0 && (
                <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider pt-2">
                  All Products
                </p>
              )}
            </>
          )}
          {nonFeatured.length === 0 && featured.length === 0 ? (
            <div className="text-center py-16 text-emerald-700">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No products available yet.</p>
            </div>
          ) : (
            nonFeatured.map((p) => <ProductCard key={p.id} p={p} />)
          )}
        </div>
      )}
    </div>
  );
}
