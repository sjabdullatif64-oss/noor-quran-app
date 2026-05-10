import { useState, useRef, useCallback } from "react";
import { ChevronLeft, Gift, Share2, Download, X, Check } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface GiftCard {
  id: string;
  title: string;
  arabic: string;
  subtitle: string;
  gradientFrom: string;
  gradientTo: string;
  border: string;
  accentText: string;
  hexAccent: string;
  hexBg1: string;
  hexBg2: string;
}

const CARDS: GiftCard[] = [
  {
    id: "eid",
    title: "Eid Mubarak",
    arabic: "عِيدٌ مُبَارَكٌ",
    subtitle: "May Allah accept our prayers",
    gradientFrom: "from-amber-900/40",
    gradientTo: "to-amber-800/20",
    border: "border-amber-700/30",
    accentText: "text-amber-300",
    hexAccent: "#fcd34d",
    hexBg1: "#451a03",
    hexBg2: "#78350f",
  },
  {
    id: "ramadan",
    title: "Ramadan Kareem",
    arabic: "رَمَضَانُ كَرِيمٌ",
    subtitle: "Blessed month of mercy & forgiveness",
    gradientFrom: "from-emerald-900/40",
    gradientTo: "to-emerald-800/20",
    border: "border-emerald-700/30",
    accentText: "text-emerald-300",
    hexAccent: "#6ee7b7",
    hexBg1: "#052e16",
    hexBg2: "#064e3b",
  },
  {
    id: "jumma",
    title: "Jumma Mubarak",
    arabic: "جُمُعَةٌ مُبَارَكَةٌ",
    subtitle: "The best day of the week",
    gradientFrom: "from-teal-900/40",
    gradientTo: "to-teal-800/20",
    border: "border-teal-700/30",
    accentText: "text-teal-300",
    hexAccent: "#5eead4",
    hexBg1: "#042f2e",
    hexBg2: "#065f46",
  },
  {
    id: "hajj",
    title: "Hajj Mabroor",
    arabic: "حَجٌّ مَبْرُورٌ",
    subtitle: "May your Hajj be accepted",
    gradientFrom: "from-sky-900/40",
    gradientTo: "to-sky-800/20",
    border: "border-sky-700/30",
    accentText: "text-sky-300",
    hexAccent: "#7dd3fc",
    hexBg1: "#082f49",
    hexBg2: "#0c4a6e",
  },
  {
    id: "birthday",
    title: "Barakallah Feek",
    arabic: "بَارَكَ اللّٰهُ فِيكَ",
    subtitle: "May Allah bless you",
    gradientFrom: "from-purple-900/40",
    gradientTo: "to-purple-800/20",
    border: "border-purple-700/30",
    accentText: "text-purple-300",
    hexAccent: "#c4b5fd",
    hexBg1: "#2e1065",
    hexBg2: "#4c1d95",
  },
  {
    id: "mashaallah",
    title: "Masha Allah",
    arabic: "مَاشَاءَ اللّٰهُ",
    subtitle: "Whatever Allah wills",
    gradientFrom: "from-rose-900/40",
    gradientTo: "to-rose-800/20",
    border: "border-rose-700/30",
    accentText: "text-rose-300",
    hexAccent: "#fda4af",
    hexBg1: "#4c0519",
    hexBg2: "#881337",
  },
];

