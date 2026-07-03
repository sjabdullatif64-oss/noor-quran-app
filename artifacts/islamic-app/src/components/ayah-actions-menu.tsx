import { MoreVertical, Share2, Copy, ZoomIn, Eye, EyeOff } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { nativeShare, copyToClipboard, getLastShareError } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import { useAyahDisplaySettings, setShowExplanatory } from "@/lib/ayah-display";

interface AyahActionsMenuProps {
  surahEnglishName: string;
  surahName: string;
  ayahNumber: number;
  textAr: string;
  /** The translation text exactly as currently displayed (post explanatory-word setting) — used for Share/Copy so output matches what the user sees. */
  displayedTranslation: string;
  /** Whether two-finger pinch-to-zoom is currently enabled for the reading content. */
  pinchZoomEnabled: boolean;
  /** Toggles pinch-to-zoom on/off. Lifted up to the reader page since zoom applies to the whole ayah list, not a single card. */
  onTogglePinchZoom: () => void;
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
  const { showExplanatory } = useAyahDisplaySettings();

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

        <DropdownMenuCheckboxItem
          checked={props.pinchZoomEnabled}
          onCheckedChange={props.onTogglePinchZoom}
          data-testid="menu-pinch-zoom"
        >
          <ZoomIn className="w-4 h-4 mr-2 inline-block align-text-bottom" />
          Enable Pinch-to-Zoom
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        <DropdownMenuRadioGroup
          value={showExplanatory ? "show" : "hide"}
          onValueChange={(v) => setShowExplanatory(v === "show")}
        >
          <DropdownMenuRadioItem value="show" data-testid="menu-show-explanatory">
            <Eye className="w-4 h-4 mr-2" />
            Show Explanatory Words
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="hide" data-testid="menu-hide-explanatory">
            <EyeOff className="w-4 h-4 mr-2" />
            Hide Explanatory Words
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
