import {
  GHL_AGREEMENT_STATUS_DRAFT,
  GHL_AGREEMENT_STATUS_SENT,
  GHL_AGREEMENT_STATUS_SIGNED,
  GHL_AGREEMENT_TYPE_VALUE,
  getGhlFieldMapping,
} from "@/config/ghl-fields";
import { formatBusinesses, type BusinessItem } from "@/lib/business-builder";
import { formatSelectedServices, normalizeSelectedServices } from "@/config/services";
import { getAppUrl } from "@/lib/agreement";
import { logError, logInfo, logWarn } from "@/lib/logger";
import type { AgreementRow } from "@/lib/supabase/types";

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_API_VERSION = "2021-07-28";

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
    json = null;
  }

  if (!response.ok) {
    const error = new Error(`GHL HTTP ${response.status}: ${text}`);
    (error as Error & { status?: number; payload?: unknown }).status = response.status;
    (error as Error & { status?: number; payload?: unknown }).payload = json;
    throw error;
  }

  return json;
}

export function extractGhlContactId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const contact = (data.contact as Record<string, unknown> | undefined) || data;
  return (
    (typeof contact.id === "string" ? contact.id : null) ||
    (typeof contact.contact_id === "string" ? contact.contact_id : null) ||
    (typeof data.contact_id === "string" ? data.contact_id : null) ||
    null
  );
}

export const extractContactId = extractGhlContactId;

export function ghlContactIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as { id?: string; contactId?: string; contact?: { id?: string } };
  return data.contact?.id || data.id || data.contactId || null;
}

export type GhlSyncPhase = "draft" | "signed";

export type GhlRepresentativeDetails = {
  name: string;
  title: string;
  date: string;
  businessesCovered?: string;
  selectedServices?: string[];
};

type GhlCustomFieldDef = {
  id?: string;
  name?: string;
  fieldKey?: string;
};

type GhlContactCustomField = {
  id?: string;
  value?: unknown;
  field_value?: unknown;
};

let resolvedRepresentativeFieldIds: {
  name?: string;
  title?: string;
  date?: string;
  businessesCovered?: string;
  selectedServices?: string;
} | null = null;

function normalizeFieldName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function stringifyFieldValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (Array.isArray(value)) {
    return value.map((item) => stringifyFieldValue(item)).filter(Boolean).join(", ");
  }
  return "";
}

function matchRepresentativeField(name: string, kind: "name" | "title" | "date") {
  const normalized = normalizeFieldName(name);
  if (kind === "title") {
    return normalized.includes("representative title");
  }
  if (kind === "date") {
    return (
      normalized.includes("company authorization date") ||
      normalized.includes("representative date")
    );
  }
  return normalized.includes("representative name") && !normalized.includes("title");
}

let cachedGhlCustomFieldDefs: GhlCustomFieldDef[] = [];

