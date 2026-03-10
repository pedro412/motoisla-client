export const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface PendingImageUpload {
  id: string;
  file: File;
  width: number;
  height: number;
  previewUrl: string;
}

export async function uploadFileToPresignedTarget(target: { method: "PUT"; url: string; headers: Record<string, string> }, file: File) {
  const response = await fetch(target.url, {
    method: target.method,
    headers: target.headers,
    body: file,
  });

  if (!response.ok) {
    throw new Error("No fue posible subir la imagen a storage.");
  }
}

export function generatePendingImageId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function validateImageMime(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    return "Formato no permitido. Usa JPG, PNG o WEBP.";
  }
  return null;
}

export function validateImageSize(file: File, maxBytes: number): string | null {
  if (file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(1);
    return `La imagen supera el limite de ${maxMb} MB.`;
  }
  return null;
}

export function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No fue posible leer la imagen seleccionada."));
    };

    image.src = objectUrl;
  });
}

function canvasToFile(canvas: HTMLCanvasElement, mimeType: string, filename: string, quality?: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No fue posible generar el thumbnail."));
          return;
        }
        resolve(new File([blob], filename, { type: mimeType }));
      },
      mimeType,
      quality,
    );
  });
}

export async function createThumbnailFile(file: File, maxSide = 480): Promise<{ file: File; width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No fue posible procesar la imagen."));
      image.src = objectUrl;
    });

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longestSide > maxSide ? maxSide / longestSide : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No fue posible inicializar canvas para thumbnail.");
    }

    context.drawImage(image, 0, 0, width, height);

    const canUseWebp = file.type === "image/webp" || file.type === "image/png" || file.type === "image/jpeg";
    const mimeType = canUseWebp ? "image/webp" : "image/jpeg";
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const thumbFile = await canvasToFile(canvas, mimeType, `${baseName}-thumb.${mimeType === "image/webp" ? "webp" : "jpg"}`, 0.82);

    return { file: thumbFile, width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function getPrimaryImageUrl(images: Array<{ id: string; is_primary: boolean; thumb_url: string; original_url: string }>, primaryImageId: string | null, preferThumb = true) {
  if (!images.length) {
    return null;
  }

  const fromPrimaryId = primaryImageId ? images.find((image) => image.id === primaryImageId) : null;
  const primaryFlagged = images.find((image) => image.is_primary);
  const selected = fromPrimaryId ?? primaryFlagged ?? images[0];

  if (preferThumb) {
    return selected.thumb_url || selected.original_url;
  }

  return selected.original_url || selected.thumb_url;
}
