import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Volume2 } from "lucide-react";
import type { TranslationLanguage } from "@/lib/api";
import { TTS_LANG_CODES } from "@/lib/translation-language-metadata";
import { NativeTTS } from "@/lib/native-tts";

interface TeacherSpeechListenButtonProps {
  text: string;
  language: TranslationLanguage;
  label: string;
  testId?: string;
  className?: string;
}

/**
 * Small, inline TTS control for Teacher feedback. It deliberately uses the
 * selected Quran translation language rather than the app UI language.
 */
export function TeacherSpeechListenButton({
  text,
  language,
  label,
  testId,
  className = "",
}: TeacherSpeechListenButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => () => {
    requestRef.current += 1;
    NativeTTS.stop().catch(() => {});
  }, []);

  const speak = async () => {
    const value = text.trim();
    if (!value) return;

    const request = ++requestRef.current;
    setSpeaking(true);
    try {
      await NativeTTS.stop();
      if (request !== requestRef.current) return;
      await NativeTTS.speak({
        text: value,
        lang: TTS_LANG_CODES[language],
        rate: 0.85,
        pitch: 1,
      });
    } catch {
      // Text remains available if a device has not installed the requested
      // voice. The existing native bridge reports that failure explicitly.
    } finally {
      if (request === requestRef.current) setSpeaking(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => { speak().catch(() => {}); }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-95 ${className}`}
      aria-label={label}
      title={label}
      data-testid={testId}
    >
      {speaking ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <Volume2 className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

interface TeacherSpeechMessageProps {
  children: ReactNode;
  spokenText: string;
  language: TranslationLanguage;
  listenLabel: string;
  testId?: string;
  className?: string;
  contentClassName?: string;
}

/** A feedback/guidance message with an accessible inline Listen action. */
export function TeacherSpeechMessage({
  children,
  spokenText,
  language,
  listenLabel,
  testId,
  className = "",
  contentClassName = "",
}: TeacherSpeechMessageProps) {
  return (
    <div className={`flex items-start gap-2 ${className}`}>
      <div className={`min-w-0 flex-1 ${contentClassName}`}>{children}</div>
      <TeacherSpeechListenButton
        text={spokenText}
        language={language}
        label={listenLabel}
        testId={testId}
      />
    </div>
  );
}