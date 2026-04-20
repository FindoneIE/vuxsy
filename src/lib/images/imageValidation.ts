export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const DEFAULT_MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

type ImageValidationOptions = {
  mimeType?: string | null;
  size?: number | null;
  maxSizeBytes?: number;
};

export type ImageValidationResult = {
  valid: boolean;
  error?: string;
};

export function validateImage(options: ImageValidationOptions): ImageValidationResult {
  const { mimeType, size, maxSizeBytes = DEFAULT_MAX_IMAGE_SIZE_BYTES } = options;

  if (!mimeType || !SUPPORTED_IMAGE_TYPES.includes(mimeType)) {
    return { valid: false, error: "Unsupported file type." };
  }

  if (typeof size === "number" && size > maxSizeBytes) {
    return {
      valid: false,
      error: `File is too large. Max size is ${Math.round(maxSizeBytes / 1024 / 1024)}MB.`,
    };
  }

  return { valid: true };
}
