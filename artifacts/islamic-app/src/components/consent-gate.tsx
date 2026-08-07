import { useState } from "react";
import { ShieldCheck, ScrollText } from "lucide-react";
import { useLocation } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
import { PrivacyPolicy } from "@/pages/privacy-policy";
import { TermsOfService } from "@/pages/terms-of-service";
import { useI18n } from "@/lib/i18n-context";
import {
  acceptConsent,
  hasCurrentConsent,
} from "@/lib/consent";

function LegalPage({ path }: { path: string }) {
  if (path === "/terms-of-service") return <TermsOfService />;
  return <PrivacyPolicy />;
}

export function ConsentGate({ children }: { children: React.ReactNode }) {
  const { isRtl, t } = useI18n();
  const [location, setLocation] = useLocation();
  const [agreed, setAgreed] = useState(false);
  const [accepted, setAccepted] = useState(() => hasCurrentConsent());
  if (!accepted && (location === "/terms-of-service" || location === "/privacy-policy")) {
    return <LegalPage path={location} />;
  }

  if (accepted) return <>{children}</>;

  function handleContinue() {
    if (!agreed) return;
    if (acceptConsent()) setAccepted(true);
  }

  return (
    <main
      className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6"
      dir={isRtl ? "rtl" : "ltr"}
      data-testid="consent-gate"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">{t("consent_title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("consent_intro")}</p>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={() => setLocation("/terms-of-service")}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-start transition-colors hover:border-primary hover:text-primary"
              data-testid="button-consent-terms"
            >
              <ScrollText className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-medium">{t("consent_terms")}</span>
            </button>
            <button
              type="button"
              onClick={() => setLocation("/privacy-policy")}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background px-4 text-start transition-colors hover:border-primary hover:text-primary"
              data-testid="button-consent-privacy"
            >
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-medium">{t("consent_privacy")}</span>
            </button>
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-4">
            <Checkbox
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              className="mt-0.5"
              aria-label={t("consent_agreement")}
              data-testid="checkbox-consent"
            />
            <span className="text-sm leading-relaxed">{t("consent_agreement")}</span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!agreed}
            className="mt-6 min-h-12 w-full rounded-2xl bg-primary px-5 font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="button-consent-continue"
          >
            {t("consent_continue")}
          </button>

          {!agreed && (
            <p className="mt-3 text-center text-xs text-muted-foreground">{t("consent_required")}</p>
          )}
        </section>
      </div>
    </main>
  );
}
