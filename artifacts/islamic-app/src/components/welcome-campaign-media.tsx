import { ImageOff, Play } from "lucide-react";
import { useEffect, useState } from "react";

import {
  getWelcomeCampaignMedia,
  type WelcomeCampaign,
  type WelcomeCampaignMediaKind,
} from "@/lib/welcome-campaign";

interface WelcomeCampaignMediaProps {
  campaign: Pick<WelcomeCampaign, "videoUrl" | "gifUrl" | "imageUrl" | "title">;
  onReady: () => void;
  onError: () => void;
}

function MediaFallback({ kind, title }: { kind: WelcomeCampaignMediaKind; title: string }) {
  return (
    <div
      className="flex h-full min-h-56 w-full flex-col items-center justify-center gap-3 bg-primary/10 px-8 text-center text-muted-foreground md:min-h-72"
      role="img"
      aria-label={`${title} media unavailable`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
        {kind === "video" ? <Play className="ml-0.5 h-5 w-5" aria-hidden="true" /> : <ImageOff className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="text-sm">This moment is unavailable right now.</span>
    </div>
  );
}

export function WelcomeCampaignMedia({
  campaign,
  onReady,
  onError,
}: WelcomeCampaignMediaProps) {
  const media = getWelcomeCampaignMedia(campaign);
  const [failed, setFailed] = useState(false);
  const [fallbackImage, setFallbackImage] = useState<string | null>(null);

  useEffect(() => {
    setFailed(false);
    setFallbackImage(null);
  }, [campaign.videoUrl, campaign.gifUrl, campaign.imageUrl]);

  if (media.kind === "none" || failed || !media.src) {
    return <MediaFallback kind={media.kind} title={campaign.title} />;
  }

  if (fallbackImage) {
    return (
      <img
        src={fallbackImage}
        alt={campaign.title}
        className="h-full min-h-56 w-full object-cover md:min-h-72"
        onLoad={onReady}
        onError={() => {
          setFailed(true);
          onError();
        }}
      />
    );
  }

  if (media.kind === "video") {
    return (
      <video
        key={media.src}
        className="h-full min-h-56 w-full object-cover md:min-h-72"
        src={media.src}
        poster={media.poster ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={campaign.title}
        onLoadedData={onReady}
        onCanPlay={onReady}
        onError={() => {
          if (media.poster) {
            setFallbackImage(media.poster);
          } else {
            setFailed(true);
            onError();
          }
        }}
      />
    );
  }

  return (
    <img
      key={media.src}
      src={media.src}
      alt={campaign.title}
      className="h-full min-h-56 w-full object-cover md:min-h-72"
      onLoad={onReady}
      onError={() => {
        if (media.kind === "gif" && media.poster) {
          setFallbackImage(media.poster);
        } else {
          setFailed(true);
          onError();
        }
      }}
    />
  );
}