/** Client-side image resize + re-encode, used before storing images as inline data URLs
 *  (product photos, etc). Keeps DB rows and the POS grid fast by capping both the pixel
 *  dimensions and the final byte size instead of storing whatever the camera produced. */

const DEFAULT_MAX_DIM = 640;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_BYTES = 400 * 1024; // 400KB

export interface CompressImageOptions {
  maxDim?: number;
  quality?: number;
  maxBytes?: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image file"));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

/** Resizes to fit within maxDim×maxDim and re-encodes as JPEG, stepping quality down
 *  until under maxBytes (or bottoming out). Throws if the file isn't an image or is
 *  still too large after compression. */
export async function compressImage(file: File, opts: CompressImageOptions = {}): Promise<string> {
  const { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY, maxBytes = DEFAULT_MAX_BYTES } = opts;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  const rawDataUrl = await readAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image compression is not supported in this browser");
  ctx.drawImage(img, 0, 0, w, h);

  let q = quality;
  let out = canvas.toDataURL("image/jpeg", q);
  while (out.length * 0.75 > maxBytes && q > 0.35) {
    q -= 0.15;
    out = canvas.toDataURL("image/jpeg", q);
  }

  if (out.length * 0.75 > maxBytes) {
    throw new Error("Image is too large even after compression — please use a smaller photo");
  }

  return out;
}
