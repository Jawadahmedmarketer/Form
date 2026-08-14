import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { readFile } from "fs/promises";
import path from "path";
import { REPRESENTATIVE } from "@/config/company";

let signatureFontRegistered = false;

function ensureSignatureFontRegistered() {
  if (signatureFontRegistered) return;
  const fontPath = path.join(process.cwd(), "src", "assets", "DancingScript.ttf");
  try {
    GlobalFonts.registerFromPath(fontPath, "Dancing Script");
  } catch {
    // If registration fails, canvas falls back to a default font rather than throwing.
  }
  signatureFontRegistered = true;
}

export function generateSignatureFromName(name: string): Buffer {
  ensureSignatureFontRegistered();
  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 600, 200);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '64px "Dancing Script"';
  ctx.fillText(name, 300, 100);
  return canvas.toBuffer("image/png");
}

export async function getAuthorizedSignatureDataUrl() {
  if (REPRESENTATIVE.signatureMode !== "pre_authorized") return null;

  const filePath = path.join(
    process.cwd(),
    "src",
    "assets",
    REPRESENTATIVE.signatureFileName,
  );

  try {
    const bytes = await readFile(filePath);
    return `data:image/png;base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data.");
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}
