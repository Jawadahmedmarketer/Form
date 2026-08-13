import { NextRequest, NextResponse } from "next/server";
import {
  hasValidAdminBearer,
  hasValidAdminSession,
  safeAdminRedirect,
} from "@/lib/admin-auth";

const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/api/admin/login", "/api/admin/logout"]);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/admin/login") {
    if (await hasValidAdminSession(request)) {
      const dest = safeAdminRedirect(request.nextUrl.searchParams.get("redirect"));
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const sessionOk = await hasValidAdminSession(request);

  if (pathname.startsWith("/api/admin/")) {
    if (sessionOk) return NextResponse.next();
    if (pathname.includes("/retry-ghl") && hasValidAdminBearer(request)) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (sessionOk) return NextResponse.next();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
