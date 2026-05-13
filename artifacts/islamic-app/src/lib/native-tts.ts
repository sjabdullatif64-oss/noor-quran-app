/**
 * native-tts.ts
 *
 * Capacitor bridge for native Android TextToSpeech.
 *
 * On Android the plugin is NativeTTSPlugin.kt which calls the Android TTS
 * engine directly — no WebView speechSynthesis involved.
 *
 * On web/desktop the WebPlugin fallback uses speechSynthesis so the app
 * still works during local development.
 *
 * Usage:
 *   import { NativeTTS } from "@/lib/native-tts";
 *   await NativeTTS.speak({ text: "Hello", lang: "en-US", rate: 0.85 });
 *   await NativeTTS.stop();
 *   const { languages } = await NativeTTS.getSupportedLanguages();
 */

import { registerPlugin, WebPlugin } from "@capacitor/core";

// ── Plugin interface ──────────────────────────────────────────────────────────

export interface NativeTTSSpeakOptions {
  text:   string;
  lang?:  string;  // BCP-47 tag e.g. "ur-PK", "en-US"
  rate?:  number;  // 0.1 – 4.0, default 0.85
  pitch?: number;  // 0.1 – 2.0, default 1.0
}

export interface NativeTTSPlugin {
  /** Speak text. Resolves when the utterance finishes. */
  speak(opts: NativeTTSSpeakOptions): Promise<void>;

  /** Immediately stop any in-progress speech. */
  stop(): Promise<void>;

  /** Return BCP-47 tags of all TTS voices installed on the device. */
  getSupportedLanguages(): Promise<{ languages: string[] }>;
}

// ── Web fallback (speechSynthesis) ────────────────────────────────────────────

class NativeTTSWeb extends WebPlugin implements NativeTTSPlugin {
  // Track active utterance so stop() can cancel it
  private activeReject: ((e: Error) => void) | null = null;

  async speak(opts: NativeTTSSpeakOptions): Promise<void> {
    if (!("speechSynthesis" in window)) {
      throw new Error("TTS_NOT_SUPPORTED");
    }

    return new Promise<void>((resolve, reject) => {
      this.activeReject = reject;

      const ss  = window.speechSynthesis;
      const utt = new SpeechSynthesisUtterance(opts.text);
      utt.lang  = opts.lang  ?? "en-US";
      utt.rate  = opts.rate  ?? 0.85;
      utt.pitch = opts.pitch ?? 1.0;

      // Try to find a matching voice
      const voices  = ss.getVoices();
      const code    = opts.lang ?? "en-US";
      const prefix  = code.split("-")[0];
      const matched =
        voices.find((v) => v.lang === code) ??
        voices.find((v) => v.lang.startsWith(prefix)) ??
        voices.find((v) => v.default) ??
        voices[0];
      if (matched) utt.voice = matched;

      utt.onend = () => {
        this.activeReject = null;
        resolve();
      };

      utt.onerror = (e) => {
        this.activeReject = null;
        // "interrupted" / "canceled" mean we called stop() — treat as resolved
        if (e.error === "interrupted" || e.error === "canceled") {
          resolve();
        } else {
          reject(new Error(`TTS_ERROR: ${e.error}`));
        }
      };

      // Android WebView paused-state fix: always resume before speaking
      ss.cancel();
      ss.resume();
      ss.speak(utt);
    });
  }

  async stop(): Promise<void> {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    // The onerror("canceled") handler will resolve the pending speak() promise
    this.activeReject = null;
  }

  async getSupportedLanguages(): Promise<{ languages: string[] }> {
    if (!("speechSynthesis" in window)) return { languages: [] };
    const voices = window.speechSynthesis.getVoices();
    return { languages: voices.map((v) => v.lang) };
  }
}

// ── Registration ──────────────────────────────────────────────────────────────

export const NativeTTS = registerPlugin<NativeTTSPlugin>("NativeTTS", {
  web: () => new NativeTTSWeb(),
});
