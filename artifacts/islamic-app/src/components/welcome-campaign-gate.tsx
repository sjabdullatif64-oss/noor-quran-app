import { useEffect, useState, type ReactNode } from "react";

import { WelcomeCampaignScreen } from "@/components/welcome-campaign-screen";
import { hideSplash } from "@/lib/capacitor";
import { noorApi } from "@/lib/noor-api";
import {
  getNextWelcomeCampaign,
  readLastWelcomeCampaignId,
  rememberWelcomeCampaign,
  type WelcomeCampaign,
} from "@/lib/welcome-campaign";

interface WelcomeCampaignGateProps {
  children: ReactNode;
}

type GateState =
  | { status: "loading" }
  | { status: "ready"; campaign: WelcomeCampaign | null };

function WelcomeCampaignLoading() {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-foreground"
      aria-label="Loading Noor Quran"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-primary/15 ring-1 ring-primary/20" />
        <p className="text-xs tracking-[0.16em] text-muted-foreground">NOOR QURAN</p>
      </div>
    </div>
  );
}

export function WelcomeCampaignGate({ children }: WelcomeCampaignGateProps) {
  const [state, setState] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    const finish = (campaign: WelcomeCampaign | null) => {
      if (cancelled || settled) return;
      settled = true;
      if (campaign) rememberWelcomeCampaign(campaign.id);
      setState({ status: "ready", campaign });
      void hideSplash();
    };
    const fallbackTimeout = window.setTimeout(() => finish(null), 5000);

    noorApi
      .getWelcomeCampaigns()
      .then(({ campaigns }) => {
        const campaign = getNextWelcomeCampaign(campaigns, readLastWelcomeCampaignId());
        finish(campaign);
      })
      .catch(() => {
        finish(null);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(fallbackTimeout);
    };
  }, []);

  if (state.status === "loading") return <WelcomeCampaignLoading />;
  if (!state.campaign) return <>{children}</>;

  return (
    <WelcomeCampaignScreen
      campaign={state.campaign}
      onSkip={() => setState({ status: "ready", campaign: null })}
      onOpenUrl={() => {}}
    />
  );
}