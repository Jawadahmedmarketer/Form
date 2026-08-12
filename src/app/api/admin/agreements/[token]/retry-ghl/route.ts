import { NextRequest, NextResponse } from "next/server";
import { downloadSignedPdf, getAgreementByToken, updateGhlSync } from "@/lib/agreement";
import { syncSignedAgreementToGhl } from "@/lib/ghl";
import { isLikelyToken } from "@/lib/tokens";

function isAdmin(request: NextRequest) {
  const secret = process.env.ADMIN_API_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === secret;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { token } = await context.params;
  if (!isLikelyToken(token)) {
    return NextResponse.json({ error: "Invalid token." }, { status: 400 });
  }

  const row = await getAgreementByToken(token);
  if (!row || row.status !== "signed" || !row.pdf_path) {
    return NextResponse.json({ error: "Signed agreement not found." }, { status: 404 });
  }

  const pdf = await downloadSignedPdf(row.pdf_path);
  const ghl = await syncSignedAgreementToGhl(row, pdf);
  await updateGhlSync(row.id, {
    ghl_contact_id: ghl.contactId,
    ghl_sync_status: ghl.ok ? (ghl.skipped ? "skipped" : "synced") : "failed",
    ghl_synced_at: ghl.ok && !ghl.skipped ? new Date().toISOString() : null,
    ghl_sync_error: ghl.ok ? null : ghl.error || "HighLevel sync failed",
    ghl_webhook_status: ghl.webhookStatus,
  });

  return NextResponse.json({
    ok: ghl.ok,
    skipped: "skipped" in ghl ? ghl.skipped : false,
    ghlContactId: ghl.contactId,
    webhookStatus: ghl.webhookStatus,
    error: ghl.ok ? null : ghl.error,
  });
}
