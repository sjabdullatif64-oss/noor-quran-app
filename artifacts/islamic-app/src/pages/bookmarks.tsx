import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark, getBookmarks, removeBookmark } from "@/lib/bookmarks";
import { Trash2, BookOpen, BookmarkX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(getBookmarks().sort((a, b) => b.savedAt - a.savedAt));
  }, []);

  const handleRemove = (surahNumber: number, ayahNumber: number) => {
    removeBookmark(surahNumber, ayahNumber);
    setBookmarks((prev) =>
      prev.filter(
        (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
      )
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      <header className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-primary">
          Bookmarks
        </h1>
        <p className="text-muted-foreground">
          {bookmarks.length === 0
            ? "No bookmarks yet."
            : `${bookmarks.length} saved ${bookmarks.length === 1 ? "ayah" : "ayahs"}`}
        </p>
      </header>

      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <BookmarkX className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">No bookmarks saved</p>
            <p className="text-muted-foreground text-sm max-w-xs">
              While reading a surah, tap the bookmark icon on any ayah to save it here.
            </p>
          </div>
          <Button asChild variant="default" data-testid="button-go-quran">
            <Link href="/quran">
              <BookOpen className="w-4 h-4 mr-2" />
              Open Quran
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bookmark) => (
            <div
              key={`${bookmark.surahNumber}-${bookmark.ayahNumber}`}
              className="group bg-card border border-border rounded-2xl p-6 space-y-4 hover:border-primary/40 transition-all shadow-sm"
              data-testid={`bookmark-${bookmark.surahNumber}-${bookmark.ayahNumber}`}
            >
              <div className="flex items-start justify-between gap-4">
                <Link
                  href={`/quran/${bookmark.surahNumber}`}
                  className="flex-1 space-y-1 hover:opacity-80 transition-opacity"
                  data-testid={`link-bookmark-surah-${bookmark.surahNumber}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-primary/10 text-primary rounded-full px-2.5 py-0.5">
                      {bookmark.surahEnglishName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Verse {bookmark.ayahNumber}
                    </span>
                  </div>
                  <p dir="rtl" className="text-2xl font-arabic leading-loose text-foreground text-right mt-2">
                    {bookmark.textAr}
                  </p>
                  {bookmark.textTranslation && (
                    <p dir="rtl" className="text-base text-muted-foreground leading-relaxed text-right font-serif">
                      {bookmark.textTranslation}
                    </p>
                  )}
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={() => handleRemove(bookmark.surahNumber, bookmark.ayahNumber)}
                  data-testid={`button-remove-bookmark-${bookmark.surahNumber}-${bookmark.ayahNumber}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
