const TARGET_BYTES = 350 * 1024;
const HARD_BYTES = 700 * 1024;

export type CompressedImage = {
  dataUrl: string;
  blob: Blob;
  bytes: number;
};

export async function fileToCompressedImage(file: File, maxSide = 900, quality = 0.55): Promise<CompressedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui long chon dung file anh.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    let side = maxSide;
    let q = quality;
    let best = "";

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const scale = Math.min(1, side / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Khong the xu ly anh tren trinh duyet nay.");

      ctx.drawImage(image, 0, 0, width, height);
      const compressed = await canvasToCompressedImage(canvas, q);
      best = compressed.dataUrl;

      if (compressed.bytes <= TARGET_BYTES || (side <= 640 && compressed.bytes <= HARD_BYTES)) {
        return compressed;
      }

      if (q > 0.44) {
        q = Math.max(0.44, q - 0.08);
      } else {
        side = Math.max(560, Math.round(side * 0.82));
      }
    }

    return dataUrlToCompressedImage(best);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function fileToCompressedDataUrl(file: File, maxSide = 960, quality = 0.58) {
  return (await fileToCompressedImage(file, maxSide, quality)).dataUrl;
}

function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

function canvasToCompressedImage(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<CompressedImage>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Khong the nen anh."));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result);
          resolve({ dataUrl, blob, bytes: blob.size || estimateDataUrlBytes(dataUrl) });
        };
        reader.onerror = () => reject(new Error("Khong doc duoc anh da nen."));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

function dataUrlToCompressedImage(dataUrl: string): CompressedImage {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    dataUrl,
    blob: new Blob([bytes], { type: "image/jpeg" }),
    bytes: bytes.byteLength,
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Khong doc duoc file anh."));
    image.src = src;
  });
}
