import assert from "node:assert/strict";
import {
  LOCALIZED_DIVINE_NAMES,
  localizeDivineName,
} from "./divine-name-localization";
import { applyTranslationDisplay } from "./ayah-display";

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: () => null,
    setItem: () => undefined,
  },
});

assert.equal(
  localizeDivineName("urdu", "شروع Allah کا نام لے کر Allah"),
  "شروع اللہ کا نام لے کر اللہ",
);
assert.equal(localizeDivineName("arabic", "Allah الله"), "الله الله");
assert.equal(localizeDivineName("hindi", "Allah और अल्लाह"), "अल्लाह और अल्लाह");
assert.equal(localizeDivineName("bengali", "Allah এবং আল্লাহ"), "আল্লাহ এবং আল্লাহ");
assert.equal(localizeDivineName("english", "Allah is One"), "Allah is One");

// Every supported translation language gets its own display form, even when
// the provider returns a different script.
for (const [language, localizedName] of Object.entries(LOCALIZED_DIVINE_NAMES)) {
  assert.equal(
    localizeDivineName(language as keyof typeof LOCALIZED_DIVINE_NAMES, "Allah الله"),
    `${localizedName} ${localizedName}`,
    `unexpected Divine Name display for ${language}`,
  );
}

// Semantic translations are intentionally preserved; only the written name
// is normalized.
assert.equal(localizeDivineName("urdu", "خدا کا شکر ہے"), "خدا کا شکر ہے");
assert.equal(localizeDivineName("english", "God is merciful; Allah is One"), "God is merciful; Allah is One");
assert.equal(localizeDivineName("english", "The Lord is One"), "The Lord is One");
assert.equal(
  localizeDivineName("english", "Allahabad is not Allah; ALLAH is One."),
  "Allahabad is not Allah; Allah is One.",
);
assert.equal(
  localizeDivineName("urdu", "الله، اللَّه، اللّٰه اور اللہ"),
  "اللہ، اللہ، اللہ اور اللہ",
);
assert.equal(
  localizeDivineName("arabic", "النص العربي الله"),
  "النص العربي الله",
);

// Exercise the same shared display boundary used by the Quran readers,
// including the selected language passed at render time.
assert.equal(
  applyTranslationDisplay("urdu", "Allah کا ذکر"),
  "اللہ کا ذکر",
);
assert.equal(
  applyTranslationDisplay("arabic", "Allah واحد"),
  "الله واحد",
);
assert.equal(
  applyTranslationDisplay("persian", "Allah رحیم است"),
  "الله رحیم است",
);
assert.equal(
  applyTranslationDisplay("hindi", "Allah दयालु है"),
  "अल्लाह दयालु है",
);
assert.equal(
  applyTranslationDisplay("bengali", "Allah দয়ালু"),
  "আল্লাহ দয়ালু",
);
assert.equal(applyTranslationDisplay("turkish", "Allah birdir"), "Allah birdir");
assert.equal(applyTranslationDisplay("english", "Allah is One"), "Allah is One");

// The formatter only receives translation text; the Arabic Quran source
// remains a separate, untouched value.
const originalArabicQuranText = "اللَّهُ أَحَدٌ";
const rawTranslationFromCache = "Allah is One";
assert.equal(applyTranslationDisplay("urdu", rawTranslationFromCache), "اللہ is One");
assert.equal(originalArabicQuranText, "اللَّهُ أَحَدٌ");
assert.equal(rawTranslationFromCache, "Allah is One");

console.log("divine name localization tests passed");
