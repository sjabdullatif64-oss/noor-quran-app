import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, BookOpen, Bot, Clock3, History, Loader2, MessageCircle, Pause, Play, Plus, Send, Sparkles, Volume2, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getAudioUrl } from "@/lib/api";
import { isNative } from "@/lib/capacitor";
import { NativeTTS } from "@/lib/native-tts";
import { getQuranAssistantSpeechLanguage } from "@/lib/quran-assistant-speech";
import { noorApi, NoorApiError, type QuranAssistantAyah, type QuranAssistantUsage } from "@/lib/noor-api";
import { getBookmarks, removeBookmark, saveBookmark } from "@/lib/bookmarks";
import { ensureRegistered } from "@/lib/user";
import { buildQuranAssistantRequestText, clearQuranAssistantContext, readQuranAssistantContext, type QuranAssistantContext } from "@/lib/quran-assistant-context";
import {
  createQuranAssistantChat,
  createQuranAssistantId,
  getQuranAssistantChatTitle,
  loadQuranAssistantStorage,
  saveQuranAssistantStorage,
  type QuranAssistantChat,
  type QuranAssistantMessage,
} from "@/lib/quran-assistant-storage";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Message = QuranAssistantMessage;

const examples = ["Explain an Ayah", "Verse about patience", "Verse for difficult times", "Quranic guidance about forgiveness"];
const MAX_COMPOSER_HEIGHT = 200;

type AyahAudioSession = {
  key: string;
  audio: HTMLAudioElement;
  status: "playing" | "paused";
  generation: number;
};

let ayahAudioSession: AyahAudioSession | null = null;
const ayahAudioListeners = new Set<() => void>();

function notifyAyahAudioListeners() {
  ayahAudioListeners.forEach((listener) => listener());
}

function releaseAyahAudio(session: AyahAudioSession | null = ayahAudioSession) {
  if (!session || ayahAudioSession !== session) return;
  session.generation += 1;
  session.audio.onended = null;
  session.audio.onerror = null;
  session.audio.pause();
  session.audio.removeAttribute("src");
  session.audio.load();
  ayahAudioSession = null;
  notifyAyahAudioListeners();
}

export function stopAyahAudio() {
  releaseAyahAudio();
}

function toggleAyahAudio(key: string, url: string) {
  const current = ayahAudioSession;

  if (current?.key === key) {
    const generation = current.generation;
    if (current.status === "playing") {
      current.audio.pause();
      current.status = "paused";
      notifyAyahAudioListeners();
      return;
    }

    current.status = "playing";
    notifyAyahAudioListeners();
    current.audio.play().catch(() => {
      if (ayahAudioSession === current && current.generation === generation) {
        releaseAyahAudio(current);
      }
    });
    return;
  }

  releaseAyahAudio();

  const audio = new Audio(url);
  audio.preload = "auto";
  const session: AyahAudioSession = {
    key,
    audio,
    status: "playing",
    generation: 0,
  };
  ayahAudioSession = session;
  audio.onended = () => releaseAyahAudio(session);
  audio.onerror = () => releaseAyahAudio(session);
  notifyAyahAudioListeners();

  audio.play().catch(() => {
    if (ayahAudioSession === session && session.generation === 0) {
      releaseAyahAudio(session);
    }
  });
}

function useAyahAudioSession() {
  const [, refresh] = useState(0);

  useEffect(() => {
    const listener = () => refresh((value) => value + 1);
    ayahAudioListeners.add(listener);
    return () => { ayahAudioListeners.delete(listener); };
  }, []);

  return ayahAudioSession;
}

