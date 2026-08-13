import {
  GHL_AGREEMENT_STATUS_DRAFT,
  GHL_AGREEMENT_STATUS_SENT,
  GHL_AGREEMENT_STATUS_SIGNED,
  GHL_AGREEMENT_TYPE_VALUE,
  getGhlFieldMapping,
} from "@/config/ghl-fields";
import { formatSelectedServices } from "@/config/services";
import { getAppUrl } from "@/lib/agreement";
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
    [
      mapping.agreementLink,
      row.public_token ? `${getAppUrl()}/agreement/${row.public_token}` : "",
    ],
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

export type GhlDocumentDestination = "custom_field" | "contact_documents" | "media";

export type GhlDocumentUploadResult = {
  skipped: boolean;
  documentId: string | null;
  destination: GhlDocumentDestination | null;
  contactVisible: boolean;
  note: string | null;
};

function responseKeys(payload: unknown) {
  if (!payload || typeof payload !== "object") return typeof payload;
  return Object.keys(payload as object).slice(0, 12).join(",");
}

function extractMediaOrDocumentId(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const nested = data.file && typeof data.file === "object" ? (data.file as Record<string, unknown>) : null;
  const id = data.fileId || data.documentId || data.mediaId || nested?.fileId || nested?.id;
  return typeof id === "string" && id ? id : null;
}

function pdfBlob(pdf: Buffer, filename: string) {
  return new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
}

