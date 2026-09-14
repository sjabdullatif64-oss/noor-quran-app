import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, BookOpen, Bot, Loader2, MessageCircle, Send, Volume2 } from "lucide-react";
import { Link } from "wouter";
import { getAudioUrl } from "@/lib/api";
import { noorApi, type QuranAssistantAyah } from "@/lib/noor-api";
import { getBookmarks, removeBookmark, saveBookmark } from "@/lib/bookmarks";

type Message = { role: "user" | "assistant"; text?: string; answer?: Awaited<ReturnType<typeof noorApi.askQuranAssistant>> };

const examples = ["Explain an Ayah", "Verse about patience", "Verse for difficult times", "Quranic guidance about forgiveness"];

function QuranCard({ ayah }: { ayah: QuranAssistantAyah }) {
  const [bookmarked, setBookmarked] = useState(() => getBookmarks().some((b) => b.type !== "surah" && b.surahNumber === ayah.surahNumber && b.ayahNumber === ayah.ayahNumber));
  const BookmarkIcon = bookmarked ? BookmarkCheck : Bookmark;
  const toggleBookmark = () => {
    if (bookmarked) removeBookmark(ayah.surahNumber, ayah.ayahNumber);
    else saveBookmark({
      type: "ayah", surahNumber: ayah.surahNumber, surahName: ayah.surahName,
      surahEnglishName: ayah.surahName, ayahNumber: ayah.ayahNumber,
      globalNumber: ayah.audioGlobalNumber, textAr: ayah.arabic,
      textTranslation: ayah.translation, savedAt: Date.now(),
    });
    setBookmarked(!bookmarked);
  };
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4" data-testid={`quran-assistant-card-${ayah.surahNumber}-${ayah.ayahNumber}`}>
      <div className="flex items-center gap-2 text-primary font-semibold"><span aria-hidden>📖</span> Quran</div>
      <p className="text-sm font-medium text-foreground">{ayah.surahName} · Ayah {ayah.ayahNumber}</p>
      <p dir="rtl" lang="ar" className="font-serif text-2xl leading-[2.1] text-foreground break-words">{ayah.arabic}</p>
      <div><p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Translation</p><p className="text-sm leading-relaxed text-foreground">{ayah.translation}</p></div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={`/quran/${ayah.surahNumber}?ayah=${ayah.ayahNumber}`} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"><BookOpen className="h-4 w-4" /> Read in Quran</Link>
        <button type="button" onClick={() => new Audio(getAudioUrl(ayah.audioGlobalNumber)).play().catch(() => {})} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"><Volume2 className="h-4 w-4" /> Listen</button>
        <button type="button" onClick={toggleBookmark} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"><BookmarkIcon className="h-4 w-4" /> {bookmarked ? "Bookmarked" : "Bookmark"}</button>
      </div>
    </article>
  );
}

export function QuranAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  async function ask(value = question) {
    const text = value.trim();
    if (!text || loading) return;
    setQuestion(""); setError(""); setLoading(true);
    setMessages((current) => [...current, { role: "user", text }]);
    try {
      const answer = await noorApi.askQuranAssistant(text);
      setMessages((current) => [...current, { role: "assistant", answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to answer right now.");
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col pb-24 md:pb-8">
      <header className="mb-5 flex items-center gap-3">
        <Link href="/more" className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <div><h1 className="flex items-center gap-2 text-2xl font-serif font-bold text-primary"><Bot className="h-7 w-7" /> Quran Assistant</h1><p className="text-sm text-muted-foreground">Ask about the Quran</p></div>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm"><MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold text-foreground">Ask about the Quran</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Understand verses, explore Quranic guidance, and learn more.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{examples.map((item) => <button key={item} type="button" onClick={() => void ask(item)} className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-muted">{item}</button>)}</div></section>}
        {messages.map((message, index) => message.role === "user" ? <div key={index} className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">{message.text}</div> : <div key={index} className="space-y-3"><div className="rounded-2xl rounded-bl-md border border-border bg-muted p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Explanation</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.answer?.explanation || "No explanation was returned."}</p>{message.answer?.guidance && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">General Guidance</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.answer.guidance}</p></>}</div>{message.answer?.ayahs.map((ayah) => <QuranCard key={`${ayah.surahNumber}:${ayah.ayahNumber}`} ayah={ayah} />)}</div>)}
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking verified Quran sources…</div>}
        {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="sticky bottom-0 mt-4 flex items-end gap-2 border-t border-border bg-background/95 py-3 backdrop-blur">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} maxLength={1200} placeholder="Ask a question about the Quran…" className="min-h-12 flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" dir="auto" />
        <button type="submit" disabled={loading || !question.trim()} aria-label="Send question" className="rounded-2xl bg-primary p-3 text-primary-foreground disabled:opacity-50"><Send className="h-5 w-5" /></button>
      </form>
    </div>
  );
}