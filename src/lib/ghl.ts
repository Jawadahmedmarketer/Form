import {
  GHL_AGREEMENT_STATUS_DRAFT,
  GHL_AGREEMENT_STATUS_SENT,
  GHL_AGREEMENT_STATUS_SIGNED,
  GHL_AGREEMENT_TYPE_VALUE,
  getGhlFieldMapping,
} from "@/config/ghl-fields";
import { formatSelectedServices } from "@/config/services";
import { logError, logInfo, logWarn } from "@/lib/logger";
import type { AgreementRow } from "@/lib/supabase/types";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

type GhlContact = {
  id?: string;
  contact?: { id?: string };
};

function getGhlConfig() {
  return {
    token: process.env.GHL_API_TOKEN?.trim() || "",
    locationId: process.env.GHL_LOCATION_ID?.trim() || "",
    webhookUrl: process.env.GHL_WORKFLOW_WEBHOOK_URL?.trim() || "",
  };
}

function ghlHeaders(token: string, extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_API_VERSION,
    Accept: "application/json",
    ...extra,
  };
}

async function ghlFetch(path: string, token: string, init: RequestInit) {
  const response = await fetch(`${GHL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...ghlHeaders(token),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 300) };
  }

  if (!response.ok) {
    const message =
      (json as { message?: string; error?: string })?.message ||
      (json as { error?: string })?.error ||
      `HighLevel request failed (${response.status})`;
    throw new Error(message);
  }

  return json;
}

function extractContactId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as GhlContact & { contactId?: string };
  return data.contact?.id || data.id || data.contactId || null;
}

export type GhlSyncPhase = "draft" | "signed";

function agreementStatusFor(row: AgreementRow, phase: GhlSyncPhase) {
  if (phase === "signed" || row.status === "signed") return GHL_AGREEMENT_STATUS_SIGNED;
  if (row.status === "draft") return GHL_AGREEMENT_STATUS_DRAFT;
  return GHL_AGREEMENT_STATUS_SENT;
}

function customFieldsFor(row: AgreementRow, phase: GhlSyncPhase = "signed") {
  const mapping = getGhlFieldMapping();
  const fields: { id: string; field_value: string }[] = [];
  const selected = formatSelectedServices(
    Array.isArray(row.selected_services) ? row.selected_services : [],
  ).join(", ");

  const pairs: [string | undefined, string][] = [
    [mapping.agreementStatus, agreementStatusFor(row, phase)],
    [mapping.agreementSignedDate, phase === "signed" ? row.signed_at || row.client_signed_date || "" : ""],
    [mapping.agreementType, GHL_AGREEMENT_TYPE_VALUE],
    [mapping.selectedServices, selected],
    [mapping.setupFee, row.setup_fee || ""],
    [mapping.monthlyFee, row.monthly_fee || ""],
  ];

  for (const [id, value] of pairs) {
    if (id && value) {
      fields.push({ id, field_value: value });
    }
  }

  return fields;
}

export async function upsertGhlContact(row: AgreementRow, phase: GhlSyncPhase = "signed") {
  const { token, locationId } = getGhlConfig();
  if (!token || !locationId) {
    logWarn("ghl.skipped_missing_config");
    return { skipped: true as const, contactId: row.ghl_contact_id };
  }

  if (!row.email && !row.phone && !row.ghl_contact_id) {
    logWarn("ghl.skipped_missing_identity", { agreementId: row.id });
    return { skipped: true as const, contactId: null };
  }

  logInfo("ghl.contact_sync_started", { agreementId: row.id, phase });

  const body: Record<string, unknown> = {
    locationId,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    email: row.email || undefined,
    phone: row.phone || undefined,
    companyName: row.business_name || undefined,
    customFields: customFieldsFor(row, phase),
  };

  if (row.ghl_contact_id) {
    const updated = await ghlFetch(`/contacts/${row.ghl_contact_id}`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const contactId = extractContactId(updated) || row.ghl_contact_id;
    logInfo("ghl.contact_updated", { agreementId: row.id, ghlContactId: contactId });
    return { skipped: false as const, contactId };
  }

  const upserted = await ghlFetch("/contacts/upsert", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const contactId = extractContactId(upserted);
  if (!contactId) {
    throw new Error("HighLevel upsert did not return a contact id.");
  }

  logInfo("ghl.contact_upserted", { agreementId: row.id, ghlContactId: contactId });
  return { skipped: false as const, contactId };
}

function extractDocumentId(payload: unknown, fallback?: string | null) {
  if (payload && typeof payload === "object") {
    const data = payload as Record<string, unknown>;
    const nested = data.file && typeof data.file === "object" ? (data.file as Record<string, unknown>) : null;
    const id =
      data.id ||
      data.fileId ||
      data.documentId ||
      data.mediaId ||
      nested?.id ||
      nested?.fileId;
    if (typeof id === "string" && id) return id;
  }
  return fallback || null;
}

function pdfBlob(pdf: Buffer, filename: string) {
  return new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
}

export async function uploadSignedPdfToGhl(contactId: string, pdf: Buffer, filename: string) {
  const { token, locationId } = getGhlConfig();
  const fileFieldId = getGhlFieldMapping().signedAgreementFile;

  if (!token || !locationId) {
    return { skipped: true as const, documentId: null as string | null };
  }
  if (!fileFieldId) {
    logWarn("ghl.pdf_upload_skipped_missing_field", { ghlContactId: contactId });
    return { skipped: true as const, documentId: null as string | null };
  }

  logInfo("ghl.pdf_upload_started", { ghlContactId: contactId });

  const fileId = crypto.randomUUID();
  const form = new FormData();
  form.append(`${fileFieldId}_${fileId}`, pdfBlob(pdf, filename), filename);

  const response = await fetch(
    `${GHL_API_BASE}/forms/upload-custom-files?contactId=${encodeURIComponent(contactId)}&locationId=${encodeURIComponent(locationId)}`,
    {
      method: "POST",
      headers: ghlHeaders(token),
      body: form,
    },
  );

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw new Error(text.slice(0, 300) || `HighLevel file upload failed (${response.status})`);
  }

  logInfo("ghl.pdf_uploaded", { ghlContactId: contactId });
  return { skipped: false as const, documentId: extractDocumentId(json, fileId) };
}

export async function uploadGhlContactDocument(
  contactId: string,
  pdf: Buffer,
  filename: string,
  options?: { allowCustomFieldFallback?: boolean },
) {
  const { token, locationId } = getGhlConfig();
  if (!token || !locationId) {
    return { skipped: true as const, documentId: null as string | null };
  }

  const blob = pdfBlob(pdf, filename);

  try {
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("name", filename);
    form.append("locationId", locationId);
    const json = await ghlFetch(`/contacts/${contactId}/documents`, token, {
      method: "POST",
      body: form,
    });
    const documentId = extractDocumentId(json);
    logInfo("ghl.contact_document_uploaded", { ghlContactId: contactId, filename });
    return { skipped: false as const, documentId };
  } catch (error) {
    logWarn("ghl.contact_documents_unavailable", {
      message: error instanceof Error ? error.message : "documents endpoint unavailable",
    });
  }

  try {
    const form = new FormData();
    form.append("file", blob, filename);
    form.append("name", filename);
    const json = await ghlFetch("/medias/upload-file", token, {
      method: "POST",
      body: form,
    });
    const documentId = extractDocumentId(json);
    logInfo("ghl.media_uploaded", { ghlContactId: contactId, filename });
    if (documentId) {
      return { skipped: false as const, documentId };
    }
  } catch (error) {
    logWarn("ghl.media_upload_unavailable", {
      message: error instanceof Error ? error.message : "media upload unavailable",
    });
  }

  if (options?.allowCustomFieldFallback === false) {
    return { skipped: true as const, documentId: null as string | null };
  }

  const fieldUpload = await uploadSignedPdfToGhl(contactId, pdf, filename);
  return fieldUpload;
}

export async function triggerGhlWebhook(row: AgreementRow, contactId: string | null) {
  const { webhookUrl } = getGhlConfig();
  if (!webhookUrl) {
    logWarn("ghl.webhook_skipped_missing_url", { agreementId: row.id });
    return { skipped: true as const };
  }

  logInfo("ghl.webhook_started", { agreementId: row.id });

  const payload = {
    event: "agreement.signed",
    agreement_id: row.id,
    ghl_contact_id: contactId,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    phone: row.phone,
    agreement_status: "signed",
    agreement_signed_date: row.signed_at,
    selected_services: row.selected_services,
    setup_fee: row.setup_fee,
    monthly_fee: row.monthly_fee,
    pdf_available: Boolean(row.pdf_path),
  };

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Workflow webhook failed (${response.status})`);
  }

  logInfo("ghl.webhook_triggered", { agreementId: row.id });
  return { skipped: false as const };
}