async function probeContactDocumentsEndpoint(contactId: string, token: string, locationId: string, pdf: Buffer, filename: string) {
  const form = new FormData();
  form.append("file", pdfBlob(pdf, filename), filename);
  form.append("name", filename);
  form.append("locationId", locationId);

  const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}/documents`, {
    method: "POST",
    headers: ghlHeaders(token),
    body: form,
  });

  logWarn("ghl.contact_documents_probe", {
    httpStatus: response.status,
    ok: response.ok,
    reason: "This path is not an official HighLevel Documents-tab API.",
  });

  if (!response.ok) return null;
  const json = await response.json().catch(() => null);
  return extractMediaOrDocumentId(json);
}

export async function uploadSignedPdfToGhl(contactId: string, pdf: Buffer, filename: string): Promise<GhlDocumentUploadResult> {
  const { token, locationId } = getGhlConfig();
  const fileFieldId = getGhlFieldMapping().signedAgreementFile;

  if (!token || !locationId) {
    return {
      skipped: true,
      documentId: null,
      destination: null,
      contactVisible: false,
      note: "HighLevel token or location is not configured.",
    };
  }
  if (!fileFieldId) {
    logWarn("ghl.pdf_upload_skipped_missing_field", { ghlContactId: contactId });
    return {
      skipped: true,
      documentId: null,
      destination: null,
      contactVisible: false,
      note: "GHL_SIGNED_AGREEMENT_CUSTOM_FIELD_ID is missing, so the contact file field cannot be used.",
    };
  }

  const fileId = crypto.randomUUID();
  const form = new FormData();
  form.append(`${fileFieldId}_${fileId}`, pdfBlob(pdf, filename), filename);

  logInfo("ghl.custom_field_upload_started", {
    endpoint: "/forms/upload-custom-files",
    filename,
  });

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
    logError("ghl.custom_field_upload_failed", { httpStatus: response.status });
    throw new Error(text.slice(0, 300) || `HighLevel file upload failed (${response.status})`);
  }

  logInfo("ghl.custom_field_uploaded", {
    endpoint: "/forms/upload-custom-files",
    destination: "custom_field",
    contactVisible: true,
    responseKeys: responseKeys(json),
    documentIdSource: "generated_file_id",
  });

  return {
    skipped: false,
    documentId: fileId,
    destination: "custom_field",
    contactVisible: true,
    note: "Uploaded to the contact file custom field via /forms/upload-custom-files.",
  };
}

export async function uploadGhlContactDocument(
  contactId: string,
  pdf: Buffer,
  filename: string,
): Promise<GhlDocumentUploadResult> {
  const { token, locationId } = getGhlConfig();
  if (!token || !locationId) {
    return {
      skipped: true,
      documentId: null,
      destination: null,
      contactVisible: false,
      note: "HighLevel token or location is not configured.",
    };
  }

  try {
    const documentId = await probeContactDocumentsEndpoint(contactId, token, locationId, pdf, filename);
    if (documentId) {
      logInfo("ghl.contact_documents_uploaded", {
        endpoint: "/contacts/{id}/documents",
        destination: "contact_documents",
      });
      return {
        skipped: false,
        documentId,
        destination: "contact_documents",
        contactVisible: true,
        note: "Uploaded via /contacts/{id}/documents.",
      };
    }
  } catch (error) {
    logWarn("ghl.contact_documents_unavailable", {
      endpoint: "/contacts/{id}/documents",
      message: error instanceof Error ? error.message : "documents endpoint unavailable",
    });
  }

  try {
    return await uploadSignedPdfToGhl(contactId, pdf, filename);
  } catch (error) {
    logWarn("ghl.custom_field_upload_unavailable", {
      endpoint: "/forms/upload-custom-files",
      message: error instanceof Error ? error.message : "custom field upload failed",
    });
  }

  try {
    const form = new FormData();
    form.append("file", pdfBlob(pdf, filename), filename);
    form.append("name", filename);
    const json = await ghlFetch("/medias/upload-file", token, {
      method: "POST",
      body: form,
    });
    const documentId = extractMediaOrDocumentId(json);
    logWarn("ghl.media_uploaded_not_on_contact", {
      endpoint: "/medias/upload-file",
      destination: "media",
      contactVisible: false,
      responseKeys: responseKeys(json),
    });
    return {
      skipped: false,
      documentId,
      destination: "media",
      contactVisible: false,
      note: "File landed in the HighLevel media library, not the contact Documents tab. /forms/upload-custom-files did not succeed.",
    };
  } catch (error) {
    logWarn("ghl.media_upload_unavailable", {
      endpoint: "/medias/upload-file",
      message: error instanceof Error ? error.message : "media upload unavailable",
    });
  }

  return {
    skipped: true,
    documentId: null,
    destination: null,
    contactVisible: false,
    note: "No HighLevel file endpoint accepted the upload.",
  };
}

function syncStatusForUpload(uploaded: GhlDocumentUploadResult, contactSkipped: boolean) {
  if (contactSkipped) return "skipped" as const;
  if (uploaded.contactVisible) return "synced" as const;
  if (uploaded.documentId && uploaded.destination === "media") return "partial" as const;
  if (uploaded.skipped) return "skipped" as const;
  return "failed" as const;
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

export async function syncAgreementLinkToGhl(row: AgreementRow) {
  try {
    const contactResult = await upsertGhlContact(row, "draft");
    const contactId = contactResult.contactId || null;
    const linkField = getGhlFieldMapping().agreementLink;
    const note = contactResult.skipped
      ? "Contact sync was skipped."
      : linkField
        ? "Signing link written to the HighLevel text field."
        : "Contact synced. GHL_AGREEMENT_LINK_FIELD_ID is not set.";
    const status = contactResult.skipped ? ("skipped" as const) : ("synced" as const);

    logInfo("ghl.link_sync_finished", {
      agreementId: row.id,
      status,
      hasLinkField: Boolean(linkField),
    });

    return {
      ok: true as const,
      contactId,
      status,
      note,
      skipped: contactResult.skipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HighLevel link sync failed";
    logError("ghl.link_sync_failed", { agreementId: row.id, message });
    return {
      ok: false as const,
      contactId: row.ghl_contact_id,
      status: "failed" as const,
      note: message,
      error: message,
    };
  }
}

export async function syncSignedAgreementToGhl(row: AgreementRow, pdf: Buffer) {
  try {
    const contactResult = await upsertGhlContact(row, "signed");
    const contactId = contactResult.contactId || null;
    let webhookStatus = "skipped";
    let uploaded: GhlDocumentUploadResult = {
      skipped: true,
      documentId: null,
      destination: null,
      contactVisible: false,
      note: contactResult.skipped ? "Contact sync was skipped." : "Signed PDF was not uploaded.",
    };

    if (contactId && !contactResult.skipped) {
      uploaded = await uploadGhlContactDocument(contactId, pdf, "Service Agreement — Signed.pdf");
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

    const status = syncStatusForUpload(uploaded, contactResult.skipped);
    logInfo("ghl.signed_sync_finished", {
      agreementId: row.id,
      status,
      destination: uploaded.destination,
      contactVisible: uploaded.contactVisible,
    });

    return {
      ok: status !== "failed",
      contactId,
      documentId: uploaded.documentId,
      destination: uploaded.destination,
      note: uploaded.note,
      status,
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
      destination: null,
      note: message,
      status: "failed" as const,
      webhookStatus: "failed",
      error: message,
    };
  }
}
