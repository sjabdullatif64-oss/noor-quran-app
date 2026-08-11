import assert from "node:assert/strict";
import {
  LOCALIZED_DIVINE_NAMES,
  localizeDivineName,
} from "./divine-name-localization";

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

console.log("divine name localization tests passed");
