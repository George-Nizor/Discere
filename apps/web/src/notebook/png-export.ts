import { NOTEBOOK_HEIGHT, NOTEBOOK_WIDTH } from "./notebook-page.js";

const SVG_NAMESPACE = 'xmlns="http://www.w3.org/2000/svg"';
/** Exported at twice the drawing size, so handwriting stays legible to a reader. */
const EXPORT_SCALE = 2;

/** The canvas markup as a standalone SVG document the browser can rasterise. */
export function serialiseCanvas(svg: SVGSVGElement): string {
  const markup = new XMLSerializer().serializeToString(svg);
  return markup.includes("xmlns=") ? markup : markup.replace("<svg", `<svg ${SVG_NAMESPACE}`);
}

/**
 * Rasterises the working page. The PNG is produced in the browser from the same SVG the
 * learner drew on, so the file that leaves for a review is exactly the page on screen.
 */
export async function exportCanvasPng(svg: SVGSVGElement | null): Promise<Blob> {
  if (!svg) throw new Error("The working page is not ready to export yet.");
  const sourceUrl = URL.createObjectURL(
    new Blob([serialiseCanvas(svg)], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve());
      image.addEventListener("error", () =>
        reject(new Error("The browser could not draw the working page.")),
      );
      image.src = sourceUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = NOTEBOOK_WIDTH * EXPORT_SCALE;
    canvas.height = NOTEBOOK_HEIGHT * EXPORT_SCALE;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot export a PNG.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("The PNG could not be produced."))),
        "image/png",
      );
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

/** The bytes of a blob as base64, which is how the image travels to the local server. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
