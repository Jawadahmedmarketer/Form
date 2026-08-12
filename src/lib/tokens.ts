import { randomBytes } from "crypto";

export function createPublicToken() {
  return randomBytes(24).toString("base64url");
}

export function isLikelyToken(token: string) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(token);
}
