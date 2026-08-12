import { readFile } from "fs/promises";
import path from "path";
import { REPRESENTATIVE } from "@/config/company";

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
