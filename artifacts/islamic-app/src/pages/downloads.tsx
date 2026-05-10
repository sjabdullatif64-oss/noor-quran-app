import { ChevronLeft, Download, Wifi, HardDrive } from "lucide-react";
import { Link } from "wouter";

const PACKS = [
  { id: "fatiha", name: "Al-Fatiha", size: "1.2 MB", desc: "Full audio + text" },
  { id: "last-10", name: "Last 10 Surahs", size: "8.4 MB", desc: "Juz Amma audio" },
  { id: "yaseen", name: "Surah Yaseen", size: "3.1 MB", desc: "Full audio + text" },
  { id: "al-mulk", name: "Surah Al-Mulk", size: "2.6 MB", desc: "Full audio + text" },
];

export function Downloads() {
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
          <h1 className="text-2xl font-serif font-bold text-emerald-300">Downloads</h1>
          <p className="text-emerald-700 text-xs mt-0.5">Offline content packs</p>
        </div>
      </div>

      {/* Storage bar */}
      <div className="mx-4 mb-4 rounded-2xl p-4 border border-emerald-900/40" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <HardDrive className="w-4 h-4" />
            <span>Local Storage</span>
          </div>
          <span className="text-emerald-600 text-xs">0 MB used</span>
        </div>
        <div className="h-2 bg-emerald-900/50 rounded-full overflow-hidden">
          <div className="h-full w-0 bg-emerald-500 rounded-full" />
        </div>
      </div>

      {/* Packs */}
      <div className="px-4 space-y-3">
        <p className="text-emerald-500 text-xs uppercase tracking-wider font-medium px-1">Available Packs</p>
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className="flex items-center gap-4 p-4 rounded-2xl border border-emerald-900/40"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="w-10 h-10 rounded-xl bg-teal-900/30 border border-teal-800/30 flex items-center justify-center text-teal-400 shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">{pack.name}</p>
              <p className="text-emerald-700 text-xs">{pack.desc} · {pack.size}</p>
            </div>
            <button
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-teal-300 border border-teal-800/40 hover:border-teal-600 transition-colors"
              style={{ background: "rgba(45,212,191,0.08)" }}
              data-testid={`button-download-${pack.id}`}
            >
              <Download className="w-3 h-3" />
              Save
            </button>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-4 rounded-2xl p-4 border border-emerald-900/30 text-center"
        style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="text-emerald-800 text-sm">Offline download coming in next update</p>
      </div>
    </div>
  );
}
