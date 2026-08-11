import { useState } from "react";
import {
  MoreVertical, Share2, Copy, ZoomIn, Eye, EyeOff, Languages,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { nativeShare, copyToClipboard, getLastShareError } from "@/lib/capacitor";
import { useToast } from "@/hooks/use-toast";
import {
  useAyahDisplaySettings,
  setShowExplanatory,
  setShowTransliteration,
  setShowTranslation,
} from "@/lib/ayah-display";
import {
  ALL_LANGUAGES,
  TRANSLATION_ENGLISH_NAMES,
  TRANSLATION_LABELS,
  type TranslationLanguage,
} from "@/lib/api";
import { MoreLanguagesDialog } from "@/components/translation-language-picker";

interface AyahActionsMenuProps {
  surahEnglishName: string;
  surahName: string;
  ayahNumber: number;
  textAr: string;
  textTranslit?: string;
  /** The translation text exactly as currently displayed (post explanatory-word setting) — used for Share/Copy so output matches what the user sees. */
  displayedTranslation: string;
  transliterationLanguage: TranslationLanguage;
  onTransliterationLanguageChange: (language: TranslationLanguage) => void;
  /** Whether two-finger pinch-to-zoom is currently enabled for the reading content. */
  pinchZoomEnabled: boolean;
  /** Toggles pinch-to-zoom on/off. Lifted up to the reader page since zoom applies to the whole ayah list, not a single card. */
  onTogglePinchZoom: () => void;
  triggerClassName?: string;
  testId?: string;
}

function buildAyahText(props: AyahActionsMenuProps): string {
  const lines = [props.textAr];
  if (props.textTranslit) lines.push("", props.textTranslit);
  if (props.displayedTranslation) lines.push("", props.displayedTranslation);
  lines.push(
    "",
    `Surah ${props.surahEnglishName} (${props.surahName}) — Ayah ${props.ayahNumber}`,
    "",
    "Noor Quran",
  );
  return lines.join("\n");
}

export function AyahActionsMenu(props: AyahActionsMenuProps) {
  const [languageDialogOpen, setLanguageDialogOpen] = useState(false);
  const { toast } = useToast();
  const {
    showExplanatory,
    showTransliteration,
    showTranslation,
  } = useAyahDisplaySettings();

  const handleTransliterationLanguageChange = (language: TranslationLanguage) => {
    props.onTransliterationLanguageChange(language);
  };

  const handleShare = async () => {
    const text = buildAyahText({
      ...props,
      textTranslit: showTransliteration ? props.textTranslit : "",
      displayedTranslation: showTranslation ? props.displayedTranslation : "",
    });
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
    const text = buildAyahText({
      ...props,
      textTranslit: showTransliteration ? props.textTranslit : "",
      displayedTranslation: showTranslation ? props.displayedTranslation : "",
    });
    const ok = await copyToClipboard(text);
    toast(
      ok
        ? { title: "Ayah copied", description: "Copied to clipboard." }
        : { title: "Copy failed", description: "Please try again.", variant: "destructive" }
    );
  };

  return (
    <>
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

        <DropdownMenuLabel>Display</DropdownMenuLabel>

        <DropdownMenuCheckboxItem
          checked={showTransliteration}
          onCheckedChange={setShowTransliteration}
          data-testid="menu-show-transliteration"
        >
          {showTransliteration
            ? <Eye className="w-4 h-4 mr-2" />
            : <EyeOff className="w-4 h-4 mr-2" />}
          Show Transliteration
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={showTranslation}
          onCheckedChange={setShowTranslation}
          data-testid="menu-show-translation"
        >
          {showTranslation
            ? <Eye className="w-4 h-4 mr-2" />
            : <EyeOff className="w-4 h-4 mr-2" />}
          Show Translation
        </DropdownMenuCheckboxItem>

        <DropdownMenuItem
          onSelect={() => setLanguageDialogOpen(true)}
          data-testid="menu-transliteration-language"
        >
          <Languages className="w-4 h-4 mr-2" />
          <span className="flex-1">Transliteration Language</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {TRANSLATION_ENGLISH_NAMES[props.transliterationLanguage] ??
              TRANSLATION_LABELS[props.transliterationLanguage]}
          </span>
        </DropdownMenuItem>

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

      <MoreLanguagesDialog
        open={languageDialogOpen}
        onOpenChange={setLanguageDialogOpen}
        selectedLanguage={props.transliterationLanguage}
        onSelect={handleTransliterationLanguageChange}
        languages={ALL_LANGUAGES}
        title="Transliteration Language"
        description="Choose the language used for transliteration text."
      />
    </>
  );
}
