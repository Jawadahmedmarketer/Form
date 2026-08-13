import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  clearAdminCookieOptions,
  csrfForbidden,
  isSameOrigin,
} from "@/lib/admin-auth";
import { logInfo } from "@/lib/logger";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return csrfForbidden();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", clearAdminCookieOptions());
  logInfo("admin.logout");
  return response;
}
