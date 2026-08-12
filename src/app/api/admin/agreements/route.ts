import { NextRequest, NextResponse } from "next/server";
import { createAgreement, getAppUrl } from "@/lib/agreement";
import { createAgreementSchema } from "@/lib/validation";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}

function isAdmin(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === secret;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) return unauthorized();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createAgreementSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid agreement data." },
      { status: 400 },
    );
  }

  const row = await createAgreement(parsed.data);
  const url = `${getAppUrl()}/agreement/${row.public_token}`;

  return NextResponse.json({
    ok: true,
    token: row.public_token,
    url,
    status: row.status,
  });
}
