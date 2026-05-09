import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const MAKKAH = { lat: 21.4225, lng: 39.8262 };

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function calcQibla(userLat: number, userLng: number): number {
  const φ1 = toRad(userLat);
  const φ2 = toRad(MAKKAH.lat);
  const Δλ = toRad(MAKKAH.lng - userLng);
  const θ = Math.atan2(
    Math.sin(Δλ) * Math.cos(φ2),
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  );
  return (toDeg(θ) + 360) % 360;
}

function calcDistance(userLat: number, userLng: number): number {
  const R = 6371;
  const dLat = toRad(MAKKAH.lat - userLat);
  const dLng = toRad(MAKKAH.lng - userLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLat)) * Math.cos(toRad(MAKKAH.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

type Status = "idle" | "loading" | "granted" | "error";

export function Qibla() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState(0);
  const [cityName, setCityName] = useState<string | null>(null);
  const orientationRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);

  const getLocation = () => {
    setStatus("loading");
    setErrorMsg("");

    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const angle = calcQibla(latitude, longitude);
        const dist = calcDistance(latitude, longitude);
        setQiblaAngle(angle);
        setDistance(dist);
        setStatus("granted");

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            null;
          setCityName(city);
        } catch {
          // city name is optional
        }

        startCompass();
      },
      (err) => {
        setStatus("error");
        setErrorMsg(
          err.code === 1
            ? "Location access denied. Please allow location access and try again."
            : "Unable to retrieve your location. Please try again."
        );
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const startCompass = () => {
    if (orientationRef.current) return;

    const handler = (e: DeviceOrientationEvent) => {
      const alpha = (e as any).webkitCompassHeading ?? e.alpha;
      if (alpha !== null) {
        setCompassHeading(alpha);
      }
    };

    orientationRef.current = handler;

    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((permission: string) => {
          if (permission === "granted") {
            window.addEventListener("deviceorientation", handler, true);
          }
        })
        .catch(() => {});
    } else {
      window.addEventListener("deviceorientation", handler, true);
    }
  };

  useEffect(() => {
    return () => {
      if (orientationRef.current) {
        window.removeEventListener("deviceorientation", orientationRef.current, true);
      }
    };
  }, []);

  const needleRotation =
    qiblaAngle !== null ? qiblaAngle - compassHeading : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pb-28 md:pb-10 pt-2 animate-in fade-in duration-500"
      style={{
        background: "linear-gradient(160deg, #0a1628 0%, #0d1f3c 40%, #0f2318 100%)"
      }}
    >
      {/* Header */}
      <div className="w-full max-w-md px-6 pt-6 pb-4 text-center">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-300 tracking-wide">
          Al Haram Direction
        </h1>
        <p className="text-emerald-400/70 text-sm mt-1">Qibla Compass · Direction to Makkah</p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md px-4 flex flex-col items-center gap-6">

        {/* Compass */}
        <div className="relative flex items-center justify-center mt-4">
          {/* Outer glow ring */}
          <div className="absolute w-72 h-72 rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)",
              boxShadow: "0 0 60px rgba(251,191,36,0.12)"
            }}
          />

          {/* Compass rose ring */}
          <div className="w-64 h-64 rounded-full border border-amber-500/20 flex items-center justify-center relative"
            style={{ background: "radial-gradient(circle at center, #0d1f3c 60%, #091529 100%)" }}
          >
            {/* Cardinal directions */}
            {[
              { label: "N", deg: 0 },
              { label: "E", deg: 90 },
              { label: "S", deg: 180 },
              { label: "W", deg: 270 },
            ].map(({ label, deg }) => (
              <span
                key={label}
                className={`absolute text-xs font-bold select-none ${label === "N" ? "text-red-400" : "text-amber-500/60"}`}
                style={{
                  transform: `rotate(${deg}deg) translateY(-112px) rotate(-${deg}deg)`,
                  transformOrigin: "center center",
                }}
              >
                {label}
              </span>
            ))}

            {/* Degree ticks */}
            {Array.from({ length: 36 }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: "100%",
                  height: "100%",
                  transform: `rotate(${i * 10}deg)`,
                }}
              >
                <div
                  className={`absolute top-2 left-1/2 -translate-x-1/2 ${
                    i % 9 === 0 ? "h-4 w-0.5 bg-amber-500/40" : "h-2 w-px bg-amber-500/20"
                  }`}
                />
              </div>
            ))}

            {/* Needle / pointer */}
            <div
              className="absolute w-full h-full flex items-center justify-center"
              style={{
                transform: `rotate(${needleRotation}deg)`,
                transition: status === "granted" ? "transform 0.4s ease-out" : "none",
              }}
              data-testid="qibla-needle"
            >
              {/* Arrow pointing up = Qibla direction */}
              <div className="absolute flex flex-col items-center" style={{ top: "8px", left: "50%", transform: "translateX(-50%)" }}>
                {/* Kaaba icon at tip */}
                <div className="w-8 h-8 mb-1 flex items-center justify-center">
                  <KaabaIcon size={28} />
                </div>
                {/* Needle shaft going down */}
                <div className="w-0.5 bg-gradient-to-b from-amber-400 to-transparent"
                  style={{ height: "88px" }}
                />
              </div>
              {/* Tail (opposite direction) */}
              <div className="absolute flex justify-center" style={{ bottom: "8px", left: "50%", transform: "translateX(-50%)" }}>
                <div className="w-0.5 bg-gradient-to-t from-red-500/60 to-transparent" style={{ height: "88px" }} />
              </div>
            </div>

            {/* Center dot */}
            <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-200 shadow-lg z-10" />
          </div>
        </div>

        {/* Info cards */}
        {status === "granted" && qiblaAngle !== null && (
          <div className="w-full grid grid-cols-2 gap-3 mt-2" data-testid="qibla-info">
            <div className="rounded-2xl p-4 text-center border border-amber-500/20"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-amber-400/60 text-xs uppercase tracking-wider mb-1">Qibla Angle</p>
              <p className="text-2xl font-bold text-amber-300 font-serif">
                {Math.round(qiblaAngle)}°
              </p>
            </div>
            <div className="rounded-2xl p-4 text-center border border-emerald-500/20"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-emerald-400/60 text-xs uppercase tracking-wider mb-1">Distance</p>
              <p className="text-2xl font-bold text-emerald-300 font-serif">
                {distance?.toLocaleString()} km
              </p>
            </div>

            {cityName && (
              <div className="col-span-2 rounded-2xl p-3 flex items-center gap-3 border border-white/10"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-white/70 text-sm">Your location: <span className="text-white font-medium">{cityName}</span></p>
              </div>
            )}

            <div className="col-span-2 rounded-2xl p-3 flex items-center gap-3 border border-white/10"
              style={{ background: "rgba(255,255,255,0.04)" }}>
              <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-white/70 text-sm">Destination: <span className="text-white font-medium">Masjid Al-Haram, Makkah</span></p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {status === "loading" && (
          <div className="text-center space-y-3 mt-2">
            <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
            <p className="text-amber-300/70 text-sm">Detecting your location…</p>
          </div>
        )}

        {/* Error state */}
        {status === "error" && (
          <div className="w-full rounded-2xl p-4 border border-red-500/30 flex items-start gap-3"
            style={{ background: "rgba(239,68,68,0.08)" }}>
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Idle / CTA */}
        {status === "idle" && (
          <div className="text-center space-y-3 mt-2">
            <p className="text-white/40 text-sm max-w-xs mx-auto">
              Allow location access to find the exact direction of Qibla from your position.
            </p>
          </div>
        )}

        {/* Action button */}
        {(status === "idle" || status === "error") && (
          <Button
            onClick={getLocation}
            className="w-full max-w-xs h-12 text-base font-semibold rounded-full"
            style={{
              background: "linear-gradient(135deg, #b45309, #d97706)",
              color: "#fff",
              border: "none",
              boxShadow: "0 4px 24px rgba(217,119,6,0.3)",
            }}
            data-testid="button-find-qibla"
          >
            <Navigation className="w-5 h-5 mr-2" />
            Find Qibla Direction
          </Button>
        )}

        {status === "granted" && (
          <Button
            variant="ghost"
            onClick={getLocation}
            className="text-amber-400/60 hover:text-amber-300 text-sm gap-2"
            data-testid="button-refresh-qibla"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Location
          </Button>
        )}

        {/* Compass hint */}
        {status === "granted" && (
          <p className="text-white/30 text-xs text-center px-8 -mt-2">
            The golden arrow points toward the Kaaba. Rotate your device until the arrow points up.
          </p>
        )}
      </div>
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
      {/* Main cube body */}
      <rect x="8" y="20" width="40" height="36" rx="2" fill="#1a1a2e" stroke="#d97706" strokeWidth="2" />
      {/* Top face (isometric) */}
      <path d="M8 20 L28 8 L48 20" fill="#252545" stroke="#d97706" strokeWidth="2" strokeLinejoin="round" />
      {/* Right face highlight */}
      <rect x="40" y="20" width="8" height="36" rx="1" fill="#111127" stroke="#d97706" strokeWidth="1" />
      {/* Kiswah band */}
      <rect x="8" y="30" width="40" height="8" fill="#92400e" opacity="0.9" />
      {/* Gold stripe on band */}
      <rect x="8" y="33" width="40" height="2" fill="#fbbf24" opacity="0.6" />
      {/* Door */}
      <rect x="20" y="40" width="16" height="16" rx="2" fill="#92400e" stroke="#d97706" strokeWidth="1.5" />
      <rect x="23" y="43" width="4" height="8" rx="1" fill="#d97706" opacity="0.6" />
      <rect x="29" y="43" width="4" height="8" rx="1" fill="#d97706" opacity="0.6" />
      {/* Gold glow */}
      <circle cx="28" cy="32" r="3" fill="#fbbf24" opacity="0.15" />
    </svg>
  );
}
