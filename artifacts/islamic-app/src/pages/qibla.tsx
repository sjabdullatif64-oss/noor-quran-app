import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, RefreshCw, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAKKAH = { lat: 21.4225, lng: 39.8262 };
const SMOOTHING = 0.12;          // lower = smoother but slower (0.05–0.2)
const MIN_DELTA_DEG = 0.8;       // skip state update if change < this
const STABILITY_WINDOW = 20;     // readings to track for stability check
const STABILITY_THRESHOLD = 12;  // max variance (°) to be considered "stable"

// ─── Maths helpers ────────────────────────────────────────────────────────────
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

function shortestAngleDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function calcQibla(lat: number, lng: number): number {
  const φ1 = toRad(lat), φ2 = toRad(MAKKAH.lat);
  const Δλ = toRad(MAKKAH.lng - lng);
  const θ = Math.atan2(
    Math.sin(Δλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  );
  return (toDeg(θ) + 360) % 360;
}

function calcDistance(lat: number, lng: number): number {
  const R = 6371;
  const dLat = toRad(MAKKAH.lat - lat);
  const dLng = toRad(MAKKAH.lng - lng);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat)) * Math.cos(toRad(MAKKAH.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = "idle" | "loading" | "granted" | "error";
type CompassState = "unavailable" | "calibrating" | "stable";

// ─── Component ────────────────────────────────────────────────────────────────
export function Qibla() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  // Compass display state — controlled rotation that never wraps
  const [needleRotation, setNeedleRotation] = useState(0);
  const [compassState, setCompassState] = useState<CompassState>("unavailable");

  // Internal refs — not rendered, no re-render cost
  const qiblaAngleRef = useRef<number | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);  // smoothed device heading
  const displayRotationRef = useRef(0);                    // cumulative rotation (no wrap)
  const recentReadingsRef = useRef<number[]>([]);          // for stability check
  const listenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const absoluteListenerRef = useRef<((e: Event) => void) | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRotationRef = useRef<number | null>(null);   // batches RAF updates

  // ── Compass sensor handler ──────────────────────────────────────────────────
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (qiblaAngleRef.current === null) return;

    // iOS: webkitCompassHeading (0–360, 0 = North, increases clockwise) — most reliable
    // Android absolute: alpha (0–360, 0 = North when absolute=true)
    // Android non-absolute: alpha relative to browser start — not useful
    let rawHeading: number | null = null;

    if ((e as any).webkitCompassHeading != null) {
      rawHeading = (e as any).webkitCompassHeading as number;
    } else if ((e as any).absolute === true && e.alpha != null) {
      // For absolute events alpha is measured counter-clockwise from North
      rawHeading = (360 - e.alpha + 360) % 360;
    } else if (e.alpha != null) {
      // Non-absolute — convert screen-relative alpha to compass heading
      // alpha is CCW from starting orientation, not from North, so less accurate
      rawHeading = (360 - e.alpha + 360) % 360;
    }

    if (rawHeading === null) return;

    // ── Exponential moving average (handles 0/360 wrap via shortest-delta) ──
    if (smoothedHeadingRef.current === null) {
      smoothedHeadingRef.current = rawHeading;
    } else {
      const delta = shortestAngleDelta(smoothedHeadingRef.current, rawHeading);
      smoothedHeadingRef.current = ((smoothedHeadingRef.current + SMOOTHING * delta) + 360) % 360;
    }

    const smoothedHeading = smoothedHeadingRef.current;

    // ── Stability tracking ──────────────────────────────────────────────────
    const readings = recentReadingsRef.current;
    readings.push(rawHeading);
    if (readings.length > STABILITY_WINDOW) readings.shift();

    if (readings.length >= STABILITY_WINDOW) {
      // Compute circular variance to handle 0/360 wrap
      const sinMean = readings.reduce((s, r) => s + Math.sin(toRad(r)), 0) / readings.length;
      const cosMean = readings.reduce((s, r) => s + Math.cos(toRad(r)), 0) / readings.length;
      const R = Math.sqrt(sinMean ** 2 + cosMean ** 2); // 0=random, 1=perfectly stable
      const stable = R > (1 - toRad(STABILITY_THRESHOLD) / Math.PI);
      setCompassState(stable ? "stable" : "calibrating");
    }

    // ── Shortest-path needle rotation (prevents 360° wrap spinning) ──────────
    const targetNeedle = (qiblaAngleRef.current - smoothedHeading + 360) % 360;
    const currentNormalized = ((displayRotationRef.current % 360) + 360) % 360;
    const delta = shortestAngleDelta(currentNormalized, targetNeedle);

    if (Math.abs(delta) < MIN_DELTA_DEG) return; // skip tiny changes

    displayRotationRef.current += delta;
    pendingRotationRef.current = displayRotationRef.current;

    // ── Batch DOM updates via RAF ───────────────────────────────────────────
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        if (pendingRotationRef.current !== null) {
          setNeedleRotation(pendingRotationRef.current);
        }
        rafRef.current = null;
      });
    }
  }, []);

  // ── Start compass listeners ─────────────────────────────────────────────────
  const startCompass = useCallback(() => {
    const attachListeners = () => {
      setCompassState("calibrating");

      // Prefer `deviceorientationabsolute` (Android Chrome) — gives true North
      const absoluteHandler = (e: Event) => {
        handleOrientation(e as DeviceOrientationEvent);
      };
      window.addEventListener("deviceorientationabsolute", absoluteHandler, true);
      absoluteListenerRef.current = absoluteHandler;

      // Also listen to regular deviceorientation (iOS uses this)
      const handler = (e: DeviceOrientationEvent) => {
        // Only use this if absolute event isn't firing
        if (absoluteListenerRef.current) {
          handleOrientation(e);
        }
      };
      window.addEventListener("deviceorientation", handler, true);
      listenerRef.current = handler;
    };

    // iOS 13+ requires explicit permission
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permission: string) => {
          if (permission === "granted") {
            attachListeners();
          } else {
            setCompassState("unavailable");
          }
        })
        .catch(() => setCompassState("unavailable"));
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      attachListeners();
    } else {
      setCompassState("unavailable");
    }
  }, [handleOrientation]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (listenerRef.current)
        window.removeEventListener("deviceorientation", listenerRef.current, true);
      if (absoluteListenerRef.current)
        window.removeEventListener("deviceorientationabsolute", absoluteListenerRef.current, true);
      if (rafRef.current !== null)
        cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Get GPS location ────────────────────────────────────────────────────────
  const getLocation = () => {
    setStatus("loading");
    setErrorMsg("");
    smoothedHeadingRef.current = null;
    recentReadingsRef.current = [];

    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const angle = calcQibla(latitude, longitude);
        const dist = calcDistance(latitude, longitude);

        qiblaAngleRef.current = angle;
        setQiblaAngle(angle);
        setDistance(dist);
        setStatus("granted");
        startCompass();

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          setCityName(
            data.address?.city || data.address?.town ||
            data.address?.village || data.address?.county || null
          );
        } catch { /* city name is optional */ }
      },
      (err) => {
        setStatus("error");
        setErrorMsg(
          err.code === 1
            ? "Location access was denied. Please enable location permissions and try again."
            : "Could not detect your location. Please check your connection and try again."
        );
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const showCalibration = status === "granted" && compassState === "calibrating";
  const showUnavailable = status === "granted" && compassState === "unavailable";
  const isStable = compassState === "stable";

  return (
    <div
      className="min-h-screen flex flex-col items-center pb-28 md:pb-10 pt-4 animate-in fade-in duration-500"
      style={{ background: "linear-gradient(160deg, #0a1628 0%, #0d1f3c 50%, #0b1f14 100%)" }}
    >
      {/* Header */}
      <div className="w-full max-w-md px-6 pt-4 pb-2 text-center">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-300 tracking-wide">
          Al Haram Direction
        </h1>
        <p className="text-emerald-400/60 text-sm mt-1">Qibla Compass · Direction to Makkah</p>
      </div>

      <div className="w-full max-w-md px-4 flex flex-col items-center gap-5 mt-2">

        {/* ── Compass ─────────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-center">
          {/* Ambient glow */}
          <div
            className="absolute w-80 h-80 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%)",
              boxShadow: isStable
                ? "0 0 80px rgba(251,191,36,0.18)"
                : "0 0 40px rgba(251,191,36,0.08)",
              transition: "box-shadow 1s ease",
            }}
          />

          {/* Compass disc — static, never rotates */}
          <div
            className="w-64 h-64 rounded-full border border-amber-500/20 flex items-center justify-center relative select-none"
            style={{ background: "radial-gradient(circle at 40% 40%, #0f2745 0%, #091529 100%)" }}
          >
            {/* Cardinal labels */}
            {[
              { label: "N", deg: 0, color: "#f87171" },
              { label: "E", deg: 90, color: "rgba(251,191,36,0.55)" },
              { label: "S", deg: 180, color: "rgba(251,191,36,0.55)" },
              { label: "W", deg: 270, color: "rgba(251,191,36,0.55)" },
            ].map(({ label, deg, color }) => (
              <span
                key={label}
                className="absolute text-xs font-bold"
                style={{
                  color,
                  transform: `rotate(${deg}deg) translateY(-116px) rotate(-${deg}deg)`,
                }}
              >
                {label}
              </span>
            ))}

            {/* Degree tick marks */}
            {Array.from({ length: 72 }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-0"
                style={{ transform: `rotate(${i * 5}deg)` }}
              >
                <div
                  className="absolute top-2 left-1/2 -translate-x-1/2"
                  style={{
                    width: i % 9 === 0 ? "2px" : "1px",
                    height: i % 9 === 0 ? "14px" : i % 3 === 0 ? "8px" : "5px",
                    background: i % 9 === 0 ? "rgba(251,191,36,0.45)" : "rgba(251,191,36,0.15)",
                    borderRadius: "1px",
                  }}
                />
              </div>
            ))}

            {/* ── Needle — rotates via shortest-path cumulative angle ── */}
            <div
              className="absolute inset-0"
              style={{
                transform: `rotate(${needleRotation}deg)`,
                // Only apply transition when granted, use quick easing to follow sensor
                transition: status === "granted"
                  ? "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                  : "none",
                willChange: "transform",
              }}
              data-testid="qibla-needle"
            >
              {/* Kaaba tip */}
              <div
                className="absolute flex flex-col items-center"
                style={{ top: "6px", left: "50%", transform: "translateX(-50%)" }}
              >
                <KaabaIcon size={26} />
                {/* Gold needle shaft */}
                <div
                  style={{
                    width: "2px",
                    height: "86px",
                    background: "linear-gradient(to bottom, #fbbf24 0%, rgba(251,191,36,0.1) 100%)",
                    borderRadius: "1px",
                    marginTop: "2px",
                  }}
                />
              </div>

              {/* Red tail */}
              <div
                className="absolute flex justify-center"
                style={{ bottom: "6px", left: "50%", transform: "translateX(-50%)" }}
              >
                <div
                  style={{
                    width: "2px",
                    height: "86px",
                    background: "linear-gradient(to top, rgba(239,68,68,0.7) 0%, transparent 100%)",
                    borderRadius: "1px",
                  }}
                />
              </div>
            </div>

            {/* Center pivot */}
            <div
              className="w-4 h-4 rounded-full z-10 border-2 border-amber-200"
              style={{ background: "radial-gradient(circle, #fbbf24, #b45309)" }}
            />
          </div>
        </div>

        {/* ── Calibration banner ──────────────────────────────────────────── */}
        {showCalibration && (
          <div
            className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-500/30 animate-pulse"
            style={{ background: "rgba(251,191,36,0.07)" }}
            data-testid="calibration-banner"
          >
            <RotateCcw className="w-5 h-5 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: "2s" }} />
            <div>
              <p className="text-amber-300 text-sm font-semibold">Calibrating compass…</p>
              <p className="text-amber-400/60 text-xs mt-0.5">
                Move your phone slowly in a figure-8 motion
              </p>
            </div>
          </div>
        )}

        {/* Compass unavailable (desktop / sensor-less device) */}
        {showUnavailable && (
          <div
            className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/10"
            style={{ background: "rgba(255,255,255,0.04)" }}
            data-testid="compass-unavailable-banner"
          >
            <Navigation className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-white/60 text-sm">
              No compass sensor detected. The Qibla angle is shown below — use it with an external compass.
            </p>
          </div>
        )}

        {/* ── Info cards ──────────────────────────────────────────────────── */}
        {status === "granted" && qiblaAngle !== null && (
          <div className="w-full grid grid-cols-2 gap-3" data-testid="qibla-info">
            <InfoCard
              label="Qibla Angle"
              value={`${Math.round(qiblaAngle)}°`}
              accent="amber"
            />
            <InfoCard
              label="Distance"
              value={`${distance?.toLocaleString()} km`}
              accent="emerald"
            />

            {cityName && (
              <div
                className="col-span-2 rounded-2xl p-3 flex items-center gap-3 border border-white/10"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-white/60 text-sm">
                  Your location:{" "}
                  <span className="text-white font-medium">{cityName}</span>
                </p>
              </div>
            )}

            <div
              className="col-span-2 rounded-2xl p-3 flex items-center gap-3 border border-white/10"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-white/60 text-sm">
                Destination:{" "}
                <span className="text-white font-medium">Masjid Al-Haram, Makkah</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {status === "loading" && (
          <div className="text-center space-y-3 mt-2">
            <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-amber-300/60 text-sm">Detecting your location…</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {status === "error" && (
          <div
            className="w-full rounded-2xl p-4 border border-red-500/30 flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.07)" }}
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* ── CTA / idle ──────────────────────────────────────────────────── */}
        {status === "idle" && (
          <p className="text-white/35 text-sm text-center max-w-xs mt-1">
            Allow location access to calculate the exact Qibla direction from your position.
          </p>
        )}

        {(status === "idle" || status === "error") && (
          <button
            onClick={getLocation}
            className="flex items-center justify-center gap-2 w-full max-w-xs h-12 rounded-full text-white font-semibold text-base"
            style={{
              background: "linear-gradient(135deg, #b45309, #d97706)",
              boxShadow: "0 4px 24px rgba(217,119,6,0.35)",
              border: "none",
            }}
            data-testid="button-find-qibla"
          >
            <Navigation className="w-5 h-5" />
            Find Qibla Direction
          </button>
        )}

        {status === "granted" && (
          <button
            onClick={getLocation}
            className="flex items-center gap-2 text-amber-400/50 hover:text-amber-300 text-sm transition-colors"
            data-testid="button-refresh-qibla"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Location
          </button>
        )}

        {/* Hint */}
        {status === "granted" && isStable && (
          <p className="text-white/25 text-xs text-center px-8 -mt-1">
            Rotate your device until the golden arrow points straight up.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function InfoCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "emerald";
}) {
  const colors = {
    amber: { border: "border-amber-500/20", text: "text-amber-300", sub: "text-amber-400/55" },
    emerald: { border: "border-emerald-500/20", text: "text-emerald-300", sub: "text-emerald-400/55" },
  }[accent];

  return (
    <div
      className={`rounded-2xl p-4 text-center border ${colors.border}`}
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <p className={`${colors.sub} text-xs uppercase tracking-wider mb-1`}>{label}</p>
      <p className={`text-2xl font-bold font-serif ${colors.text}`}>{value}</p>
    </div>
  );
}

function KaabaIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Kaaba"
    >
      <rect x="8" y="22" width="40" height="34" rx="2" fill="#1a1a2e" stroke="#d97706" strokeWidth="2" />
      <path d="M8 22 L28 10 L48 22" fill="#212140" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
      <rect x="40" y="22" width="8" height="34" rx="1" fill="#101025" stroke="#d97706" strokeWidth="1" />
      <rect x="8" y="32" width="40" height="7" fill="#92400e" opacity="0.85" />
      <rect x="8" y="36" width="40" height="1.5" fill="#fbbf24" opacity="0.55" />
      <rect x="19" y="42" width="16" height="14" rx="2" fill="#7c3410" stroke="#d97706" strokeWidth="1.5" />
      <rect x="22" y="45" width="4" height="7" rx="1" fill="#d97706" opacity="0.55" />
      <rect x="28" y="45" width="4" height="7" rx="1" fill="#d97706" opacity="0.55" />
    </svg>
  );
}