async function ensureRepresentativeFieldIds() {
  if (resolvedRepresentativeFieldIds && cachedGhlCustomFieldDefs.length > 0) return resolvedRepresentativeFieldIds;

  const mapping = getGhlFieldMapping();
  resolvedRepresentativeFieldIds = {
    name: mapping.representativeName,
    title: mapping.representativeTitle,
    date: mapping.representativeDate,
  };

  const { token, locationId } = getGhlConfig();
  if (!token || !locationId) return resolvedRepresentativeFieldIds;

  try {
    const payload = (await ghlFetch(`/locations/${locationId}/customFields?model=contact`, token, {
      method: "GET",
    })) as { customFields?: GhlCustomFieldDef[]; fields?: GhlCustomFieldDef[] };
    const defs = payload.customFields || payload.fields || [];
    cachedGhlCustomFieldDefs = defs;
    for (const def of defs) {
      const label = `${def.name || ""} ${def.fieldKey || ""}`;
      if (!def.id) continue;
      if (!resolvedRepresentativeFieldIds.name && matchRepresentativeField(label, "name")) {
        resolvedRepresentativeFieldIds.name = def.id;
      }
      if (!resolvedRepresentativeFieldIds.title && matchRepresentativeField(label, "title")) {
        resolvedRepresentativeFieldIds.title = def.id;
      }
      if (!resolvedRepresentativeFieldIds.date && matchRepresentativeField(label, "date")) {
        resolvedRepresentativeFieldIds.date = def.id;
      }
      if (
        !resolvedRepresentativeFieldIds.businessesCovered &&
        (normalizeFieldName(label).includes("businesses covered") ||
          normalizeFieldName(label).includes("business covered") ||
          normalizeFieldName(label).includes("businesses serviced") ||
          normalizeFieldName(label).includes("business serviced"))
      ) {
        resolvedRepresentativeFieldIds.businessesCovered = def.id;
      }
      if (
        !resolvedRepresentativeFieldIds.selectedServices &&
        (normalizeFieldName(def.name || "") === "select" ||
          normalizeFieldName(label).includes("selected services") ||
          normalizeFieldName(label).includes("services included") ||
          normalizeFieldName(def.name || "") === "services")
      ) {
        resolvedRepresentativeFieldIds.selectedServices = def.id;
      }
    }
  } catch (error) {
    logWarn("ghl.custom_fields_lookup_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  return resolvedRepresentativeFieldIds;
}

function valueForFieldId(fields: GhlContactCustomField[], fieldId: string | undefined): string {
  if (!fieldId) return "";
  const match = fields.find((field) => field.id === fieldId);
  return stringifyFieldValue(match?.value ?? match?.field_value);
}

export async function getGhlRepresentativeDetails(
  contactId: string | null | undefined,
): Promise<GhlRepresentativeDetails> {
  const empty = { name: "", title: "", date: "", businessesCovered: "", selectedServices: [] };
  if (!contactId) return empty;

  const { token } = getGhlConfig();
  if (!token) return empty;

  try {
    const ids = await ensureRepresentativeFieldIds();
    const payload = (await ghlFetch(`/contacts/${contactId}`, token, {
      method: "GET",
    })) as {
      contact?: { customFields?: GhlContactCustomField[] };
      customFields?: GhlContactCustomField[];
    };
    const fields = payload.contact?.customFields || payload.customFields || [];

    let businessesCovered = valueForFieldId(fields, ids.businessesCovered);

    // If single field is empty, check for individual numbered fields (Business 1 Name, Business 1 Software, Business 2 Name, etc.)
    if (!businessesCovered.trim()) {
      const items: BusinessItem[] = [];
      for (let i = 1; i <= 5; i++) {
        const nameDef = cachedGhlCustomFieldDefs.find((d) => {
          const n = normalizeFieldName(d.name || "");
          const k = normalizeFieldName(d.fieldKey || "");
          return (
            (n.includes(`business ${i}`) && (n.includes("name") || n === `business ${i}`)) ||
            k.includes(`business_${i}_name`) ||
            k.includes(`business${i}_name`)
          ) && !n.includes("nature") && !n.includes("software") && !n.includes("basis");
        });

        const natureDef = cachedGhlCustomFieldDefs.find((d) => {
          const n = normalizeFieldName(d.name || "");
          const k = normalizeFieldName(d.fieldKey || "");
          return (
            (n.includes(`business ${i}`) && n.includes("nature")) ||
            k.includes(`business_${i}_nature`) ||
            k.includes(`business${i}_nature`)
          );
        });

        const softwareDef = cachedGhlCustomFieldDefs.find((d) => {
          const n = normalizeFieldName(d.name || "");
          const k = normalizeFieldName(d.fieldKey || "");
          return (
            (n.includes(`business ${i}`) && n.includes("software")) ||
            k.includes(`business_${i}_software`) ||
            k.includes(`business${i}_software`)
          );
        });

        const basisDef = cachedGhlCustomFieldDefs.find((d) => {
          const n = normalizeFieldName(d.name || "");
          const k = normalizeFieldName(d.fieldKey || "");
          return (
            (n.includes(`business ${i}`) && (n.includes("basis") || n.includes("accounting"))) ||
            k.includes(`business_${i}_basis`) ||
            k.includes(`business_${i}_accounting_basis`) ||
            k.includes(`business${i}_basis`)
          );
        });

        const name = valueForFieldId(fields, nameDef?.id);
        const nature = valueForFieldId(fields, natureDef?.id);
        const software = valueForFieldId(fields, softwareDef?.id);
        const accountingBasis = valueForFieldId(fields, basisDef?.id);

        if (name || nature || software || accountingBasis) {
          items.push({ name, nature, software, accountingBasis });
        }
      }

      if (items.length > 0) {
        businessesCovered = formatBusinesses(items);
      }
    }

    const rawServices = valueForFieldId(fields, ids.selectedServices);
    const selectedServices = rawServices ? normalizeSelectedServices(rawServices) : [];

    return {
      name: valueForFieldId(fields, ids.name),
      title: valueForFieldId(fields, ids.title),
      date: valueForFieldId(fields, ids.date),
      businessesCovered,
      selectedServices,
    };
  } catch (error) {
    logWarn("ghl.representative_lookup_failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return empty;
  }
}

function agreementStatusFor(row: AgreementRow, phase: GhlSyncPhase) {
  if (phase === "signed" || row.status === "signed") return GHL_AGREEMENT_STATUS_SIGNED;
  if (row.status === "draft") return GHL_AGREEMENT_STATUS_DRAFT;
  return GHL_AGREEMENT_STATUS_SENT;
}

function customFieldsFor(row: AgreementRow, phase: GhlSyncPhase = "signed") {
  const mapping = getGhlFieldMapping();
  const resolved = resolvedRepresentativeFieldIds;
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
    [mapping.representativeName || resolved?.name, row.representative_name || ""],
    [mapping.representativeTitle || resolved?.title, row.representative_title || ""],
    [
      mapping.representativeDate || resolved?.date,
      phase === "signed"
        ? (row.representative_date || row.signed_at || "").slice(0, 10)
        : (row.representative_date || "").slice(0, 10),
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

  await ensureRepresentativeFieldIds();

  const fields: Record<string, unknown> = {
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
      body: JSON.stringify(fields),
    });
    const contactId = extractContactId(updated) || row.ghl_contact_id;
    logInfo("ghl.contact_updated", { agreementId: row.id, ghlContactId: contactId });
    return { skipped: false as const, contactId };
  }

  const upserted = await ghlFetch("/contacts/upsert", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locationId, ...fields }),
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
      signal: AbortSignal.timeout(25_000),
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
      uploaded = await uploadSignedPdfToGhl(contactId, pdf, "Service Agreement — Signed.pdf");
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
