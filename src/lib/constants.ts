/** Debounce delay before auto-saving to the server (ms). */
export const SAVE_DEBOUNCE_MS = 4000;

/** Maximum image width before compression (px). */
export const MAX_IMAGE_WIDTH = 1920;

/** WebP compression quality (0–1). */
export const COMPRESSION_QUALITY = 0.8;

/** Maximum number of images allowed per content slide. */
export const MAX_IMAGES_PER_SLIDE = 8;

/** Maximum decoded byte size per image (600 KB). */
export const MAX_IMAGE_BYTES = 600 * 1024;

/** MIME types accepted for image upload. SVG excluded (script vector). */
export const ALLOWED_IMAGE_MIME = ["image/webp", "image/png", "image/jpeg", "image/gif"] as const;
