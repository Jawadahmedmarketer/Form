import { REPRESENTATIVE } from "@/config/company";
import { mergeFieldLocks } from "@/lib/field-locks";
import { logError, logInfo } from "@/lib/logger";
import { dataUrlToBuffer, generateSignatureFromName } from "@/lib/representative-signature";
import { getSupabaseAdmin, PDF_BUCKET, SIGNATURE_BUCKET } from "@/lib/supabase/admin";
import type { AgreementRow, PublicAgreement } from "@/lib/supabase/types";
import { createPublicToken } from "@/lib/tokens";
import type { AdminCreateFormInput, CreateAgreementInput } from "@/lib/validation";

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function toPublicAgreement(
  row: AgreementRow,
  representativeSignatureDataUrl: string | null,
): PublicAgreement {
  const locks = mergeFieldLocks(row.field_locks);
  return {
    publicToken: row.public_token,
    status: row.status,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    businessName: row.business_name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    businessAddress: row.business_address ?? "",
    taxPeriod: row.tax_period ?? "",
    agreementDate: row.agreement_date ?? "",
    businessesCovered: row.businesses_covered ?? "",
    selectedServices: Array.isArray(row.selected_services) ? row.selected_services : [],
    otherService: row.other_service ?? "",
    serviceDescription: row.service_description ?? "",
    serviceStartDate: row.service_start_date ?? "",
    serviceEndDate: row.service_end_date ?? "",
    setupFee: row.setup_fee ?? "",
    monthlyFee: row.monthly_fee ?? "",
    setupFeeLabel: row.setup_fee_label ?? "",
    monthlyFeeLabel: row.monthly_fee_label ?? "",
    paymentSchedule: row.payment_schedule ?? "",
    paymentMethod: row.payment_method ?? "",
    fieldLocks: locks,
    representativeName: row.representative_name || REPRESENTATIVE.printedName,
    representativeTitle: row.representative_title || REPRESENTATIVE.title,
    representativeDate: row.representative_date ?? "",
    representativeSignatureDataUrl,
    clientPrintedName: row.client_printed_name ?? "",
    clientTitle: row.client_title ?? "",
    clientSignedDate: row.client_signed_date ?? "",
  };
}

export async function getAgreementByToken(token: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agreements")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    logError("agreement.lookup_failed", { message: error.message });
    throw new Error("Unable to load agreement.");
  }

  return (data as AgreementRow | null) ?? null;
}

export function getAgreementAccessState(row: AgreementRow) {
  if (row.revoked_at) return "revoked" as const;
  if (row.status === "cancelled") return "cancelled" as const;
  if (row.status === "expired") return "expired" as const;
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return "expired" as const;
  }
  if (row.status === "signed") return "signed" as const;
  return "ok" as const;
}

export async function markAgreementViewed(row: AgreementRow) {
  if (row.status !== "sent" && row.status !== "draft") return row;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agreements")
    .update({
      status: "viewed",
      viewed_at: row.viewed_at ?? new Date().toISOString(),
    })
    .eq("id", row.id)
    .in("status", ["draft", "sent"])
    .select("*")
    .maybeSingle();

  if (error) {
    logError("agreement.view_update_failed", { agreementId: row.id, message: error.message });
    return row;
  }

  logInfo("agreement.viewed", { agreementId: row.id });
  return (data as AgreementRow | null) ?? row;
}

export async function createAgreement(input: CreateAgreementInput) {
  const supabase = getSupabaseAdmin();
  const token = createPublicToken();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("agreements")
    .insert({
      public_token: token,
      status: input.status,
      ghl_contact_id: emptyToNull(input.ghlContactId),
      first_name: emptyToNull(input.firstName),
      last_name: emptyToNull(input.lastName),
      business_name: emptyToNull(input.businessName),
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      business_address: emptyToNull(input.businessAddress),
      tax_period: emptyToNull(input.taxPeriod),
      agreement_date: emptyToNull(input.agreementDate),
      businesses_covered: emptyToNull(input.businessesCovered),
      selected_services: input.selectedServices,
      other_service: emptyToNull(input.otherService),
      service_description: emptyToNull(input.serviceDescription),
      service_start_date: emptyToNull(input.serviceStartDate),
      service_end_date: emptyToNull(input.serviceEndDate),
      setup_fee: emptyToNull(input.setupFee),
      monthly_fee: emptyToNull(input.monthlyFee),
      setup_fee_label: emptyToNull(input.setupFeeLabel),
      monthly_fee_label: emptyToNull(input.monthlyFeeLabel),
      payment_schedule: emptyToNull(input.paymentSchedule),
      payment_method: emptyToNull(input.paymentMethod),
      representative_name: input.representativeName || REPRESENTATIVE.printedName,
      representative_title: input.representativeTitle || REPRESENTATIVE.title,
      field_locks: input.fieldLocks ?? {},
      payment_url: emptyToNull(input.paymentUrl),
      expires_at: emptyToNull(input.expiresAt),
      sent_at: input.status === "sent" ? now : null,
    })
    .select("*")
    .single();

  if (error || !data) {
    logError("agreement.create_failed", { message: error?.message });
    throw new Error("Unable to create agreement.");
  }

  logInfo("agreement.created", { agreementId: data.id, status: data.status });

  let created = data as AgreementRow;

  const hasDrawnSignature = Boolean(input.representativeSignature);
  const trimmedRepresentativeName = input.representativeName?.trim();
  if (hasDrawnSignature || trimmedRepresentativeName) {
    try {
      const buffer = hasDrawnSignature
        ? dataUrlToBuffer(input.representativeSignature).buffer
        : generateSignatureFromName(trimmedRepresentativeName as string);
      const pathName = await uploadSignature(created.id, "representative", buffer);
      const { data: updated, error: updateError } = await supabase
        .from("agreements")
        .update({ representative_signature_path: pathName })
        .eq("id", created.id)
        .select("*")
        .single();
      if (!updateError && updated) {
        created = updated as AgreementRow;
      }
    } catch (uploadError) {
      logError("agreement.representative_signature_upload_failed", {
        agreementId: created.id,
        message: uploadError instanceof Error ? uploadError.message : "unknown",
      });
    }
  }

  return created;
}

