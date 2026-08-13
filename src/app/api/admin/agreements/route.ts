import { NextRequest, NextResponse } from "next/server";
import { createAgreement, getAppUrl, listAgreements } from "@/lib/agreement";
import { requireAdminMutation, requireAdminRead } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { createAgreementSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const denied = await requireAdminRead(request);
  if (denied) return denied;

  try {
    const items = await listAgreements();
    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logError("admin.agreements_list_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Unable to load agreements." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

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

  try {
    const row = await createAgreement(parsed.data);
    const url = `${getAppUrl()}/agreement/${row.public_token}`;
    return NextResponse.json({
      ok: true,
      token: row.public_token,
      url,
      status: row.status,
    });
  } catch (error) {
    logError("admin.agreement_create_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Unable to create agreement." }, { status: 500 });
  }
}