function QuranCard({ ayah }: { ayah: QuranAssistantAyah }) {
  const [bookmarked, setBookmarked] = useState(() => getBookmarks().some((b) => b.type !== "surah" && b.surahNumber === ayah.surahNumber && b.ayahNumber === ayah.ayahNumber));
  const audioSession = useAyahAudioSession();
  const audioKey = `${ayah.surahNumber}:${ayah.ayahNumber}`;
  const isCurrentAudio = audioSession?.key === audioKey;
  const isPlaying = isCurrentAudio && audioSession.status === "playing";
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
        <button
          type="button"
          onClick={() => toggleAyahAudio(audioKey, getAudioUrl(ayah.audioGlobalNumber))}
          aria-label={isPlaying ? "Pause Ayah audio" : isCurrentAudio ? "Resume Ayah audio" : "Play Ayah audio"}
          aria-pressed={isPlaying}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
        >
          {isPlaying ? <Pause className="h-4 w-4" aria-hidden="true" /> : isCurrentAudio ? <Play className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
          {isPlaying ? "Pause" : isCurrentAudio ? "Resume" : "Listen"}
        </button>
        <button type="button" onClick={toggleBookmark} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"><BookmarkIcon className="h-4 w-4" /> {bookmarked ? "Bookmarked" : "Bookmark"}</button>
      </div>
    </article>
  );
}

type SpeechStatus = "idle" | "playing" | "paused";

function getSpeechText(answer: Message["answer"]) {
  if (!answer) return "";
  return [
    answer.explanation ? `Explanation. ${answer.explanation}` : "",
    answer.guidance ? `General guidance. ${answer.guidance}` : "",
  ].filter(Boolean).join("\n\n");
}

function getNativeSpeechLanguage(language?: string): string {
  return language?.trim() || "en-US";
}

function splitNativeSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?…。！？]+[.!?…。！？]+|[^.!?…。！？]+$/g) ?? [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 260) {
      chunks.push(trimmed);
      continue;
    }
    const words = trimmed.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && candidate.length > 260) {
        chunks.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) chunks.push(current);
  }
  return chunks.length ? chunks : [text.trim()];
}