export async function updateAgreementDraft(id: string, input: AdminCreateFormInput) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("agreements")
    .update({
      ghl_contact_id: emptyToNull(input.ghlContactId),
      first_name: emptyToNull(input.firstName),
      last_name: emptyToNull(input.lastName),
      business_name: emptyToNull(input.businessName),
      email: emptyToNull(input.email),
      phone: emptyToNull(input.phone),
      business_address: emptyToNull(input.businessAddress),
      tax_period: emptyToNull(input.taxPeriod),
      agreement_date: emptyToNull(input.agreementDate),
      businesses_covered: emptyToNull(input.businessesCovered),
      selected_services: input.selectedServices,
      other_service: emptyToNull(input.otherService),
      service_description: emptyToNull(input.serviceDescription),
      service_start_date: emptyToNull(input.serviceStartDate),
      service_end_date: emptyToNull(input.serviceEndDate),
      setup_fee: emptyToNull(input.setupFee),
      monthly_fee: emptyToNull(input.monthlyFee),
      setup_fee_label: emptyToNull(input.setupFeeLabel),
      monthly_fee_label: emptyToNull(input.monthlyFeeLabel),
      payment_schedule: emptyToNull(input.paymentSchedule),
      payment_method: emptyToNull(input.paymentMethod),
      payment_url: emptyToNull(input.paymentUrl),
      representative_name: emptyToNull(input.representativeName) || REPRESENTATIVE.printedName,
      representative_title: emptyToNull(input.representativeTitle) || REPRESENTATIVE.title,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    logError("agreement.update_failed", { agreementId: id, message: error?.message });
    throw new Error("Unable to update agreement.");
  }

  let updated = data as AgreementRow;

  const hasDrawnSignature = Boolean(input.representativeSignature);
  const trimmedRepresentativeName = input.representativeName?.trim();
  if (hasDrawnSignature || trimmedRepresentativeName) {
    try {
      const buffer = hasDrawnSignature
        ? dataUrlToBuffer(input.representativeSignature).buffer
        : generateSignatureFromName(trimmedRepresentativeName as string);
      const pathName = await uploadSignature(updated.id, "representative", buffer);
      const { data: withSignature, error: signatureError } = await supabase
        .from("agreements")
        .update({ representative_signature_path: pathName })
        .eq("id", updated.id)
        .select("*")
        .single();
      if (!signatureError && withSignature) {
        updated = withSignature as AgreementRow;
      }
    } catch (uploadError) {
      logError("agreement.representative_signature_upload_failed", {
        agreementId: updated.id,
        message: uploadError instanceof Error ? uploadError.message : "unknown",
      });
    }
  }

  logInfo("agreement.updated", { agreementId: updated.id });
  return updated;
}

export type AdminAgreementSummary = {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  status: AgreementRow["status"];
  createdAt: string;
  url: string;
  ghlDraftDocumentId: string | null;
  ghlSignedDocumentId: string | null;
  ghlSyncStatus: AgreementRow["ghl_sync_status"];
  ghlSyncNote: string | null;
  ghlDocumentDestination: string | null;
};

