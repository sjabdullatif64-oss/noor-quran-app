import { MapPin, Navigation, Settings2, ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type PermissionDialogMode = "request" | "blocked";
type PermissionDialogAccent = "green" | "amber";

export type LocationPermissionState = "granted" | "denied" | "prompt";

export async function getLocationPermissionState(): Promise<LocationPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "prompt";
  try {
    const permission = await navigator.permissions.query({ name: "geolocation" });
    return permission.state === "granted" || permission.state === "denied"
      ? permission.state
      : "prompt";
  } catch {
    return "prompt";
  }
}

interface LocationPermissionDialogProps {
  open: boolean;
  mode: PermissionDialogMode;
  accent?: PermissionDialogAccent;
  feature: "prayer" | "qibla";
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onOpenSettings: () => void;
}

const copy = {
  prayer: {
    requestTitle: "Use your location for prayer times",
    requestBody: "Noor Quran uses your location only to calculate accurate prayer times for your area. Your location stays on your device.",
    blockedTitle: "Location access is turned off",
    blockedBody: "To calculate prayer times for your area, allow Noor Quran to use your location in your device settings.",
  },
  qibla: {
    requestTitle: "Find the Qibla from where you are",
    requestBody: "Allow Noor Quran to use your location so the Qibla compass can point accurately toward Masjid Al-Haram.",
    blockedTitle: "Location access is needed",
    blockedBody: "The Qibla compass cannot find your direction until location access is enabled for Noor Quran.",
  },
} as const;

export function LocationPermissionDialog({
  open,
  mode,
  accent = "green",
  feature,
  onOpenChange,
  onContinue,
  onOpenSettings,
}: LocationPermissionDialogProps) {
  const text = copy[feature];
  const isAmber = accent === "amber";
  const accentClass = isAmber ? "text-amber-500" : "text-primary";
  const softAccentClass = isAmber ? "bg-amber-500/12" : "bg-primary/12";
  const buttonClass = isAmber
    ? "bg-amber-500 text-amber-950 shadow-[0_10px_28px_rgba(245,158,11,.24)] hover:bg-amber-400"
    : "bg-primary text-primary-foreground shadow-[0_10px_28px_hsl(var(--primary)/.24)] hover:opacity-90";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(92vw,420px)] overflow-hidden rounded-[1.75rem] border-border bg-card p-0 shadow-2xl">
        <div className="relative overflow-hidden px-6 pb-6 pt-7">
          <div className={`pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full blur-3xl ${softAccentClass}`} />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className={`relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${softAccentClass} ${accentClass}`}>
            {mode === "blocked" ? <Settings2 className="h-7 w-7" /> : feature === "qibla" ? <Navigation className="h-7 w-7" /> : <MapPin className="h-7 w-7" />}
          </div>

          <DialogTitle className="relative pr-7 text-xl font-semibold tracking-[-.03em]">
            {mode === "blocked" ? text.blockedTitle : text.requestTitle}
          </DialogTitle>
          <DialogDescription className="relative mt-3 text-sm leading-6 text-muted-foreground">
            {mode === "blocked" ? text.blockedBody : text.requestBody}
          </DialogDescription>

          <div className="relative mt-5 flex items-start gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3.5">
            <ShieldCheck className={`mt-0.5 h-4 w-4 shrink-0 ${accentClass}`} />
            <p className="text-xs leading-5 text-muted-foreground">
              Noor Quran does not store your precise location or share it with others.
            </p>
          </div>

          <div className="relative mt-6 flex flex-col gap-2.5">
            {mode === "request" ? (
              <button
                type="button"
                onClick={onContinue}
                className={`flex h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-all active:scale-[.98] ${buttonClass}`}
              >
                Allow location access
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all active:scale-[.98] ${buttonClass}`}
                >
                  <Settings2 className="h-4 w-4" />
                  Open Location Settings
                </button>
                <button
                  type="button"
                  onClick={onContinue}
                  className="flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Try again
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}