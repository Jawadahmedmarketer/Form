import { NextRequest, NextResponse } from "next/server";
import { REPRESENTATIVE } from "@/config/company";
import {
  buildPdfFilename,
  claimAgreementForSigning,
  getAgreementAccessState,
  getAgreementByToken,
  markAgreementSigned,
  updateEmailStatus,
  updateGhlSync,
  uploadSignature,
  uploadSignedPdf,
} from "@/lib/agreement";
import { syncSignedAgreementToGhl } from "@/lib/ghl";
import { fingerprintAgreementContent, sha256Hex } from "@/lib/hashing";
import { getClientIp, getUserAgent, maskIp } from "@/lib/ip";
import { logError, logInfo } from "@/lib/logger";
import { sendSignedAgreementEmail, signedRecordUrl } from "@/lib/email";
import { generateAgreementPdf } from "@/lib/pdf";
import { rateLimit } from "@/lib/rate-limit";
import { dataUrlToBuffer, getAuthorizedSignatureDataUrl } from "@/lib/representative-signature";
import { isLikelyToken } from "@/lib/tokens";
import { signAgreementSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!isLikelyToken(token)) {
    return jsonError("Invalid agreement link.", 400);
  }

  const ip = await getClientIp();
  const limit = rateLimit(`sign:${token}:${ip || "unknown"}`, 8, 10 * 60 * 1000);
  if (!limit.ok) {
    return jsonError("Too many attempts. Please wait and try again.", 429);
  }

  const existing = await getAgreementByToken(token);
  if (!existing) {
    return jsonError("Invalid agreement link.", 404);
  }

  const access = getAgreementAccessState(existing);
  if (access === "signed") {
    logInfo("agreement.sign_idempotent", { agreementId: existing.id });
    return NextResponse.json({ ok: true, alreadySigned: true });
  }
  if (access !== "ok") {
    return jsonError("This agreement is no longer available to sign.", 409);
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const parsed = signAgreementSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Please check the form and try again." },
      { status: 400 },
    );
  }

  const claimed = await claimAgreementForSigning(existing.id);
  if (!claimed) {
    const latest = await getAgreementByToken(token);
    if (latest && getAgreementAccessState(latest) === "signed") {
      return NextResponse.json({ ok: true, alreadySigned: true });
    }
    return jsonError("This agreement is no longer available to sign.", 409);
  }

  logInfo("agreement.submission_started", { agreementId: claimed.id });

  const values = parsed.data;
  const signedAt = new Date();
  const userAgent = await getUserAgent();
  const representativeDate = signedAt.toISOString().slice(0, 10);

  try {
    const clientSignature = dataUrlToBuffer(values.clientSignature);
    const representativeDataUrl = await getAuthorizedSignatureDataUrl();
    const representativeBuffer = representativeDataUrl
      ? dataUrlToBuffer(representativeDataUrl).buffer
      : null;

    const clientSignaturePath = await uploadSignature(claimed.id, "client", clientSignature.buffer);
    const representativeSignaturePath = representativeBuffer
      ? await uploadSignature(claimed.id, "representative", representativeBuffer)
      : null;

    const fingerprint = fingerprintAgreementContent({
      agreementId: claimed.id,
      firstName: values.firstName,
      lastName: values.lastName,
      businessName: values.businessName,
      email: values.email,
      phone: values.phone,
      businessAddress: values.businessAddress,
      taxPeriod: values.taxPeriod,
      agreementDate: values.agreementDate,
      businessesCovered: values.businessesCovered,
      selectedServices: values.selectedServices,
      otherService: values.otherService,
      serviceDescription: values.serviceDescription,
      serviceStartDate: values.serviceStartDate,
      serviceEndDate: values.serviceEndDate,
      setupFee: values.setupFee,
      monthlyFee: values.monthlyFee,
      paymentSchedule: values.paymentSchedule,
      paymentMethod: values.paymentMethod,
      clientPrintedName: values.clientPrintedName,
      clientTitle: values.clientTitle,
      clientSignedDate: values.clientSignedDate,
      clientSignatureSha256: sha256Hex(clientSignature.buffer),
      representativeSignatureSha256: representativeBuffer ? sha256Hex(representativeBuffer) : null,
      signedAt: signedAt.toISOString(),
    });

    const pdf = await generateAgreementPdf({
      firstName: values.firstName,
      lastName: values.lastName,
      businessName: values.businessName,
      email: values.email,
      phone: values.phone,
      businessAddress: values.businessAddress,
      taxPeriod: values.taxPeriod,
      agreementDate: values.agreementDate,
      businessesCovered: values.businessesCovered,
      selectedServices: values.selectedServices,
      otherService: values.otherService,
      serviceDescription: values.serviceDescription,
      serviceStartDate: values.serviceStartDate,
      serviceEndDate: values.serviceEndDate,
      setupFee: values.setupFee,
      monthlyFee: values.monthlyFee,
      paymentSchedule: values.paymentSchedule,
      paymentMethod: values.paymentMethod,
      clientPrintedName: values.clientPrintedName,
      clientTitle: values.clientTitle,
      clientSignedDate: values.clientSignedDate,
      clientSignatureDataUrl: values.clientSignature,
      representativeName: claimed.representative_name || REPRESENTATIVE.printedName,
      representativeTitle: claimed.representative_title || REPRESENTATIVE.title,
      representativeDate,
      representativeSignatureDataUrl: representativeDataUrl,
      signedAtLabel: signedAt.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "America/Denver",
      }),
      maskedIp: maskIp(ip),
      fingerprint,
    });

    const pdfFilename = buildPdfFilename(values.firstName, values.lastName, signedAt);
    const pdfPath = await uploadSignedPdf(claimed.id, pdf);

    const signed = await markAgreementSigned(claimed.id, {
      status: "signed",
      first_name: values.firstName,
      last_name: values.lastName,
      business_name: values.businessName || null,
      email: values.email,
      phone: values.phone,
      business_address: values.businessAddress || null,
      tax_period: values.taxPeriod || null,
      agreement_date: values.agreementDate || null,
      businesses_covered: values.businessesCovered || null,
      selected_services: values.selectedServices,
      other_service: values.otherService || null,
      service_description: values.serviceDescription || null,
      service_start_date: values.serviceStartDate || null,
      service_end_date: values.serviceEndDate || null,
      setup_fee: values.setupFee || null,
      monthly_fee: values.monthlyFee || null,
      payment_schedule: values.paymentSchedule || null,
      payment_method: values.paymentMethod || null,
      client_printed_name: values.clientPrintedName,
      client_title: values.clientTitle || null,
      client_signed_date: values.clientSignedDate,
      client_signature_path: clientSignaturePath,
      representative_name: claimed.representative_name || REPRESENTATIVE.printedName,
      representative_title: claimed.representative_title || REPRESENTATIVE.title,
      representative_date: representativeDate,
      representative_signature_path: representativeSignaturePath,
      pdf_path: pdfPath,
      pdf_filename: pdfFilename,
      signed_at: signedAt.toISOString(),
      signer_ip: ip,
      signer_user_agent: userAgent,
      document_fingerprint: fingerprint,
      ghl_sync_status: "pending",
    });

    logInfo("agreement.signed", { agreementId: signed.id });

    try {
      const emailResult = await sendSignedAgreementEmail({
        to: values.email,
        clientName: values.clientPrintedName || `${values.firstName} ${values.lastName}`.trim(),
        filename: pdfFilename,
        pdf,
        recordUrl: signedRecordUrl(token),
      });
      await updateEmailStatus(signed.id, {
        email_status: emailResult.skipped ? "skipped" : "sent",
        email_sent_at: emailResult.skipped ? null : new Date().toISOString(),
        email_error: null,
      });
    } catch (error) {
      await updateEmailStatus(signed.id, {
        email_status: "failed",
        email_error: error instanceof Error ? error.message : "Email failed",
      });
    }

    const ghl = await syncSignedAgreementToGhl(signed, pdf);
    await updateGhlSync(signed.id, {
      ghl_contact_id: ghl.contactId,
      ghl_signed_document_id: ghl.documentId,
      ghl_sync_status: ghl.ok ? (ghl.skipped ? "skipped" : "synced") : "failed",
      ghl_synced_at: ghl.ok && !ghl.skipped ? new Date().toISOString() : null,
      ghl_sync_error: ghl.ok ? null : ghl.error || "HighLevel sync failed",
      ghl_webhook_status: ghl.webhookStatus,
    });

    return NextResponse.json({ ok: true, alreadySigned: false });
  } catch (error) {
    logError("agreement.sign_failed", {
      agreementId: claimed.id,
      message: error instanceof Error ? error.message : "Sign failed",
    });
    return jsonError(
      "We could not finalize your agreement. Please try again. If the problem continues, contact Unified Tax Group.",
      500,
    );
  }
}
