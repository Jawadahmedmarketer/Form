import { NextRequest, NextResponse } from "next/server";
import { getAgreementByToken, updateAgreementDraft } from "@/lib/agreement";
import { requireAdminMutation } from "@/lib/admin-auth";
import { logError } from "@/lib/logger";
import { adminCreateFormSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  const { token } = await params;

  let existing;
  try {
    existing = await getAgreementByToken(token);
  } catch {
    return NextResponse.json({ error: "Unable to load agreement." }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  if (existing.status === "signed") {
    return NextResponse.json(
      { error: "This agreement has already been signed and cannot be edited." },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = adminCreateFormSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid agreement data." },
      { status: 400 },
    );
  }

  try {
    await updateAgreementDraft(existing.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("admin.agreement_update_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "Unable to update agreement." }, { status: 500 });
  }
}
