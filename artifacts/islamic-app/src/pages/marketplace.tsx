import { useState, useEffect } from "react";
import { Link } from "wouter";
import { noorApi, type NoorProduct } from "@/lib/noor-api";
import { openUrl } from "@/lib/capacitor";
import { Star, Tag, Phone, Calendar, Loader2, Plus, Sparkles, Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const hasLink = !!p.productLink?.trim();

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all ${
        featured
          ? "border-amber-600/40"
          : "border-emerald-900/50"
      }`}
      style={{
        background: featured
          ? "linear-gradient(135deg, rgba(120,80,0,0.25) 0%, rgba(50,30,0,0.25) 100%)"
          : "rgba(10,30,18,0.7)",
      }}
    >
      {featured && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600/80 text-amber-100 text-xs font-bold">
          <Star className="w-3 h-3 fill-amber-200" /> Featured
        </div>
      )}

      {p.imageUrl && (
        <div className="w-full h-44 overflow-hidden bg-black/20">
          <img
            src={p.imageUrl}
            alt={p.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-white text-base leading-tight">{p.title}</h3>
          <span className="shrink-0 text-xs text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-900/60 bg-emerald-950/40">
            {CATEGORY_LABELS[p.category] ?? p.category}
          </span>
        </div>

        <p className="text-emerald-400 text-sm leading-relaxed line-clamp-3">{p.description}</p>

        <div className="flex items-center gap-2 text-emerald-600 text-xs">
          <Phone className="w-3.5 h-3.5" />
          <span className="truncate">{p.contactInfo}</span>
        </div>

        {p.submittedBy && (
          <div className="flex items-center gap-2 text-emerald-700 text-xs">
            <Tag className="w-3.5 h-3.5" />
            <span>By {p.submittedBy}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-emerald-800 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          <span>{timeAgo(p.createdAt)}</span>
          {featured && p.promotionExpiry && (
            <span className="ml-auto text-amber-600">
              Featured until {new Date(p.promotionExpiry).toLocaleDateString()}
            </span>
          )}
        </div>

        {hasLink && (
          <button
            onClick={() => openUrl(p.productLink!)}
            className="mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-emerald-700/50 bg-emerald-800/30 text-emerald-300 text-sm font-semibold active:scale-[0.97] transition-transform"
          >
            <ExternalLink className="w-4 h-4" />
            Visit Product
          </button>
        )}
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
      <div className="px-4 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Marketplace</h1>
          <p className="text-emerald-700 text-sm mt-0.5">Discover Islamic products</p>
        </div>
        <Link href="/submit-product">
          <Button size="sm" className="bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl gap-1">
            <Plus className="w-4 h-4" /> Post
          </Button>
        </Link>
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
        <div className="px-4 space-y-4">
          {featured.length === 0 ? (
            <div className="text-center py-16 text-emerald-700">
              <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No featured products yet.</p>
              <p className="text-xs mt-1">Promote your product to appear here!</p>
            </div>
          ) : (
            featured.map((p) => <ProductCard key={p.id} p={p} featured />)
          )}
        </div>
      ) : (
        <div className="px-4 space-y-4">
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
              <p>No products yet.</p>
              <p className="text-xs mt-1">Be the first to post an Islamic product!</p>
            </div>
          ) : (
            nonFeatured.map((p) => <ProductCard key={p.id} p={p} />)
          )}
        </div>
      )}
    </div>
  );
}
