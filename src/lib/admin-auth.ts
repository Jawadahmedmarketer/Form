import { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function adminPassword() {
  return process.env.ADMIN_API_SECRET?.trim() || "";
}

function sessionSigningKey() {
  return `utg-admin-session-v1:${adminPassword()}`;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    let unused = 0;
    for (let i = 0; i < left.length; i += 1) unused |= left.charCodeAt(i);
    return unused === -1;
  }
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSigningKey()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export function passwordsMatch(input: string, expected: string) {
  if (!expected) return false;
  return safeEqual(input, expected);
}

export async function createAdminSessionToken() {
  if (!adminPassword()) {
    throw new Error("Admin authentication is not configured.");
  }
  const payload = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
        v: 1,
      }),
    ),
  );
  const signature = await hmacSign(payload);
  return `${payload}.${signature}`;
}

export async function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !adminPassword() || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await hmacSign(payload);
  if (!safeEqual(signature, expected)) return false;
  try {
    const data = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as { exp?: number };
    return typeof data.exp === "number" && data.exp > Date.now();
  } catch {
    return false;
  }
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}

export function clearAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };
}

export async function hasValidAdminSession(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function hasValidAdminBearer(request: NextRequest) {
  const expected = adminPassword();
  if (!expected) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return passwordsMatch(token, expected);
}

export function isSameOrigin(request: NextRequest) {
  const host = request.headers.get("host");
  if (!host) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return false;
}

export function csrfForbidden() {
  return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
}

export function unauthorizedJson() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

export function safeAdminRedirect(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.includes("://")) {
    return "/admin";
  }
  const path = value.split("?")[0];
  if (path === "/admin/login" || path.startsWith("/admin/login/")) {
    return "/admin";
  }
  return value;
}

export function requestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
}

export async function requireAdminRead(request: NextRequest) {
  if (await hasValidAdminSession(request)) return null;
  return unauthorizedJson();
}

export async function requireAdminMutation(
  request: NextRequest,
  options?: { allowBearer?: boolean },
) {
  if (options?.allowBearer && hasValidAdminBearer(request)) return null;
  if (!(await hasValidAdminSession(request))) return unauthorizedJson();
  if (!isSameOrigin(request)) return csrfForbidden();
  return null;
}
