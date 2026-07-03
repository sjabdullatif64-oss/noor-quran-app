import { MoreVertical, Share2, Copy, Minus, Plus, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { nativeShare, copyToClipboard, getLastShareError } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import {
  TEXT_SCALE_STEPS, useAyahDisplaySettings,
  increaseTextScale, decreaseTextScale, setShowExplanatory,
} from "@/lib/ayah-display";

interface AyahActionsMenuProps {
  surahEnglishName: string;
  surahName: string;
  ayahNumber: number;
  textAr: string;
  /** The translation text exactly as currently displayed (post explanatory-word setting) — used for Share/Copy so output matches what the user sees. */
  displayedTranslation: string;
  triggerClassName?: string;
  testId?: string;
}

function buildAyahText(props: AyahActionsMenuProps): string {
  const lines = [
    props.textAr,
    "",
    props.displayedTranslation,
    "",
    `Surah ${props.surahEnglishName} (${props.surahName}) — Ayah ${props.ayahNumber}`,
    "",
    "Noor Quran",
  ];
  return lines.join("\n");
}

export function AyahActionsMenu(props: AyahActionsMenuProps) {
  const { toast } = useToast();
  const { scale, showExplanatory } = useAyahDisplaySettings();

  const handleShare = async () => {
    const text = buildAyahText(props);
    const result = await nativeShare({
      title: "Noor Quran",
      text,
      dialogTitle: "Share Ayah",
    });
    if (result === "failed") {
      toast({ title: "Share unavailable", description: getLastShareError() ?? "Please try again.", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    const text = buildAyahText(props);
    const ok = await copyToClipboard(text);
    toast(
      ok
        ? { title: "Ayah copied", description: "Copied to clipboard." }
        : { title: "Copy failed", description: "Please try again.", variant: "destructive" }
    );
  };

  const scaleIdx = TEXT_SCALE_STEPS.indexOf(scale);
  const atMin = scaleIdx <= 0;
  const atMax = scaleIdx >= TEXT_SCALE_STEPS.length - 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={
            props.triggerClassName ??
            "w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          }
          data-testid={props.testId}
          aria-label="More ayah actions"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={handleShare} data-testid="menu-share-ayah">
          <Share2 className="w-4 h-4 mr-2" />
          Share Ayah
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy} data-testid="menu-copy-ayah">
          <Copy className="w-4 h-4 mr-2" />
          Copy Ayah
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Text Size
        </DropdownMenuLabel>
        <div className="flex items-center justify-between px-2 py-1.5">
          <button
            type="button"
            disabled={atMin}
            onClick={decreaseTextScale}
            className="w-8 h-8 rounded-md flex items-center justify-center border border-border text-foreground disabled:opacity-30 active:scale-95 transition-transform"
            data-testid="button-text-size-decrease"
            aria-label="Decrease text size"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            disabled={atMax}
            onClick={increaseTextScale}
            className="w-8 h-8 rounded-md flex items-center justify-center border border-border text-foreground disabled:opacity-30 active:scale-95 transition-transform"
            data-testid="button-text-size-increase"
            aria-label="Increase text size"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
          Explanatory Words
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={showExplanatory ? "show" : "hide"}
          onValueChange={(v) => setShowExplanatory(v === "show")}
        >
          <DropdownMenuRadioItem value="show" data-testid="menu-show-explanatory">
            <Eye className="w-4 h-4 mr-2" />
            Show explanatory words
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="hide" data-testid="menu-hide-explanatory">
            <EyeOff className="w-4 h-4 mr-2" />
            Hide explanatory words
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
