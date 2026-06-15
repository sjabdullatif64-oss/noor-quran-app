import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { noorApi } from "@/lib/noor-api";
import { getDeviceId, getCachedUser, ensureRegistered } from "@/lib/user";
import { ArrowLeft, Loader2, Coins, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "tasbeeh", label: "Tasbeeh" },
  { value: "prayer_mat", label: "Prayer Mat" },
  { value: "books", label: "Islamic Books" },
  { value: "attar", label: "Attar / Perfume" },
  { value: "courses", label: "Islamic Courses" },
  { value: "other", label: "Other Islamic" },
];

const PROMOTION_PLANS = [
  { value: "none", label: "No Promotion", cost: 0, desc: "Free listing (admin approval required)" },
  { value: "1day", label: "1 Day Featured", cost: 100, desc: "24 hours at the top" },
  { value: "7day", label: "7 Days Featured", cost: 250, desc: "7 days at the top" },
] as const;

type PromotionType = "none" | "1day" | "7day";

export function SubmitProduct() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [category, setCategory] = useState<string>("tasbeeh");
  const [promotionType, setPromotionType] = useState<PromotionType>("none");
  const [submitting, setSubmitting] = useState(false);
  const [coins, setCoins] = useState(0);
  const [registering, setRegistering] = useState(true);

  useEffect(() => {
    setRegistering(true);
    ensureRegistered()
      .then((user) => {
        if (user) setCoins(user.coinsBalance);
        else {
          const cached = getCachedUser();
          if (cached) setCoins(cached.coinsBalance);
        }
      })
      .finally(() => setRegistering(false));
  }, []);

  const selectedPlan = PROMOTION_PLANS.find((p) => p.value === promotionType)!;
  const canAfford = coins >= selectedPlan.cost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !contactInfo.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    if (selectedPlan.cost > 0 && !canAfford) {
      toast({
        title: "Insufficient Coins",
        description: `You need ${selectedPlan.cost} coins. You have ${coins}.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      await noorApi.submitProduct({
        deviceId,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl.trim() || undefined,
        contactInfo: contactInfo.trim(),
        category,
        promotionType,
        submittedBy: submittedBy.trim() || undefined,
      });
      toast({
        title: "Product Submitted!",
        description: "Your product is pending admin approval. You will see it appear once approved.",
      });
      navigate("/marketplace");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast({ title: "Submission Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen pb-28 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/marketplace")}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-900/50 text-emerald-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-serif font-bold text-emerald-300">Post a Product</h1>
          <p className="text-emerald-700 text-xs">Islamic Marketplace</p>
        </div>
        <div className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full bg-amber-900/30 border border-amber-800/40">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold text-sm">{registering ? "..." : coins}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-5">
        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Product Title *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Premium Noor Tasbeeh"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product, materials, features..."
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-white placeholder:text-emerald-800 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Image URL</label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/product.jpg"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
            type="url"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-32 object-cover rounded-xl border border-emerald-900/40 mt-2"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Contact Info *</label>
          <Input
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="WhatsApp number, email, or website"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Your Name (optional)</label>
          <Input
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="Your name or shop name"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
          />
        </div>

        <div className="space-y-2">
          <label className="text-emerald-400 text-sm font-medium">Category *</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                  category === c.value
                    ? "bg-emerald-700 border-emerald-600 text-white"
                    : "bg-emerald-950/30 border-emerald-900/50 text-emerald-500"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-emerald-400 text-sm font-medium flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" /> Promotion Plan
          </label>
          <div className="space-y-2">
            {PROMOTION_PLANS.map((plan) => {
              const afford = coins >= plan.cost;
              return (
                <button
                  key={plan.value}
                  type="button"
                  onClick={() => setPromotionType(plan.value)}
                  disabled={plan.cost > 0 && !afford}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    promotionType === plan.value
                      ? plan.cost > 0
                        ? "bg-amber-900/30 border-amber-700/60 text-white"
                        : "bg-emerald-800/30 border-emerald-700/60 text-white"
                      : "bg-emerald-950/30 border-emerald-900/50 text-emerald-500"
                  } ${plan.cost > 0 && !afford ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div>
                    <p className="font-semibold text-sm">{plan.label}</p>
                    <p className="text-xs opacity-70 mt-0.5">{plan.desc}</p>
                  </div>
                  {plan.cost > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900/40 border border-amber-800/40 shrink-0">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 font-bold text-sm">{plan.cost}</span>
                    </div>
                  )}
                  {plan.cost === 0 && (
                    <span className="text-emerald-500 text-xs">Free</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="rounded-xl p-3 border border-emerald-900/40 text-emerald-600 text-xs leading-relaxed"
          style={{ background: "rgba(10,30,18,0.5)" }}
        >
          <p className="font-semibold text-emerald-500 mb-1">ℹ️ Important</p>
          <p>• Your product will be reviewed by admin before going public.</p>
          <p>• Promotion coins are deducted immediately.</p>
          <p>• Promotion timer starts only after admin approval.</p>
          <p>• Coins are refunded if your product is rejected.</p>
        </div>

        <Button
          type="submit"
          disabled={submitting || registering}
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-base"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
          ) : (
            "Submit Product"
          )}
        </Button>
      </form>
    </div>
  );
}
