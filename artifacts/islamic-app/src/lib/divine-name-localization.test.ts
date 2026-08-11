import assert from "node:assert/strict";
import {
  LOCALIZED_DIVINE_NAMES,
  localizeDivineName,
} from "./divine-name-localization";
import {
  applyTranslationDisplay,
  applyTransliterationDisplay,
} from "./ayah-display";

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

// Urdu translation editions also use standalone "خدا" for the Divine Name;
// the display layer normalizes that established alias to "اللہ".
assert.equal(localizeDivineName("urdu", "خدا کا شکر ہے"), "اللہ کا شکر ہے");
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
  localizeDivineName("urdu", "سب طرح کی تعریف خدا ہی کو ہے"),
  "سب طرح کی تعریف اللہ ہی کو ہے",
);
assert.equal(
  localizeDivineName("urdu", "خداوند کا ذکر اور خدا کا نام"),
  "خداوند کا ذکر اور اللہ کا نام",
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
  applyTranslationDisplay("urdu", "سب طرح کی تعریف خدا ہی کو ہے"),
  "سب طرح کی تعریف اللہ ہی کو ہے",
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
assert.equal(
  applyTranslationDisplay("urdu", "سب طرح کی تعریف خدا ہی کو ہے"),
  "سب طرح کی تعریف اللہ ہی کو ہے",
);
assert.equal(originalArabicQuranText, "اللَّهُ أَحَدٌ");
assert.equal(rawTranslationFromCache, "Allah is One");

// The English transliteration line is display-localized when the selected
// language uses a non-Latin script. Latin-script languages keep it unchanged.
assert.equal(
  applyTransliterationDisplay("urdu", "Bismillaahir Rahmaanir Raheem"),
  "بسم اللہ الرحمن الرحیم",
);
assert.equal(
  applyTransliterationDisplay("arabic", "Bismillaahir Rahmaanir Raheem"),
  "بسم الله الرحمن الرحيم",
);
assert.equal(
  applyTransliterationDisplay("persian", "Bismillaahir Rahmaanir Raheem"),
  "بسم الله الرحمن الرحیم",
);
assert.equal(
  applyTransliterationDisplay("hindi", "Bismillaahir Rahmaanir Raheem"),
  "बिस्मिल्लाह रहमानिर रहीम",
);
assert.equal(
  applyTransliterationDisplay("bengali", "Bismillaahir Rahmaanir Raheem"),
  "বিসমিল্লাহ রহমানির রহিম",
);
assert.equal(
  applyTransliterationDisplay("english", "Bismillaahir Rahmaanir Raheem"),
  "Bismillaahir Rahmaanir Raheem",
);
assert.equal(
  applyTransliterationDisplay("urdu", "Qul huwa Allahu ahad"),
  "قل ہو اللہ احد",
);
assert.equal(
  applyTransliterationDisplay("hindi", "Qul huwa Allahu ahad"),
  "कुल हुवा अल्लाहु अहद",
);
assert.equal(
  applyTransliterationDisplay("arabic", "Alhamdu lillaahi Rabbil 'aalameen"),
  "الحمد لله رب العالمين",
);
assert.equal(
  applyTransliterationDisplay("urdu", "Alhamdu lillaahi Rabbil 'aalameen"),
  "الحمد للہ رب العالمین",
);
assert.equal(originalArabicQuranText, "اللَّهُ أَحَدٌ");

console.log("divine name localization tests passed");
