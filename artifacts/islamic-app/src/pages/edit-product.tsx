import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { noorApi } from "@/lib/noor-api";
import { getDeviceId } from "@/lib/user";
import { ArrowLeft, Loader2, ImagePlus, X, AlertCircle } from "lucide-react";
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

export function EditProduct({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { id } = params;

  const [loadError, setLoadError]       = useState(false);
  const [loading,   setLoading]         = useState(true);
  const [submitting, setSubmitting]     = useState(false);

  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [imageUrl,       setImageUrl]       = useState("");
  const [imageIsGallery, setImageIsGallery] = useState(false);
  const [contactInfo,    setContactInfo]    = useState("");
  const [productLink,    setProductLink]    = useState("");
  const [category,       setCategory]       = useState("tasbeeh");

  useEffect(() => {
    setLoading(true);
    noorApi.getProduct(id)
      .then(({ product: p }) => {
        setTitle(p.title);
        setDescription(p.description);
        setImageUrl(p.imageUrl ?? "");
        setContactInfo(p.contactInfo);
        setProductLink(p.productLink ?? "");
        setCategory(p.category);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

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
    setSubmitting(true);
    try {
      const deviceId = getDeviceId();
      await noorApi.editProduct(id, deviceId, {
        title:       title.trim(),
        description: description.trim(),
        imageUrl:    imageUrl || undefined,
        contactInfo: contactInfo.trim(),
        productLink: productLink.trim() || undefined,
        category,
      });
      toast({
        title: "Product updated!",
        description: "Pending admin re-approval before it shows publicly.",
      });
      navigate("/profile");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast({ title: "Edit Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
      >
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-8 text-center"
        style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
      >
        <AlertCircle className="w-12 h-12 text-red-600" />
        <p className="text-red-400 font-semibold">Product not found</p>
        <button
          onClick={() => navigate("/profile")}
          className="px-5 py-2.5 rounded-xl bg-emerald-800/40 border border-emerald-800/50 text-emerald-400 text-sm font-medium"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-emerald-900/50 text-emerald-400"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-serif font-bold text-emerald-300">Edit Product</h1>
          <p className="text-emerald-700 text-xs">Islamic Marketplace</p>
        </div>
      </div>

      <div className="mx-4 mb-5 rounded-xl p-3 bg-yellow-900/20 border border-yellow-800/40 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-yellow-500/90 text-xs leading-relaxed">
          After editing, your product goes back to <strong>Pending</strong> and won't show publicly until admin approves it again.
        </p>
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
            placeholder="Describe your product…"
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-white placeholder:text-emerald-800 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-emerald-400 text-sm font-medium">Product Image</label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
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
                <ImagePlus className="w-4 h-4" /> Gallery
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
          {imageIsGallery && (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-emerald-600 underline">
              Pick a different image
            </button>
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
          <label className="text-emerald-400 text-sm font-medium">
            Product Link <span className="text-emerald-700">(optional)</span>
          </label>
          <Input
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            placeholder="https://your-shop.com/product"
            className="bg-emerald-950/40 border-emerald-800/50 text-white placeholder:text-emerald-800"
            type="url"
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

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl text-base disabled:opacity-50"
        >
          {submitting
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving…</>
            : "Save & Resubmit for Approval"}
        </Button>
      </form>
    </div>
  );
}
