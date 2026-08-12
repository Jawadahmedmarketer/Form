import {
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

function customFieldsFor(row: AgreementRow) {
  const mapping = getGhlFieldMapping();
  const fields: { id: string; field_value: string }[] = [];
  const selected = formatSelectedServices(
    Array.isArray(row.selected_services) ? row.selected_services : [],
  ).join(", ");

  const pairs: [string | undefined, string][] = [
    [mapping.agreementStatus, GHL_AGREEMENT_STATUS_SIGNED],
    [mapping.agreementSignedDate, row.signed_at || row.client_signed_date || ""],
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

export async function upsertGhlContact(row: AgreementRow) {
  const { token, locationId } = getGhlConfig();
  if (!token || !locationId) {
    logWarn("ghl.skipped_missing_config");
    return { skipped: true as const, contactId: row.ghl_contact_id };
  }

  logInfo("ghl.contact_sync_started", { agreementId: row.id });

  const body: Record<string, unknown> = {
    locationId,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    email: row.email || undefined,
    phone: row.phone || undefined,
    companyName: row.business_name || undefined,
    customFields: customFieldsFor(row),
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

export async function uploadSignedPdfToGhl(contactId: string, pdf: Buffer, filename: string) {
  const { token, locationId } = getGhlConfig();
  const fileFieldId = getGhlFieldMapping().signedAgreementFile;

  if (!token || !locationId) {
    return { skipped: true as const };
  }
  if (!fileFieldId) {
    logWarn("ghl.pdf_upload_skipped_missing_field", { ghlContactId: contactId });
    return { skipped: true as const };
  }

  logInfo("ghl.pdf_upload_started", { ghlContactId: contactId });

  const fileId = crypto.randomUUID();
  const form = new FormData();
  form.append(
    `${fileFieldId}_${fileId}`,
    new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    filename,
  );

  const response = await fetch(
    `${GHL_API_BASE}/forms/upload-custom-files?contactId=${encodeURIComponent(contactId)}&locationId=${encodeURIComponent(locationId)}`,
    {
      method: "POST",
      headers: ghlHeaders(token),
      body: form,
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.slice(0, 300) || `HighLevel file upload failed (${response.status})`);
  }

  logInfo("ghl.pdf_uploaded", { ghlContactId: contactId });
  return { skipped: false as const };
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

export async function syncSignedAgreementToGhl(row: AgreementRow, pdf: Buffer) {
  try {
    const contactResult = await upsertGhlContact(row);
    const contactId = contactResult.contactId || null;
    let webhookStatus = "skipped";

    if (contactId && !contactResult.skipped) {
      await uploadSignedPdfToGhl(contactId, pdf, row.pdf_filename || "signed-agreement.pdf");
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
      webhookStatus,
      skipped: contactResult.skipped,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HighLevel sync failed";
    logError("ghl.sync_failed", { agreementId: row.id, message });
    return {
      ok: false as const,
      contactId: row.ghl_contact_id,
      webhookStatus: "failed",
      error: message,
    };
  }
}
