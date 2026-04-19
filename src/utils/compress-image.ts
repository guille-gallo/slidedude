import { MAX_IMAGE_WIDTH, COMPRESSION_QUALITY } from "@/lib/constants";

export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_IMAGE_WIDTH) {
        height = Math.round((height * MAX_IMAGE_WIDTH) / width);
        width = MAX_IMAGE_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", COMPRESSION_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

export function compressImageFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_WIDTH) {
        height = Math.round((height * MAX_IMAGE_WIDTH) / width);
        width = MAX_IMAGE_WIDTH;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/webp", COMPRESSION_QUALITY));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = dataUrl;
  });
}
