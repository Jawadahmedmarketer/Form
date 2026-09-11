import { NextRequest, NextResponse } from "next/server";
import { createAgreement, getAppUrl, listAgreements, updateGhlSync } from "@/lib/agreement";
import { requireAdminMutation, requireAdminRead } from "@/lib/admin-auth";
import { cleanGhlString, getGhlRepresentativeDetails, syncAgreementLinkToGhl, uploadSignedPdfToGhl } from "@/lib/ghl";
import { logError, logWarn } from "@/lib/logger";
import { generateSigningCoverPdf } from "@/lib/pdf";
import { createAgreementSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  const denied = await requireAdminMutation(request, { allowBearer: true });
  if (denied) return denied;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = createAgreementSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const fieldPath = issue?.path?.join(".") || "data";
    const message = issue?.message || "Invalid agreement data.";
    return NextResponse.json(
      { error: `${fieldPath}: ${message}`, details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const input = { ...parsed.data };
    if (input.ghlContactId) {
      const fromGhl = await getGhlRepresentativeDetails(input.ghlContactId);
      const repName = cleanGhlString(fromGhl.name);
      const repTitle = cleanGhlString(fromGhl.title);
      if (!cleanGhlString(input.representativeName) && repName) input.representativeName = repName;
      if (!cleanGhlString(input.representativeTitle) && repTitle) input.representativeTitle = repTitle;
      if (!cleanGhlString(input.businessesCovered) && cleanGhlString(fromGhl.businessesCovered)) input.businessesCovered = cleanGhlString(fromGhl.businessesCovered);
      if ((!input.selectedServices || input.selectedServices.length === 0) && fromGhl.selectedServices?.length) {
        input.selectedServices = fromGhl.selectedServices;
      }
      if (!cleanGhlString(input.businessName) && cleanGhlString(fromGhl.businessName)) input.businessName = cleanGhlString(fromGhl.businessName);
      if (!cleanGhlString(input.businessAddress) && cleanGhlString(fromGhl.businessAddress)) input.businessAddress = cleanGhlString(fromGhl.businessAddress);
      if (!cleanGhlString(input.taxPeriod) && cleanGhlString(fromGhl.taxPeriod)) input.taxPeriod = cleanGhlString(fromGhl.taxPeriod);
      if (!cleanGhlString(input.monthlyFee) && cleanGhlString(fromGhl.monthlyFee)) input.monthlyFee = cleanGhlString(fromGhl.monthlyFee);
      if (!cleanGhlString(input.setupFee) && cleanGhlString(fromGhl.setupFee)) input.setupFee = cleanGhlString(fromGhl.setupFee);
      if (!cleanGhlString(input.serviceStartDate) && cleanGhlString(fromGhl.serviceStartDate)) input.serviceStartDate = cleanGhlString(fromGhl.serviceStartDate);
      if ((!cleanGhlString(input.serviceEndDate) || input.serviceEndDate === "Ongoing — no fixed end date") && cleanGhlString(fromGhl.serviceEndDate)) {
        input.serviceEndDate = cleanGhlString(fromGhl.serviceEndDate);
      }
      if (!cleanGhlString(input.serviceDescription) && cleanGhlString(fromGhl.serviceDescription)) input.serviceDescription = cleanGhlString(fromGhl.serviceDescription);
      if ((!cleanGhlString(input.paymentSchedule) || input.paymentSchedule === "Setup due on signing; monthly thereafter") && cleanGhlString(fromGhl.paymentSchedule)) {
        input.paymentSchedule = cleanGhlString(fromGhl.paymentSchedule);
      }
      if ((!cleanGhlString(input.paymentMethod) || input.paymentMethod === "Card / bank payment via secure payment link") && cleanGhlString(fromGhl.paymentMethod)) {
        input.paymentMethod = cleanGhlString(fromGhl.paymentMethod);
      }
    }

    const row = await createAgreement(input);
    const url = `${getAppUrl()}/agreement/${row.public_token}`;

    try {
      const ghl = await syncAgreementLinkToGhl(row);
      let destination = null as string | null;
      let note = ghl.note;
      let status = ghl.status;

      if (ghl.contactId && !ghl.skipped) {
        try {
          const coverPdf = await generateSigningCoverPdf(row.public_token);
          const uploaded = await uploadSignedPdfToGhl(
            ghl.contactId,
            coverPdf,
            "Click to Sign Agreement.pdf",
          );
          if (!uploaded.skipped) {
            destination = "custom_field";
            note = "Cover PDF (sign link) uploaded to custom field.";
            status = "synced";
          }
        } catch (error) {
          logWarn("admin.cover_pdf_ghl_skipped", {
            message: error instanceof Error ? error.message : "Cover PDF upload skipped",
          });
        }
      }

      await updateGhlSync(row.id, {
        ghl_contact_id: ghl.contactId,
        ghl_sync_status: status,
        ghl_document_destination: destination,
        ghl_sync_note: note,
        ghl_synced_at: status === "synced" ? new Date().toISOString() : null,
        ghl_sync_error: status === "failed" ? note || ghl.error || "HighLevel link sync failed" : null,
      });
    } catch (error) {
      await updateGhlSync(row.id, {
        ghl_sync_status: "failed",
        ghl_sync_error: error instanceof Error ? error.message : "HighLevel link sync failed",
      });
      logError("admin.agreement_link_ghl_failed", {
        message: error instanceof Error ? error.message : "unknown",
      });
    }

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
