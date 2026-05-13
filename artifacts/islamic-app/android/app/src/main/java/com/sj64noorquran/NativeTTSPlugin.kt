package com.sj64noorquran

import android.os.Build
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap

/**
 * NativeTTSPlugin — wraps Android's native TextToSpeech engine so that
 * Capacitor WebView apps get reliable TTS on Android without depending on
 * the unreliable Web Speech API (speechSynthesis) shim in WebView.
 *
 * Auto-discovered by BridgeActivity via @CapacitorPlugin — no manual
 * registration needed in MainActivity.
 *
 * Each speak() call returns a Promise that resolves when the utterance
 * finishes (or rejects on error / unsupported language), making it easy
 * to chain multiple chunks sequentially from TypeScript.
 */
@CapacitorPlugin(name = "NativeTTS")
class NativeTTSPlugin : Plugin() {

    private var tts: TextToSpeech? = null
    private var isReady = false

    // Maps utterance IDs → pending PluginCall so we can resolve on completion
    private val pending = ConcurrentHashMap<String, PluginCall>()

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    override fun load() {
        tts = TextToSpeech(context) { status ->
            isReady = (status == TextToSpeech.SUCCESS)
            if (isReady) attachProgressListener()
        }
    }

    private fun attachProgressListener() {
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String) {
                // no-op: we resolve on done, not on start
            }

            override fun onDone(utteranceId: String) {
                pending.remove(utteranceId)?.resolve()
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String) {
                pending.remove(utteranceId)?.reject("TTS_ERROR")
            }

            override fun onError(utteranceId: String, errorCode: Int) {
                pending.remove(utteranceId)?.reject("TTS_ERROR_$errorCode")
            }
        })
    }

    override fun handleOnDestroy() {
        tts?.stop()
        tts?.shutdown()
        tts = null
        pending.values.forEach { it.resolve() }
        pending.clear()
        super.handleOnDestroy()
    }

    // ── Plugin methods ─────────────────────────────────────────────────────────

    /**
     * speak({ text, lang, rate, pitch })
     *
     * Speaks text using the Android TTS engine.
     * Promise resolves when utterance finishes.
     * Rejects with "LANG_NOT_SUPPORTED" when the language pack is not installed.
     */
    @PluginMethod
    fun speak(call: PluginCall) {
        if (!isReady) {
            call.reject("TTS_NOT_READY")
            return
        }

        val text  = call.getString("text") ?: run { call.reject("NO_TEXT"); return }
        val lang  = call.getString("lang") ?: "en-US"
        val rate  = call.getFloat("rate")  ?: 0.85f
        val pitch = call.getFloat("pitch") ?: 1.0f

        // Try the full BCP-47 tag first, then the base language
        val locale = Locale.forLanguageTag(lang)
        var result = tts?.setLanguage(locale) ?: TextToSpeech.LANG_NOT_SUPPORTED

        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            val base = Locale(locale.language)
            result = tts?.setLanguage(base) ?: TextToSpeech.LANG_NOT_SUPPORTED
        }

        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            call.reject("LANG_NOT_SUPPORTED")
            return
        }

        tts?.setSpeechRate(rate)
        tts?.setPitch(pitch)

        val uttId = "noor_${System.nanoTime()}"
        pending[uttId] = call

        val speakResult: Int = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, Bundle(), uttId) ?: TextToSpeech.ERROR
        } else {
            @Suppress("DEPRECATION")
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH,
                hashMapOf(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID to uttId)
            ) ?: TextToSpeech.ERROR
        }

        if (speakResult == TextToSpeech.ERROR) {
            pending.remove(uttId)
            call.reject("TTS_SPEAK_FAILED")
        }
    }

    /**
     * stop()
     *
     * Immediately stops any ongoing speech.
     * All pending speak() Promises resolve (not reject) so the TypeScript
     * caller's gen-guard logic handles the cancellation cleanly.
     */
    @PluginMethod
    fun stop(call: PluginCall) {
        tts?.stop()
        val snapshot = pending.toMap()
        pending.clear()
        snapshot.values.forEach { it.resolve() }
        call.resolve()
    }

    /**
     * getSupportedLanguages()
     *
     * Returns { languages: string[] } — BCP-47 tags of all voices installed
     * on the device.  Used to check whether a language voice is available
     * before attempting TTS so the UI can show a helpful message.
     */
    @PluginMethod
    fun getSupportedLanguages(call: PluginCall) {
        val langs = mutableSetOf<String>()
        try {
            val voices = tts?.voices
            if (voices != null) {
                for (v in voices) langs.add(v.locale.toLanguageTag())
            } else {
                // Fallback: probe each language we care about
                val probeLocales = listOf(
                    Locale("en", "US"), Locale("ur", "PK"), Locale("hi", "IN"),
                    Locale("bn", "IN"), Locale("tr", "TR"), Locale("id", "ID"),
                    Locale("fr", "FR"), Locale("es", "ES"), Locale("ms", "MY"),
                )
                for (loc in probeLocales) {
                    val r = tts?.isLanguageAvailable(loc) ?: continue
                    if (r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED) {
                        langs.add(loc.toLanguageTag())
                    }
                }
            }
        } catch (_: Exception) {}

        val obj = JSObject()
        obj.put("languages", JSArray(langs.toList()))
        call.resolve(obj)
    }
}
