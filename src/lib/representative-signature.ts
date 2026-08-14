import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { DANCING_SCRIPT_FONT_BASE64 } from "@/assets/dancing-script-font-base64";
import { readFile } from "fs/promises";
import path from "path";
import { REPRESENTATIVE } from "@/config/company";

let signatureFontRegistered = false;

function ensureSignatureFontRegistered() {
  if (signatureFontRegistered) return;
  const fontPath = path.join(process.cwd(), "src", "assets", "DancingScript.ttf");
  try {
    GlobalFonts.registerFromPath(fontPath, "Dancing Script");
    const fontBuffer = Buffer.from(DANCING_SCRIPT_FONT_BASE64, "base64");
    const result = GlobalFonts.register(fontBuffer, "Dancing Script");
    console.log("signature.font_register_result", {
      result,
      base64Length: DANCING_SCRIPT_FONT_BASE64.length,
      bufferLength: fontBuffer.length,
    });
  } catch (err) {
    console.log("signature.font_register_error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
  signatureFontRegistered = true;
}

export function generateSignatureFromName(name: string): Buffer {
  ensureSignatureFontRegistered();
  const registeredFamilies = GlobalFonts.families.map((f) => f.family);
  const hasDancingScript = registeredFamilies.includes("Dancing Script");
  console.log("signature.font_check", {
    hasDancingScript,
    familyCount: registeredFamilies.length,
    sample: registeredFamilies.slice(0, 10),
  });

  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 600, 200);
  ctx.fillStyle = "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '64px "Dancing Script"';
  console.log("signature.canvas_font_set", { requestedFont: ctx.font, name });
  ctx.fillText(name, 300, 100);

  const buffer = canvas.toBuffer("image/png");
  console.log("signature.buffer_generated", {
    byteLength: buffer.length,
    name,
  });
  return buffer;
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
