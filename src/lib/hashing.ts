import { createHash } from "crypto";

export function sha256Hex(input: string | Buffer | Uint8Array) {
  return createHash("sha256").update(input).digest("hex");
}

export function fingerprintAgreementContent(payload: unknown) {
  const canonical = JSON.stringify(sortValue(payload));
  return sha256Hex(canonical);
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  return value;
}
