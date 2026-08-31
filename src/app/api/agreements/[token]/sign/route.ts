import { after, NextRequest, NextResponse } from "next/server";
import { REPRESENTATIVE } from "@/config/company";
import {
  buildPdfFilename,
  claimAgreementForSigning,
  downloadStorageDataUrl,
  getAgreementAccessState,
  getAgreementByToken,
  markAgreementSigned,
  updateEmailStatus,
  updateGhlSync,
  updatePaymentUrl,
  uploadSignature,
  uploadSignedPdf,
} from "@/lib/agreement";
import { normalizeSelectedServices } from "@/config/services";
import { createAgreementInvoice } from "@/lib/ghl-invoice";
import { getGhlRepresentativeDetails, syncSignedAgreementToGhl } from "@/lib/ghl";
import { formatLongDate } from "@/lib/dates";
import { fingerprintAgreementContent, sha256Hex } from "@/lib/hashing";
import { getClientIp, getUserAgent, maskIp } from "@/lib/ip";
import { logError, logInfo } from "@/lib/logger";
import { sendSignedAgreementEmail, signedRecordUrl } from "@/lib/email";
import { generateAgreementPdf } from "@/lib/pdf";
import { rateLimit } from "@/lib/rate-limit";
import { SIGNATURE_BUCKET } from "@/lib/supabase/admin";
import { dataUrlToBuffer, getAuthorizedSignatureDataUrl } from "@/lib/representative-signature";
import { isLikelyToken } from "@/lib/tokens";
import { signAgreementSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function resolveRepresentativeSignature(
  claimed: {
    id: string;
    representative_signature_path: string | null;
  },
  representativeName?: string,
): Promise<{ dataUrl: string | null; path: string | null }> {
  // Prefer the signature that was already generated for THIS agreement
  // (from a custom representative name or hand-drawn signature at
  // creation/edit time). Only fall back to the static company-wide
  // "authorized" signature if this agreement never had its own.
  if (claimed.representative_signature_path) {
    const dataUrl = await downloadStorageDataUrl(
      SIGNATURE_BUCKET,
      claimed.representative_signature_path,
      "image/png",
    );
    if (dataUrl) {
      return { dataUrl, path: claimed.representative_signature_path };
    }
  }

  const dataUrl = await getAuthorizedSignatureDataUrl(representativeName);
  if (!dataUrl) {
    return { dataUrl: null, path: null };
  }
  const buffer = dataUrlToBuffer(dataUrl).buffer;
  const path = await uploadSignature(claimed.id, "representative", buffer);
  return { dataUrl, path };
}

function invoiceParamsFor(
  contactId: string,
  values: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    setupFee?: string | null;
    monthlyFee?: string | null;
    setupFeeLabel?: string | null;
    monthlyFeeLabel?: string | null;
    serviceDescription?: string | null;
    selectedServices?: string | string[] | null;
  },
) {
  const trimmedDescription = (values.serviceDescription || "").trim();
  const descriptionLabel = trimmedDescription
    ? trimmedDescription.length > 120
      ? `${trimmedDescription.slice(0, 117)}...`
      : trimmedDescription
    : undefined;

  return {
    contactId,
    contactName: [values.firstName, values.lastName].filter(Boolean).join(" ").trim() || "Client",
    contactEmail: values.email || "",
    contactPhone: values.phone || "",
    setupFee: values.setupFee,
    monthlyFee: values.monthlyFee,
    setupFeeLabel: values.setupFeeLabel || descriptionLabel || undefined,
    monthlyFeeLabel: values.monthlyFeeLabel || undefined,
    selectedServices: values.selectedServices,
  };
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

  if (json && typeof json === "object" && !Array.isArray(json)) {
    const body = json as Record<string, unknown>;
    const submitted = normalizeSelectedServices(body.selectedServices);
    const stored = normalizeSelectedServices(existing.selected_services);
    body.selectedServices = submitted.length ? submitted : stored;
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
  const fromGhl = await getGhlRepresentativeDetails(claimed.ghl_contact_id);
  const selectedServices =
    normalizeSelectedServices(values.selectedServices).length > 0
      ? normalizeSelectedServices(values.selectedServices)
      : normalizeSelectedServices(claimed.selected_services).length > 0
        ? normalizeSelectedServices(claimed.selected_services)
        : fromGhl.selectedServices || [];
  const signedAt = new Date();
  const userAgent = await getUserAgent();
  const representativeDate = signedAt.toISOString().slice(0, 10);

  const representativeName =
    fromGhl.name || claimed.representative_name || REPRESENTATIVE.printedName;
  const representativeTitle =
    fromGhl.title || claimed.representative_title || REPRESENTATIVE.title;

  try {
    const clientSignature = dataUrlToBuffer(values.clientSignature);

    const [clientSignaturePath, representativeSignatureResult] = await Promise.all([
      uploadSignature(claimed.id, "client", clientSignature.buffer),
      resolveRepresentativeSignature(claimed, representativeName),
    ]);

    const { dataUrl: representativeDataUrl, path: representativeSignaturePath } =
      representativeSignatureResult;

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
      selectedServices,
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
      representativeSignatureSha256: representativeDataUrl
        ? sha256Hex(dataUrlToBuffer(representativeDataUrl).buffer)
        : null,
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
      selectedServices,
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
      clientSignedDate: formatLongDate(values.clientSignedDate) || values.clientSignedDate,
      clientSignatureDataUrl: values.clientSignature,
      representativeName,
      representativeTitle,
      representativeDate: formatLongDate(representativeDate) || representativeDate,
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

    let paymentUrl = claimed.payment_url;
    if (claimed.ghl_contact_id && !paymentUrl) {
      const invoice = await createAgreementInvoice(
        invoiceParamsFor(claimed.ghl_contact_id, values),
      );
      if (invoice) paymentUrl = invoice.paymentUrl;
    }

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
      selected_services: selectedServices,
      other_service: values.otherService || null,
      service_description: values.serviceDescription || null,
      service_start_date: values.serviceStartDate || null,
      service_end_date: values.serviceEndDate || null,
      setup_fee: values.setupFee || null,
      monthly_fee: values.monthlyFee || null,
      setup_fee_label: values.setupFeeLabel || claimed.setup_fee_label || null,
      monthly_fee_label: values.monthlyFeeLabel || claimed.monthly_fee_label || null,
      payment_schedule: values.paymentSchedule || null,
      payment_method: values.paymentMethod || null,
      payment_url: paymentUrl,
      client_printed_name: values.clientPrintedName,
      client_title: values.clientTitle || null,
      client_signed_date: values.clientSignedDate,
      client_signature_path: clientSignaturePath,
      representative_name: representativeName,
      representative_title: representativeTitle,
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

    after(async () => {
      try {
        const ghl = await syncSignedAgreementToGhl(signed, pdf);
        await updateGhlSync(signed.id, {
          ghl_contact_id: ghl.contactId,
          ghl_signed_document_id: ghl.documentId,
          ghl_sync_status: ghl.status,
          ghl_document_destination: ghl.destination,
          ghl_sync_note: ghl.note,
          ghl_synced_at: ghl.status === "synced" ? new Date().toISOString() : null,
          ghl_sync_error: ghl.status === "failed" ? ghl.note || ghl.error || "HighLevel sync failed" : null,
          ghl_webhook_status: ghl.webhookStatus,
        });

        if (!signed.payment_url && ghl.contactId) {
          const invoice = await createAgreementInvoice(
            invoiceParamsFor(ghl.contactId, {
              firstName: signed.first_name || values.firstName,
              lastName: signed.last_name || values.lastName,
              email: signed.email || values.email,
              phone: signed.phone || values.phone,
              setupFee: signed.setup_fee,
              monthlyFee: signed.monthly_fee,
              serviceDescription: signed.service_description || values.serviceDescription,
              selectedServices: signed.selected_services || values.selectedServices,
            }),
          );
          if (invoice) {
            await updatePaymentUrl(signed.id, invoice.paymentUrl);
          }
        }
      } catch (error) {
        logError("agreement.ghl_after_failed", {
          agreementId: signed.id,
          message: error instanceof Error ? error.message : "HighLevel sync failed",
        });
        await updateGhlSync(signed.id, {
          ghl_sync_status: "failed",
          ghl_sync_error: error instanceof Error ? error.message : "HighLevel sync failed",
        });
      }
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
