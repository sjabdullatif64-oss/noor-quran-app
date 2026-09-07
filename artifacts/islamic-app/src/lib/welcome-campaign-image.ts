export const TARGET_IMAGE_DATA_URL_LENGTH = 1_850_000;
export const MAX_STILL_IMAGE_DIMENSION = 1_600;

export type ImagePreparation = {
  originalPreviewUrl: string;
  optimizedUrl: string;
  originalSize: number;
  optimizedSize: number;
  originalWidth: number;
  originalHeight: number;
  optimizedWidth: number;
  optimizedHeight: number;
  optimizedFormat: string;
};

export function dataUrlByteLength(value: string): number {
  const comma = value.indexOf(",");
  if (comma === -1) return 0;
  return Math.ceil((value.length - comma - 1) * 3 / 4);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function shouldPreserveStillImage(input: {
  dataUrlLength: number;
  width: number;
  height: number;
}): boolean {
  return input.dataUrlLength <= TARGET_IMAGE_DATA_URL_LENGTH
    && Math.max(input.width, input.height) <= MAX_STILL_IMAGE_DIMENSION;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("This image could not be opened."));
    image.src = src;
  });
}

export async function prepareStillImage(file: File): Promise<ImagePreparation> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a valid image file.");
  }

  const originalPreviewUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(originalPreviewUrl);
    const originalDataUrl = await fileToDataUrl(file);
    const originalWidth = image.naturalWidth;
    const originalHeight = image.naturalHeight;

    if (!originalWidth || !originalHeight) {
      throw new Error("This image has no readable dimensions.");
    }

    // GIFs have their own media field and must not be rasterized here.
    if (file.type === "image/gif") {
      if (originalDataUrl.length > TARGET_IMAGE_DATA_URL_LENGTH) {
        throw new Error("GIFs are kept unchanged. Use the GIF media field or choose a smaller GIF.");
      }
      return {
        originalPreviewUrl,
        optimizedUrl: originalDataUrl,
        originalSize: file.size,
        optimizedSize: file.size,
        originalWidth,
        originalHeight,
        optimizedWidth: originalWidth,
        optimizedHeight: originalHeight,
        optimizedFormat: "GIF",
      };
    }

    // Keep already-safe images lossless rather than degrading a small upload.
    if (shouldPreserveStillImage({
      dataUrlLength: originalDataUrl.length,
      width: originalWidth,
      height: originalHeight,
    })) {
      return {
        originalPreviewUrl,
        optimizedUrl: originalDataUrl,
        originalSize: file.size,
        optimizedSize: file.size,
        originalWidth,
        originalHeight,
        optimizedWidth: originalWidth,
        optimizedHeight: originalHeight,
        optimizedFormat: file.type.split("/")[1]?.toUpperCase() || "IMAGE",
      };
    }

    let scale = Math.min(1, MAX_STILL_IMAGE_DIMENSION / Math.max(originalWidth, originalHeight));
    const qualitySteps = [0.86, 0.78, 0.70, 0.62, 0.54, 0.46];

    for (let pass = 0; pass < 7; pass += 1) {
      const width = Math.max(1, Math.round(originalWidth * scale));
      const height = Math.max(1, Math.round(originalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this image.");
      context.drawImage(image, 0, 0, width, height);

      for (const quality of qualitySteps) {
        let optimizedUrl = canvas.toDataURL("image/webp", quality);
        let optimizedFormat = "WEBP";
        if (!optimizedUrl.startsWith("data:image/webp")) {
          optimizedUrl = canvas.toDataURL("image/jpeg", quality);
          optimizedFormat = "JPEG";
        }
        if (optimizedUrl.length <= TARGET_IMAGE_DATA_URL_LENGTH) {
          return {
            originalPreviewUrl,
            optimizedUrl,
            originalSize: file.size,
            optimizedSize: dataUrlByteLength(optimizedUrl),
            originalWidth,
            originalHeight,
            optimizedWidth: width,
            optimizedHeight: height,
            optimizedFormat,
          };
        }
      }
      scale *= 0.82;
    }

    throw new Error("This image could not be reduced below the upload limit. Please choose a smaller image.");
  } catch (error) {
    URL.revokeObjectURL(originalPreviewUrl);
    throw error;
  }
}