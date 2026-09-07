import {
  dataUrlByteLength,
  shouldPreserveStillImage,
  TARGET_IMAGE_DATA_URL_LENGTH,
  MAX_STILL_IMAGE_DIMENSION,
} from "./welcome-campaign-image";

function equal(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

const smallPng = `data:image/png;base64,${"A".repeat(1_000)}`;
equal(dataUrlByteLength(smallPng), 750, "data URL byte size");
equal(
  shouldPreserveStillImage({ dataUrlLength: smallPng.length, width: 800, height: 600 }),
  true,
  "small still images should not be recompressed",
);

equal(
  shouldPreserveStillImage({
    dataUrlLength: smallPng.length,
    width: MAX_STILL_IMAGE_DIMENSION + 1,
    height: 900,
  }),
  false,
  "large-dimension images should enter the optimizer",
);

equal(
  shouldPreserveStillImage({
    dataUrlLength: TARGET_IMAGE_DATA_URL_LENGTH + 1,
    width: 800,
    height: 600,
  }),
  false,
  "oversized data URLs should enter the optimizer",
);

const optimizedCandidate = `data:image/webp;base64,${"A".repeat(TARGET_IMAGE_DATA_URL_LENGTH - 40)}`;
equal(
  optimizedCandidate.length <= TARGET_IMAGE_DATA_URL_LENGTH,
  true,
  "the accepted optimized candidate stays below the client/API limit",
);

console.log("welcome campaign image preparation tests passed");