import { NextRequest, NextResponse } from "next/server";
import { downloadSignedPdf, getAgreementByToken, updateGhlSync } from "@/lib/agreement";
import { requireAdminMutation } from "@/lib/admin-auth";
import { syncSignedAgreementToGhl } from "@/lib/ghl";
import { isLikelyToken } from "@/lib/tokens";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const denied = await requireAdminMutation(request, { allowBearer: true });
  if (denied) return denied;

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
    ghl_signed_document_id: ghl.documentId,
    ghl_sync_status: ghl.status,
    ghl_document_destination: ghl.destination,
    ghl_sync_note: ghl.note,
    ghl_synced_at: ghl.status === "synced" ? new Date().toISOString() : null,
    ghl_sync_error: ghl.status === "failed" ? ghl.note || ghl.error || "HighLevel sync failed" : null,
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