export async function listAgreements(limit = 200): Promise<AdminAgreementSummary[]> {
  const supabase = getSupabaseAdmin();
  const withDocs = await supabase
    .from("agreements")
    .select(
      "public_token, first_name, last_name, email, status, created_at, ghl_draft_document_id, ghl_signed_document_id, ghl_sync_status, ghl_sync_note, ghl_document_destination",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  const result = withDocs.error
    ? await supabase
        .from("agreements")
        .select("public_token, first_name, last_name, email, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit)
    : withDocs;

  if (result.error) {
    logError("agreement.list_failed", { message: result.error.message });
    throw new Error("Unable to load agreements.");
  }

  const appUrl = getAppUrl();
  return (result.data ?? []).map((row) => ({
    token: String(row.public_token),
    firstName: (row.first_name as string | null) ?? "",
    lastName: (row.last_name as string | null) ?? "",
    email: (row.email as string | null) ?? "",
    status: row.status as AgreementRow["status"],
    createdAt: String(row.created_at),
    url: `${appUrl}/agreement/${row.public_token}`,
    ghlDraftDocumentId:
      "ghl_draft_document_id" in row ? ((row.ghl_draft_document_id as string | null) ?? null) : null,
    ghlSignedDocumentId:
      "ghl_signed_document_id" in row ? ((row.ghl_signed_document_id as string | null) ?? null) : null,
    ghlSyncStatus:
      "ghl_sync_status" in row ? ((row.ghl_sync_status as AgreementRow["ghl_sync_status"]) ?? null) : null,
    ghlSyncNote: "ghl_sync_note" in row ? ((row.ghl_sync_note as string | null) ?? null) : null,
    ghlDocumentDestination:
      "ghl_document_destination" in row ? ((row.ghl_document_destination as string | null) ?? null) : null,
  }));
}

export async function claimAgreementForSigning(id: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agreements")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "sent", "viewed"])
    .select("*")
    .maybeSingle();

  if (error) {
    logError("agreement.claim_failed", { agreementId: id, message: error.message });
    throw new Error("Unable to update agreement.");
  }

  return (data as AgreementRow | null) ?? null;
}

export async function uploadSignature(agreementId: string, kind: "client" | "representative", buffer: Buffer) {
  const supabase = getSupabaseAdmin();
  const pathName = `${agreementId}/${kind}-signature.png`;
  const { error } = await supabase.storage.from(SIGNATURE_BUCKET).upload(pathName, buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (error) {
    logError("storage.signature_upload_failed", { agreementId, kind, message: error.message });
    throw new Error("Unable to store signature.");
  }

  logInfo("storage.signature_uploaded", { agreementId, kind });
  return pathName;
}

export async function uploadSignedPdf(agreementId: string, buffer: Buffer) {
  const supabase = getSupabaseAdmin();
  const pathName = `${agreementId}/signed-agreement.pdf`;
  const { error } = await supabase.storage.from(PDF_BUCKET).upload(pathName, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) {
    logError("storage.pdf_upload_failed", { agreementId, message: error.message });
    throw new Error("Unable to store signed agreement.");
  }

  logInfo("storage.pdf_uploaded", { agreementId });
  return pathName;
}

export async function downloadSignedPdf(pathName: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(PDF_BUCKET).download(pathName);
  if (error || !data) {
    logError("storage.pdf_download_failed", { message: error?.message });
    throw new Error("Unable to download signed agreement.");
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function downloadStorageDataUrl(
  bucket: string,
  pathName: string | null,
  mimeType: string,
) {
  if (!pathName) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(bucket).download(pathName);
  if (error || !data) {
    logError("storage.file_download_failed", { message: error?.message });
    return null;
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function updatePaymentUrl(id: string, paymentUrl: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("agreements")
    .update({ payment_url: paymentUrl })
    .eq("id", id);
  if (error) {
    logError("agreement.payment_url_update_failed", { agreementId: id, message: error.message });
  }
}

export async function updateEmailStatus(
  id: string,
  values: {
    email_status: string;
    email_sent_at?: string | null;
    email_error?: string | null;
  },
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("agreements").update(values).eq("id", id);
  if (error) {
    logError("agreement.email_status_update_failed", { agreementId: id, message: error.message });
  }
}

export async function markAgreementSigned(id: string, values: Record<string, unknown>) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("agreements")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    logError("agreement.sign_update_failed", { agreementId: id, message: error?.message });
    throw new Error("Unable to finalize agreement.");
  }

  return data as AgreementRow;
}

export async function updateGhlSync(
  id: string,
  values: {
    ghl_contact_id?: string | null;
    ghl_sync_status: AgreementRow["ghl_sync_status"];
    ghl_synced_at?: string | null;
    ghl_sync_error?: string | null;
    ghl_webhook_status?: string | null;
    ghl_draft_document_id?: string | null;
    ghl_signed_document_id?: string | null;
    ghl_sync_note?: string | null;
    ghl_document_destination?: string | null;
  },
) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("agreements").update(values).eq("id", id);
  if (error) {
    const {
      ghl_draft_document_id: _draft,
      ghl_signed_document_id: _signed,
      ghl_sync_note: note,
      ghl_document_destination: _dest,
      ...rest
    } = values;
    const retry = await supabase.from("agreements").update({
      ...rest,
      ghl_sync_status: values.ghl_sync_status === "partial" ? "failed" : values.ghl_sync_status,
      ghl_sync_error: values.ghl_sync_error || note || null,
    }).eq("id", id);
    if (!retry.error) return;
    logError("agreement.ghl_status_update_failed", { agreementId: id, message: error.message });
  }
}

export function buildPdfFilename(firstName: string, lastName: string, signedAt: Date) {
  const name = [firstName, lastName]
    .filter(Boolean)
    .join("-")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "Client";
  const date = signedAt.toISOString().slice(0, 10);
  return `Unified-Tax-Group-Service-Agreement-${name}-${date}.pdf`;
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