export function QuranAssistant() {
  const [initialStorage] = useState(loadQuranAssistantStorage);
  const initialChat = initialStorage.chats.find((chat) => chat.id === initialStorage.activeChatId) ?? initialStorage.chats[0];
  const [, navigate] = useLocation();
  const hasAyahContext = new URLSearchParams(window.location.search).get("context") === "ayah";
  const [chats, setChats] = useState<QuranAssistantChat[]>(initialStorage.chats);
  const [activeChatId, setActiveChatId] = useState(initialStorage.activeChatId);
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [question, setQuestion] = useState(initialChat.draft);
  const [ayahContext, setAyahContext] = useState<QuranAssistantContext | null>(() => (
    hasAyahContext ? readQuranAssistantContext() : initialChat.ayahContext
  ));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newChatPromptOpen, setNewChatPromptOpen] = useState(false);
  const [usage, setUsage] = useState<QuranAssistantUsage | null>(null);
  const [usageNow, setUsageNow] = useState(() => Date.now());
  const [registeredDeviceId, setRegisteredDeviceId] = useState<string | null>(null);
  const questionRef = useRef(initialChat.draft);
  const ayahContextRef = useRef<QuranAssistantContext | null>(
    hasAyahContext ? readQuranAssistantContext() : initialChat.ayahContext,
  );
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);
  const askInFlightRef = useRef(false);
  const speechRef = useRef<{ id: string; utterance: SpeechSynthesisUtterance } | null>(null);
  const nativeSpeechRef = useRef<{
    id: string;
    chunks: string[];
    chunkIndex: number;
    language: string;
    paused: boolean;
    generation: number;
  } | null>(null);
  const nativeSpeechGenerationRef = useRef(0);

  useEffect(() => {
    const input = questionInputRef.current;
    if (!input) return;
    input.style.height = "auto";
    const nextHeight = Math.min(input.scrollHeight, MAX_COMPOSER_HEIGHT);
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight > MAX_COMPOSER_HEIGHT ? "auto" : "hidden";
  }, [question]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      const activeSpeech = speechRef.current;
      if (activeSpeech) {
        activeSpeech.utterance.onend = null;
        activeSpeech.utterance.onerror = null;
        activeSpeech.utterance.onpause = null;
        activeSpeech.utterance.onresume = null;
        window.speechSynthesis?.cancel();
        speechRef.current = null;
      }
      const activeNativeSpeech = nativeSpeechRef.current;
      if (activeNativeSpeech) {
        nativeSpeechGenerationRef.current += 1;
        nativeSpeechRef.current = null;
        void NativeTTS.stop().catch(() => {});
      }
      stopAyahAudio();
    };
  }, []);

  useEffect(() => {
    setChats((currentChats) => {
      const updatedChats = currentChats.map((chat) => {
        if (chat.id !== activeChatId) return chat;
        const updatedChat: QuranAssistantChat = {
          ...chat,
          title: getQuranAssistantChatTitle({ ...chat, messages }),
          messages,
          draft: question,
          ayahContext,
          updatedAt: Date.now(),
        };
        return updatedChat;
      });
      saveQuranAssistantStorage({ version: 1, activeChatId, chats: updatedChats });
      return updatedChats;
    });
  }, [activeChatId, ayahContext, messages, question]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const user = await ensureRegistered();
      if (!user || cancelled) return;
      setRegisteredDeviceId(user.deviceId);
      try {
        const result = await noorApi.getQuranAssistantUsage(user.deviceId);
        if (!cancelled) setUsage(result.usage);
      } catch {
        // The server remains authoritative when a question is sent. Keep the
        // Assistant usable if the non-blocking indicator request fails.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setUsageNow(now);
      const resetMs = usage?.resetAt ? Date.parse(usage.resetAt) : NaN;
      if (registeredDeviceId && usage?.remaining === 0 && Number.isFinite(resetMs) && now >= resetMs) {
        void noorApi.getQuranAssistantUsage(registeredDeviceId)
          .then((result) => setUsage(result.usage))
          .catch(() => {});
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [registeredDeviceId, usage]);

  function resetSpeechState() {
    speechRef.current = null;
    nativeSpeechRef.current = null;
    if (mountedRef.current) {
      setSpeakingMessageId(null);
      setSpeechStatus("idle");
    }
  }

  function stopSpeech() {
    const activeSpeech = speechRef.current;
    const activeNativeSpeech = nativeSpeechRef.current;
    if (activeSpeech) {
      activeSpeech.utterance.onend = null;
      activeSpeech.utterance.onerror = null;
      activeSpeech.utterance.onpause = null;
      activeSpeech.utterance.onresume = null;
      window.speechSynthesis?.cancel();
    }
    if (activeNativeSpeech) {
      nativeSpeechGenerationRef.current += 1;
      nativeSpeechRef.current = null;
      void NativeTTS.stop().catch(() => {});
    }
    if (!activeSpeech && !activeNativeSpeech) return;
    resetSpeechState();
  }

  async function speakNativeChunk(session: NonNullable<typeof nativeSpeechRef.current>) {
    const current = nativeSpeechRef.current;
    if (!current || current !== session || current.paused || current.generation !== nativeSpeechGenerationRef.current) return;

    try {
      await NativeTTS.speak({
        text: current.chunks[current.chunkIndex],
        lang: current.language,
        rate: 0.95,
        pitch: 1,
      });
    } catch {
      if (nativeSpeechRef.current === session && session.generation === nativeSpeechGenerationRef.current) {
        nativeSpeechRef.current = null;
        resetSpeechState();
        setError("Unable to play the AI explanation right now.");
      }
      return;
    }

    const finishedSession = nativeSpeechRef.current;
    if (!finishedSession || finishedSession !== session || finishedSession.paused || finishedSession.generation !== nativeSpeechGenerationRef.current) return;
    if (finishedSession.chunkIndex < finishedSession.chunks.length - 1) {
      finishedSession.chunkIndex += 1;
      void speakNativeChunk(finishedSession);
    } else {
      nativeSpeechRef.current = null;
      resetSpeechState();
    }
  }

  function startNativeSpeech(id: string, text: string, language?: string): boolean {
    if (!isNative() || !text) return false;
    stopSpeech();
    const session = {
      id,
      chunks: splitNativeSpeech(text),
      chunkIndex: 0,
      language: getNativeSpeechLanguage(language),
      paused: false,
      generation: nativeSpeechGenerationRef.current,
    };
    nativeSpeechRef.current = session;
    setSpeakingMessageId(id);
    setSpeechStatus("playing");
    void speakNativeChunk(session);
    return true;
  }

  function toggleSpeech(id: string, text: string, language?: string) {
    if (!text) return;
    const speechLanguage = getQuranAssistantSpeechLanguage(text, language);

    const nativeSpeech = nativeSpeechRef.current;
    if (isNative()) {
      if (nativeSpeech?.id === id) {
        if (speechStatus === "playing") {
          nativeSpeech.paused = true;
          setSpeechStatus("paused");
          void NativeTTS.stop().catch(() => {});
        } else if (speechStatus === "paused") {
          nativeSpeech.paused = false;
          setSpeechStatus("playing");
          void speakNativeChunk(nativeSpeech);
        }
        return;
      }
      if (startNativeSpeech(id, text, speechLanguage)) return;
    }

    const synthesis = window.speechSynthesis;
    if (!synthesis) {
      setError("Audio playback is not available on this device.");
      return;
    }

    const activeSpeech = speechRef.current;
    if (activeSpeech?.id === id) {
      if (speechStatus === "playing") {
        synthesis.pause();
        setSpeechStatus("paused");
      } else if (speechStatus === "paused") {
        synthesis.resume();
        setSpeechStatus("playing");
      }
      return;
    }

    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLanguage;
    utterance.rate = 0.95;
    speechRef.current = { id, utterance };
    setSpeakingMessageId(id);
    setSpeechStatus("playing");

    utterance.onpause = () => {
      if (speechRef.current?.utterance === utterance) setSpeechStatus("paused");
    };
    utterance.onresume = () => {
      if (speechRef.current?.utterance === utterance) setSpeechStatus("playing");
    };
    utterance.onend = () => {
      if (speechRef.current?.utterance === utterance) resetSpeechState();
    };
    utterance.onerror = () => {
      if (speechRef.current?.utterance === utterance) {
        resetSpeechState();
        setError("Unable to play the AI explanation right now.");
      }
    };

    // Clear a browser-wide paused state left by another speech session before
    // starting this page's single owned utterance.
    synthesis.cancel();
    synthesis.resume();
    synthesis.speak(utterance);
  }

  function openChat(chat: QuranAssistantChat) {
    stopSpeech();
    stopAyahAudio();
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setQuestion(chat.draft);
    questionRef.current = chat.draft;
    setAyahContext(chat.ayahContext);
    ayahContextRef.current = chat.ayahContext;
    setError("");
    setHistoryOpen(false);
  }

  function startNewChat() {
    stopSpeech();
    stopAyahAudio();
    clearQuranAssistantContext();
    navigate("/quran-assistant");
    const chat = createQuranAssistantChat();
    setChats((currentChats) => [chat, ...currentChats]);
    setActiveChatId(chat.id);
    setMessages([]);
    setQuestion("");
    questionRef.current = "";
    setAyahContext(null);
    ayahContextRef.current = null;
    setError("");
    setNewChatPromptOpen(false);
    setHistoryOpen(false);
  }

  function requestNewChat() {
    if (messages.length > 0) {
      setNewChatPromptOpen(true);
      return;
    }
    startNewChat();
  }

  function formatChatDate(timestamp: number): string {
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(timestamp);
    } catch {
      return "";
    }
  }

  function formatUsageReset(resetAt: string): string {
    const resetMs = Date.parse(resetAt);
    if (!Number.isFinite(resetMs)) return "Reset time unavailable";
    const remainingMs = Math.max(0, resetMs - usageNow);
    const totalMinutes = Math.ceil(remainingMs / 60_000);
    if (totalMinutes <= 0) return "Resetting now";
    if (totalMinutes < 60) return `Resets in about ${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `Resets in about ${hours}h${minutes ? ` ${minutes}m` : ""}`;
  }

  async function ask(value = questionRef.current) {
    const text = value.trim();
    if (!text || loading || askInFlightRef.current) return;
    askInFlightRef.current = true;
    const usageResetMs = usage?.resetAt ? Date.parse(usage.resetAt) : NaN;
    if (usage?.remaining === 0 && (!Number.isFinite(usageResetMs) || Date.now() < usageResetMs)) {
      setError("");
      askInFlightRef.current = false;
      return;
    }
    const requestText = buildQuranAssistantRequestText(ayahContextRef.current, text);
    setError(""); setLoading(true);
    const messageId = createQuranAssistantId("message");
    const userMessage: Message = {
      id: messageId,
      role: "user",
      text,
      createdAt: Date.now(),
    };
    const user = registeredDeviceId
      ? { deviceId: registeredDeviceId }
      : await ensureRegistered();
    if (!user) {
      setQuestion(text);
      setLoading(false);
      setError("Registration is required before using Quran Assistant.");
      askInFlightRef.current = false;
      return;
    }
    setRegisteredDeviceId(user.deviceId);
    setQuestion("");
    questionRef.current = "";
    setMessages((current) => [...current, userMessage]);
    try {
      const answer = await noorApi.askQuranAssistant(requestText, undefined, user.deviceId);
      if (answer.usage) setUsage(answer.usage);
      setMessages((current) => [...current, {
        id: createQuranAssistantId("message"),
        role: "assistant",
        answer,
        createdAt: Date.now(),
      }]);
    } catch (e) {
      if (e instanceof NoorApiError && e.status === 429) {
        const serverUsage = (e.data as { usage?: QuranAssistantUsage } | null)?.usage;
        if (serverUsage) setUsage(serverUsage);
        setQuestion(text);
        setMessages((current) => current.filter((message) => message.id !== messageId));
        setError("");
      } else {
        setError(e instanceof Error ? e.message : "Unable to answer right now.");
      }
    } finally {
      setLoading(false);
      askInFlightRef.current = false;
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="mb-5 flex shrink-0 items-center gap-3">
        <Link href={ayahContext ? `/quran/${ayahContext.surahNumber}?ayah=${ayahContext.ayahNumber}` : "/more"} className="rounded-xl p-2 text-muted-foreground hover:bg-muted" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-2xl font-serif font-bold text-primary"><Bot className="h-7 w-7 shrink-0" /> <span className="truncate">Quran Assistant</span></h1><p className="text-sm text-muted-foreground">Ask about the Quran</p><p className="text-xs text-muted-foreground" data-testid="quran-assistant-usage">{usage ? `Questions remaining: ${usage.remaining}/${usage.limit}` : "Checking question limit…"}</p>{usage?.remaining === 0 && <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Daily limit reached · {formatUsageReset(usage.resetAt)}</p>}</div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setHistoryOpen(true)} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="Chat History" title="Chat History" data-testid="button-quran-assistant-history">
            <History className="h-5 w-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={requestNewChat} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" aria-label="New Chat" title="New Chat" data-testid="button-quran-assistant-new-chat">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain overscroll-x-none px-0.5 pb-2 pr-1">
        {messages.length === 0 && <section className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm"><MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold text-foreground">Ask about the Quran</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Understand verses, explore Quranic guidance, and learn more.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{examples.map((item) => <button key={item} type="button" onClick={() => void ask(item)} className="rounded-full border border-border px-3 py-2 text-xs text-foreground hover:bg-muted">{item}</button>)}</div></section>}
         {messages.map((message) => message.role === "user" ? <div key={message.id} className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground">{message.text}</div> : <div key={message.id} className="space-y-3"><div className="rounded-2xl rounded-bl-md border border-border bg-muted p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Explanation</p>{getSpeechText(message.answer) && <button type="button" onClick={() => toggleSpeech(message.id, getSpeechText(message.answer), message.answer?.language)} aria-label={speakingMessageId === message.id && speechStatus === "playing" ? "Pause AI explanation audio" : speakingMessageId === message.id && speechStatus === "paused" ? "Resume AI explanation audio" : "Play AI explanation audio"} aria-pressed={speakingMessageId === message.id && speechStatus === "playing"} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{speakingMessageId === message.id && speechStatus === "playing" ? <Pause className="h-4 w-4" aria-hidden="true" /> : speakingMessageId === message.id && speechStatus === "paused" ? <Play className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}{speakingMessageId === message.id && speechStatus === "playing" ? "Pause" : speakingMessageId === message.id && speechStatus === "paused" ? "Resume" : "Audio"}</button>}</div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.answer?.explanation || "No explanation was returned."}</p>{message.answer?.guidance && <><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">General Guidance</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.answer.guidance}</p></>}</div>{message.answer?.ayahs.map((ayah) => <QuranCard key={`${ayah.surahNumber}:${ayah.ayahNumber}`} ayah={ayah} />)}</div>)}
        {usage?.remaining === 0 && <div role="status" className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100" data-testid="quran-assistant-daily-limit">
          <p className="font-semibold">Daily limit reached</p>
          <p className="mt-1 leading-relaxed">You’ve used your {usage.limit} Quran Assistant questions for this 24-hour period. You can ask more questions when your limit resets.</p>
          <p className="mt-2 text-xs font-medium">{formatUsageReset(usage.resetAt)} · approximately {formatChatDate(Date.parse(usage.resetAt))}</p>
        </div>}
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking verified Quran sources…</div>}
        {error && <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        <div ref={endRef} />
      </div>
      {ayahContext && <section className="mt-4 shrink-0 rounded-2xl border border-primary/25 bg-primary/5 p-4" data-testid="quran-assistant-context">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">About this Ayah</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Surah {ayahContext.surahEnglishName} · Ayah {ayahContext.ayahNumber}
            </p>
            <p className="text-xs text-muted-foreground">{ayahContext.surahName}</p>
          </div>
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        </div>
        <p dir="rtl" lang="ar" className="mt-3 max-h-24 overflow-y-auto rounded-xl bg-card px-3 py-2 text-right font-arabic text-xl leading-[2] text-foreground">
          {ayahContext.arabic}
        </p>
        {ayahContext.translation && <p dir="auto" className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{ayahContext.translation}</p>}
        <button type="button" onClick={() => {
          const suggestedQuestion = "Explain this Ayah";
          questionRef.current = suggestedQuestion;
          setQuestion(suggestedQuestion);
        }} className="mt-3 rounded-xl border border-primary/25 bg-card px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-background" data-testid="button-suggest-explain-ayah">
          Explain this Ayah
        </button>
      </section>}
      <form onSubmit={(event) => { event.preventDefault(); void ask(questionRef.current); }} className="relative z-10 mt-4 flex shrink-0 items-end gap-2 border-t border-border bg-background/95 px-1 pt-3 pb-2 backdrop-blur">
        <textarea
          ref={questionInputRef}
          value={question}
          onChange={(event) => {
            const value = event.currentTarget.value;
            questionRef.current = value;
            setQuestion(value);
          }}
          rows={1}
          maxLength={1200}
          placeholder="Ask a question about the Quran…"
          aria-label="Question for Quran Assistant"
          enterKeyHint="send"
          inputMode="text"
          autoComplete="on"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck={true}
          className="min-h-12 min-w-0 flex-1 resize-none overflow-hidden rounded-2xl border border-border bg-card px-4 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
          dir="auto"
          data-testid="input-quran-assistant-question"
        />
        <button type="submit" disabled={loading || !question.trim()} aria-label="Send question" className="rounded-2xl bg-primary p-3 text-primary-foreground disabled:opacity-50"><Send className="h-5 w-5" /></button>
      </form>

      {historyOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="presentation">
        <section className="flex max-h-[min(80dvh,44rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-background shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="quran-assistant-history-title">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 id="quran-assistant-history-title" className="font-semibold text-foreground">Chat History</h2>
              <p className="text-xs text-muted-foreground">Your conversations are stored on this device.</p>
            </div>
            <button type="button" onClick={() => setHistoryOpen(false)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close Chat History">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto p-3">
            {[...chats].sort((a, b) => b.updatedAt - a.updatedAt).map((chat) => (
              <button key={chat.id} type="button" onClick={() => openChat(chat)} className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors hover:bg-muted ${chat.id === activeChatId ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`} data-testid={`history-chat-${chat.id}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{getQuranAssistantChatTitle(chat)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatChatDate(chat.updatedAt)} · {chat.messages.length} {chat.messages.length === 1 ? "message" : "messages"}</p>
                </div>
                {chat.id === activeChatId && <span className="shrink-0 text-xs font-medium text-primary">Current</span>}
              </button>
            ))}
          </div>
          <div className="border-t border-border px-5 py-3">
            <button type="button" onClick={() => setHistoryOpen(false)} className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Return to current chat
            </button>
          </div>
        </section>
      </div>}

      <AlertDialog open={newChatPromptOpen} onOpenChange={setNewChatPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new chat?</AlertDialogTitle>
            <AlertDialogDescription>Your current conversation will remain available in Chat History.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={startNewChat}>New Chat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}