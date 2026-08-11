import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  ADDITIONAL_LANGUAGES,
  type TranslationLanguage,
  TRANSLATION_ENGLISH_NAMES,
  TRANSLATION_LABELS,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface MoreLanguagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLanguage: TranslationLanguage;
  onSelect: (language: TranslationLanguage) => void;
  languages?: TranslationLanguage[];
  title?: string;
  description?: string;
}

export function MoreLanguagesDialog({
  open,
  onOpenChange,
  selectedLanguage,
  onSelect,
  languages = ADDITIONAL_LANGUAGES,
  title = "More Languages",
  description = "Search and choose a Quran translation language.",
}: MoreLanguagesDialogProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const filteredLanguages = useMemo(
    () =>
      languages.filter((language) => {
        if (!query) return true;
        return (
          TRANSLATION_ENGLISH_NAMES[language].toLocaleLowerCase().includes(query) ||
          TRANSLATION_LABELS[language].toLocaleLowerCase().includes(query)
        );
      }),
    [languages, query],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setSearch("");
      }}
    >
      <DialogContent className="max-w-md overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="px-4 pt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search languages..."
              className="pl-9 bg-card border-border"
              autoFocus
              data-testid="input-more-languages-search"
            />
          </div>
        </div>

        <div className="max-h-[min(55vh,420px)] overflow-y-auto px-4 pb-4 pt-3">
          {filteredLanguages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No languages found.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredLanguages.map((language) => {
                const selected = selectedLanguage === language;
                return (
                  <button
                    key={language}
                    type="button"
                    onClick={() => {
                      onSelect(language);
                      onOpenChange(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                    data-testid={`more-language-${language}`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">
                        {TRANSLATION_ENGLISH_NAMES[language]}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {TRANSLATION_LABELS[language]}
                      </span>
                    </span>
                    {selected && (
                      <span className="ml-3 text-sm font-semibold text-primary">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}