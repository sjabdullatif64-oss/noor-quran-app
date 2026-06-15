import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { noorApi, type NoorUser, type CoinTransaction, type ProfileStats } from "@/lib/noor-api";
import { getDeviceId, ensureRegistered, doDailyCheckin } from "@/lib/user";
import {
  Coins, Users, TrendingUp, Package, Clock, Star, XCircle,
  Loader2, Copy, CheckCheck, Zap, Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function StatCard({
  icon, label, value, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 border border-emerald-900/40 flex flex-col gap-1"
      style={{ background: "rgba(10,30,18,0.6)" }}
    >
      <div className={`${accent} mb-1`}>{icon}</div>
      <p className="text-white font-bold text-2xl">{value}</p>
      <p className="text-emerald-600 text-xs">{label}</p>
    </div>
  );
}

function TxRow({ tx }: { tx: CoinTransaction }) {
  const isEarn = tx.amount > 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-emerald-900/30 last:border-0">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isEarn ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/30 text-red-400"
        }`}
      >
        {isEarn ? <TrendingUp className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm leading-tight line-clamp-1">{tx.reason}</p>
        <p className="text-emerald-700 text-xs mt-0.5">
          {new Date(tx.createdAt).toLocaleDateString()}
        </p>
      </div>
      <span className={`font-bold text-sm shrink-0 ${isEarn ? "text-emerald-400" : "text-red-400"}`}>
        {isEarn ? "+" : ""}{tx.amount}
      </span>
    </div>
  );
}

export function Profile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [user, setUser] = useState<NoorUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [txs, setTxs] = useState<CoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const deviceId = getDeviceId();
      const u = await ensureRegistered();
      try {
        const profile = await noorApi.getProfile(deviceId);
        if (alive) {
          setUser(profile.user);
          setStats(profile.stats);
          setTxs(profile.recentTransactions);
        }
      } catch {
        if (alive && u) setUser(u);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function handleCheckin() {
    setCheckingIn(true);
    const result = await doDailyCheckin();
    if (result.awarded) {
      toast({ title: `+${result.amount ?? 5} Coins!`, description: "Daily check-in reward 🎉" });
      setUser((u) => u ? { ...u, coinsBalance: result.coins } : u);
    } else {
      toast({ title: "Already checked in today", description: result.message ?? "Come back tomorrow!" });
    }
    setCheckingIn(false);
  }

  function getReferralLink(userId: string) {
    return `${window.location.origin}/?ref=${userId}`;
  }

  function copyReferral() {
    if (!user) return;
    const link = getReferralLink(user.id);
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Referral link copied!", description: "Share it to earn 100 coins per referral." });
    });
  }

  async function shareReferral() {
    if (!user) return;
    const link = getReferralLink(user.id);
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Noor Quran",
          text: "Read the Quran with beautiful translations & earn rewards. Join using my referral link!",
          url: link,
        });
      } catch {
        // user cancelled share
      }
    } else {
      copyReferral();
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

  return (
    <div
      className="min-h-screen pb-28 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(150deg, #071a0e 0%, #0a1f12 50%, #061610 100%)" }}
    >
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-serif font-bold text-emerald-300">My Profile</h1>
        <p className="text-emerald-700 text-sm mt-0.5">Coins, referrals & products</p>
      </div>

      {user && (
        <>
          {/* Coins Balance Hero */}
          <div
            className="mx-4 mb-5 rounded-2xl p-5 border border-amber-700/40"
            style={{ background: "linear-gradient(135deg, rgba(120,80,0,0.3) 0%, rgba(60,30,0,0.3) 100%)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-500 text-sm font-semibold">Noor Coins Balance</p>
                <div className="flex items-center gap-2 mt-1">
                  <Coins className="w-6 h-6 text-amber-400" />
                  <span className="text-4xl font-bold text-amber-300">{user.coinsBalance}</span>
                </div>
                <p className="text-amber-700 text-xs mt-1">Total earned: {user.totalCoinsEarned}</p>
              </div>
              <Button
                size="sm"
                onClick={handleCheckin}
                disabled={checkingIn}
                className="bg-amber-700 hover:bg-amber-600 text-white rounded-xl px-4"
              >
                {checkingIn
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Zap className="w-4 h-4 mr-1" /> Check In</>}
              </Button>
            </div>
          </div>

          {/* Referral Link */}
          <div
            className="mx-4 mb-5 rounded-2xl p-4 border border-emerald-800/40"
            style={{ background: "rgba(10,30,18,0.6)" }}
          >
            <p className="text-emerald-400 text-sm font-semibold mb-1">Your Referral Link</p>
            <p className="text-emerald-700 text-xs mb-3">
              Earn <span className="text-amber-400 font-bold">100 coins</span> for each friend — they get{" "}
              <span className="text-amber-400 font-bold">20 coins</span> too!
            </p>
            <div
              className="font-mono text-xs text-emerald-300 bg-emerald-950/60 px-3 py-2 rounded-xl border border-emerald-900/50 mb-3 break-all"
            >
              {getReferralLink(user.id)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyReferral}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-800/40 border border-emerald-800/50 text-emerald-300 text-sm font-medium"
              >
                {copied
                  ? <><CheckCheck className="w-4 h-4 text-emerald-300" /> Copied!</>
                  : <><Copy className="w-4 h-4" /> Copy Link</>}
              </button>
              <button
                onClick={shareReferral}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-700/40 border border-emerald-700/50 text-emerald-200 text-sm font-medium"
              >
                <Share2 className="w-4 h-4" /> Share Link
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="px-4 grid grid-cols-2 gap-3 mb-5">
              <StatCard
                icon={<Users className="w-5 h-5" />}
                label="Total Referrals"
                value={user.totalReferrals}
                accent="text-emerald-400"
              />
              <StatCard
                icon={<Package className="w-5 h-5" />}
                label="Products Posted"
                value={stats.totalProducts}
                accent="text-sky-400"
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                label="Pending Products"
                value={stats.pendingProducts}
                accent="text-yellow-400"
              />
              <StatCard
                icon={<Star className="w-5 h-5" />}
                label="Active Promotions"
                value={stats.activePromotions}
                accent="text-amber-400"
              />
              <StatCard
                icon={<XCircle className="w-5 h-5" />}
                label="Rejected Products"
                value={stats.rejectedProducts}
                accent="text-red-400"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Total Coins Earned"
                value={user.totalCoinsEarned}
                accent="text-amber-300"
              />
            </div>
          )}

          {/* My Products CTA */}
          <div className="px-4 mb-5">
            <button
              onClick={() => navigate("/marketplace")}
              className="w-full flex items-center justify-between p-4 rounded-2xl border border-emerald-800/40"
              style={{ background: "rgba(10,30,18,0.6)" }}
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-emerald-400" />
                <span className="text-white font-semibold">View Marketplace</span>
              </div>
              <span className="text-emerald-600 text-sm">→</span>
            </button>
          </div>

          {/* Recent Transactions */}
          {txs.length > 0 && (
            <div
              className="mx-4 rounded-2xl border border-emerald-900/40 overflow-hidden"
              style={{ background: "rgba(10,30,18,0.6)" }}
            >
              <p className="text-emerald-400 text-sm font-semibold px-4 py-3 border-b border-emerald-900/30">
                Recent Coin Activity
              </p>
              <div className="px-4">
                {txs.slice(0, 10).map((tx) => <TxRow key={tx.id} tx={tx} />)}
              </div>
            </div>
          )}

          {/* Coin earning guide */}
          <div
            className="mx-4 mt-5 rounded-2xl border border-emerald-900/40 p-4 space-y-2"
            style={{ background: "rgba(10,30,18,0.5)" }}
          >
            <p className="text-emerald-400 text-sm font-semibold">How to Earn Coins</p>
            <div className="space-y-1.5 text-xs text-emerald-600">
              <div className="flex justify-between"><span>🌙 New account bonus</span><span className="text-amber-400">+20 coins</span></div>
              <div className="flex justify-between"><span>📅 Daily check-in</span><span className="text-amber-400">+5 coins/day</span></div>
              <div className="flex justify-between"><span>🎙 Listen to ayah (audio)</span><span className="text-amber-400">+1 coin/ayah</span></div>
              <div className="flex justify-between"><span>👥 Refer a friend</span><span className="text-amber-400">+100 coins</span></div>
              <div className="flex justify-between"><span>🤝 Join via referral link</span><span className="text-amber-400">+20 coins</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