export async function syncDraftAgreementToGhl(row: AgreementRow, pdf: Buffer) {
  try {
    const contactResult = await upsertGhlContact(row, "draft");
    const contactId = contactResult.contactId || null;
    let documentId: string | null = null;

    if (contactId && !contactResult.skipped) {
      const uploaded = await uploadGhlContactDocument(
        contactId,
        pdf,
        "Service Agreement — Draft (Unsigned).pdf",
      );
      documentId = uploaded.skipped ? null : uploaded.documentId;
    }

    return {
      ok: true as const,
      contactId,
      documentId,
      skipped: contactResult.skipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HighLevel draft sync failed";
    logError("ghl.draft_sync_failed", { agreementId: row.id, message });
    return {
      ok: false as const,
      contactId: row.ghl_contact_id,
      documentId: null,
      error: message,
    };
  }
}

export async function syncSignedAgreementToGhl(row: AgreementRow, pdf: Buffer) {
  try {
    const contactResult = await upsertGhlContact(row, "signed");
    const contactId = contactResult.contactId || null;
    let webhookStatus = "skipped";
    let documentId: string | null = null;

    if (contactId && !contactResult.skipped) {
      const uploaded = await uploadGhlContactDocument(
        contactId,
        pdf,
        "Service Agreement — Signed.pdf",
        { allowCustomFieldFallback: false },
      );
      documentId = uploaded.skipped ? null : uploaded.documentId;
      const fieldUpload = await uploadSignedPdfToGhl(contactId, pdf, "Service Agreement — Signed.pdf");
      if (!documentId && !fieldUpload.skipped) {
        documentId = fieldUpload.documentId;
      }
    }

    try {
      const webhook = await triggerGhlWebhook({ ...row, ghl_contact_id: contactId }, contactId);
      webhookStatus = webhook.skipped ? "skipped" : "sent";
    } catch (error) {
      webhookStatus = "failed";
      logError("ghl.webhook_failed", {
        agreementId: row.id,
        message: error instanceof Error ? error.message : "Webhook failed",
      });
    }

    return {
      ok: true as const,
      contactId,
      documentId,
      webhookStatus,
      skipped: contactResult.skipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HighLevel sync failed";
    logError("ghl.sync_failed", { agreementId: row.id, message });
    return {
      ok: false as const,
      contactId: row.ghl_contact_id,
      documentId: null,
      webhookStatus: "failed",
      error: message,
    };
  }
}
