import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { noorApi } from "@/lib/noor-api";
import { getDeviceId, refreshProfile } from "@/lib/user";
import { ArrowLeft, Loader2, Coins, Star, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "tasbeeh",    label: "Tasbeeh" },
  { value: "prayer_mat", label: "Prayer Mat" },
  { value: "books",      label: "Islamic Books" },
  { value: "attar",      label: "Attar / Perfume" },
  { value: "courses",    label: "Islamic Courses" },
  { value: "other",      label: "Other Islamic" },
];

const PROMOTION_PLANS = [
  { value: "none", label: "No Promotion",      cost: 0,   desc: "Free listing (admin approval required)" },
  { value: "1day", label: "1 Day Featured",    cost: 100, desc: "24 hours at the top — after admin approval" },
  { value: "7day", label: "7 Days Featured",   cost: 250, desc: "7 days at the top — after admin approval" },
] as const;

type PromotionType = "none" | "1day" | "7day";

function resizeImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
    img.src = objectUrl;
  });
}

export function SubmitProduct() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [imageUrl,      setImageUrl]       = useState("");
  const [imageIsGallery, setImageIsGallery] = useState(false);
  const [contactInfo,   setContactInfo]   = useState("");
  const [submittedBy,   setSubmittedBy]   = useState("");
  const [productLink,   setProductLink]   = useState("");
  const [category,      setCategory]      = useState<string>("tasbeeh");
  const [promotionType, setPromotionType] = useState<PromotionType>("none");
  const [submitting,    setSubmitting]    = useState(false);
  const [coins,         setCoins]         = useState(0);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    refreshProfile()
      .then((user) => { if (user) setCoins(user.coinsBalance); })
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = PROMOTION_PLANS.find((p) => p.value === promotionType)!;
  const canAfford    = coins >= selectedPlan.cost;

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageToBase64(file);
      setImageUrl(base64);
      setImageIsGallery(true);
    } catch {
      toast({ title: "Could not load image", variant: "destructive" });
    }
    e.target.value = "";
  }

  function clearImage() {
    setImageUrl("");
    setImageIsGallery(false);
  }

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
        title:        title.trim(),
        description:  description.trim(),
        imageUrl:     imageUrl || undefined,
        contactInfo:  contactInfo.trim(),
        productLink:  productLink.trim() || undefined,
        category,
        promotionType,
        submittedBy:  submittedBy.trim() || undefined,
      });
      toast({
        title: "Product Submitted!",
        description: "Pending admin approval. It will appear in the marketplace once approved.",
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
          <span className="text-amber-300 font-bold text-sm">{loading ? "…" : coins}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-5">

        {/* Title */}
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

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your product, materials, features…"
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-white placeholder:text-emerald-800 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        {/* Image — gallery picker or URL */}
        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Product Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageFile}
            className="hidden"
          />
          {!imageIsGallery && (
            <div className="flex gap-2">
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL — or pick from gallery"
                className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800 flex-1 min-w-0"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800/40 border border-emerald-700/50 text-emerald-400 text-sm font-medium whitespace-nowrap active:scale-95 transition-transform shrink-0"
              >
                <ImagePlus className="w-4 h-4" />
                Gallery
              </button>
            </div>
          )}
          {imageUrl && (
            <div className="relative mt-2">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-full h-40 object-cover rounded-xl border border-emerald-900/40"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-red-900/70 border border-red-800/50 text-red-300 active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {imageIsGallery && (
                <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/70 text-emerald-400 border border-emerald-800/40">
                  From gallery
                </span>
              )}
            </div>
          )}
          {imageIsGallery && !imageUrl && null}
          {imageIsGallery && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-emerald-600 underline"
            >
              Pick a different image
            </button>
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Contact Info *</label>
          <Input
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="WhatsApp number, email, or website"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
          />
        </div>

        {/* Product Link */}
        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Product Link <span className="text-emerald-700">(optional)</span></label>
          <Input
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            placeholder="https://your-shop.com/product"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
            type="url"
          />
        </div>

        {/* Seller Name */}
        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Your Name <span className="text-emerald-700">(optional)</span></label>
          <Input
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="Your name or shop name"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
          />
        </div>

        {/* Category */}
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

        {/* Promotion Plans */}
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
                  {plan.cost > 0 ? (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-900/40 border border-amber-800/40 shrink-0">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300 font-bold text-sm">{plan.cost}</span>
                    </div>
                  ) : (
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
          <p>• Product stays pending until admin approves it.</p>
          <p>• Promotion coins are deducted at submission.</p>
          <p>• Promotion timer starts only after admin approval.</p>
          <p>• Coins are refunded if your product is rejected.</p>
        </div>

        <Button
          type="submit"
          disabled={submitting || loading}
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-base"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting…</>
          ) : selectedPlan.cost > 0 ? (
            `Submit & Spend ${selectedPlan.cost} Coins`
          ) : (
            "Submit Product"
          )}
        </Button>
      </form>
    </div>
  );
}
