import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
  createAdminSessionToken,
  csrfForbidden,
  isSameOrigin,
  passwordsMatch,
  requestIp,
  safeAdminRedirect,
} from "@/lib/admin-auth";
import { logInfo, logWarn } from "@/lib/logger";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return csrfForbidden();

  const limited = rateLimit(`admin-login:${requestIp(request)}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    logWarn("admin.login_rate_limited");
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let password = "";
  let redirectValue: string | null = null;
  try {
    const body = (await request.json()) as { password?: unknown; redirect?: unknown };
    password = typeof body.password === "string" ? body.password : "";
    redirectValue = typeof body.redirect === "string" ? body.redirect : null;
  } catch {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const expected = process.env.ADMIN_API_SECRET?.trim() || "";
  if (!expected || !passwordsMatch(password, expected)) {
    logWarn("admin.login_failed");
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  const response = NextResponse.json({ ok: true, redirect: safeAdminRedirect(redirectValue) });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, adminCookieOptions());
  logInfo("admin.login_success");
  return response;
}