export function IslamicGifts() {
  const [selected, setSelected] = useState<GiftCard | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  const { toast } = useToast();

  const generateCanvas = useCallback(async (card: GiftCard): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
    bg.addColorStop(0, card.hexBg1);
    bg.addColorStop(1, card.hexBg2);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1080, 1080);

    // Decorative rings
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = card.hexAccent;
    ctx.lineWidth = 3;
    for (const r of [460, 400, 340]) {
      ctx.beginPath();
      ctx.arc(540, 540, r, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.restore();

    // Corner dots
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = card.hexAccent;
    for (const [x, y] of [[60, 60], [1020, 60], [60, 1020], [1020, 1020]] as [number, number][]) {
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();

    await document.fonts.ready;

    // Arabic text
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = card.hexAccent;
    ctx.font = "bold 100px serif";
    ctx.fillText(card.arabic, 540, 440);
    ctx.restore();

    // Divider
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = card.hexAccent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(240, 540);
    ctx.lineTo(840, 540);
    ctx.stroke();
    ctx.restore();

    // Title
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px serif";
    ctx.fillText(card.title, 540, 620);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = card.hexAccent;
    ctx.font = "32px serif";
    ctx.fillText(card.subtitle, 540, 720);
    ctx.restore();

    // Noor watermark
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = card.hexAccent;
    ctx.globalAlpha = 0.3;
    ctx.font = "24px serif";
    ctx.fillText("Noor Quran", 540, 960);
    ctx.restore();

    return canvas;
  }, []);

  const handleDownload = async (card: GiftCard) => {
    setDownloading(true);
    try {
      const canvas = await generateCanvas(card);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${card.title.replace(/\s+/g, "-")}-NoorQuran.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Downloaded!", description: `${card.title} card saved to your device.` });
      }, "image/png");
    } catch {
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async (card: GiftCard) => {
    const text = `${card.arabic}\n${card.title}\n${card.subtitle}\n\n— Shared via Noor Quran`;
    if (navigator.share) {
      try {
        await navigator.share({ title: card.title, text });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      toast({ title: "Copied!", description: "Card text copied to clipboard." });
    }
  };

  return (
    <div
      className="min-h-screen pb-28 md:pb-10 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <Link href="/more" className="text-emerald-600 hover:text-emerald-400 transition-colors" data-testid="link-back-more">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Islamic Gifts</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Tap any card to preview, share, or download</p>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3">
        {CARDS.map((card) => (
          <button
            key={card.id}
            onClick={() => setSelected(card)}
            className={`bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} border ${card.border} rounded-2xl p-5 flex flex-col items-center gap-3 text-center active:scale-95 transition-all hover:scale-[1.02]`}
            data-testid={`gift-card-${card.id}`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${card.accentText}`}
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{card.title}</p>
              <p dir="rtl" className={`font-arabic text-lg mt-1 ${card.accentText}`}>{card.arabic}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Fullscreen modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
          style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelected(null)}
        >
          {/* Card preview */}
          <div
            className={`w-full max-w-sm rounded-3xl p-10 flex flex-col items-center gap-6 text-center border animate-in zoom-in-95 duration-300`}
            style={{
              background: `linear-gradient(135deg, ${selected.hexBg1}, ${selected.hexBg2})`,
              borderColor: `${selected.hexAccent}30`,
              boxShadow: `0 0 60px ${selected.hexAccent}20, 0 0 120px ${selected.hexAccent}10`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative ring */}
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{ border: `1px solid ${selected.hexAccent}30`, background: `${selected.hexAccent}10` }}
            >
              <Gift style={{ color: selected.hexAccent }} className="w-10 h-10" />
            </div>

            <div className="space-y-3">
              <p dir="rtl" className="font-arabic text-5xl leading-loose" style={{ color: selected.hexAccent }}>
                {selected.arabic}
              </p>
              <div className="w-16 h-px mx-auto opacity-30" style={{ background: selected.hexAccent }} />
              <p className="text-white font-bold text-2xl font-serif">{selected.title}</p>
              <p className="text-sm opacity-60" style={{ color: selected.hexAccent }}>{selected.subtitle}</p>
            </div>

            <p className="text-xs opacity-20" style={{ color: selected.hexAccent }}>Noor Quran</p>

            {/* Action buttons */}
            <div className="flex gap-3 w-full">
              <button
                onClick={() => handleShare(selected)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{
                  background: `${selected.hexAccent}18`,
                  border: `1px solid ${selected.hexAccent}30`,
                  color: selected.hexAccent,
                }}
                data-testid={`button-share-gift-${selected.id}`}
              >
                {shared ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                {shared ? "Shared!" : "Share"}
              </button>
              <button
                onClick={() => handleDownload(selected)}
                disabled={downloading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
                style={{
                  background: selected.hexAccent,
                  color: selected.hexBg1,
                  fontWeight: "bold",
                }}
                data-testid={`button-download-gift-${selected.id}`}
              >
                <Download className="w-4 h-4" />
                {downloading ? "Saving…" : "Save PNG"}
              </button>
            </div>
          </div>

          {/* Close */}
          <button
            onClick={() => setSelected(null)}
            className="mt-6 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            data-testid="button-close-gift-modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
