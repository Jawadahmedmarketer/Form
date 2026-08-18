import { logError, logInfo } from "@/lib/logger";

interface CreateInvoiceParams {
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  setupFee?: string | null;
  monthlyFee?: string | null;
}

interface InvoiceResult {
  invoiceId: string;
  paymentUrl: string;
}

type GhlInvoicePayload = {
  _id?: string;
  id?: string;
  invoiceUrl?: string;
  url?: string;
  invoice?: {
    _id?: string;
    id?: string;
    invoiceUrl?: string;
    url?: string;
  };
};

function parseAmount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^0-9.]/g, "");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function extractInvoiceId(payload: GhlInvoicePayload | null | undefined): string | null {
  if (!payload) return null;
  return payload._id || payload.invoice?._id || payload.id || payload.invoice?.id || null;
}

function extractPaymentUrl(payload: GhlInvoicePayload | null | undefined): string | null {
  if (!payload) return null;
  const url =
    payload.invoiceUrl || payload.invoice?.invoiceUrl || payload.url || payload.invoice?.url || null;
  return url?.trim() || null;
}

export async function createAgreementInvoice(
  params: CreateInvoiceParams,
): Promise<InvoiceResult | null> {
  const token = process.env.GHL_INVOICE_API_TOKEN?.trim();
  const locationId = process.env.GHL_LOCATION_ID?.trim();
  const userId = process.env.GHL_INVOICE_USER_ID?.trim();

  if (!token || !locationId || !userId) {
    logError("ghl_invoice.missing_config", {
      hasToken: Boolean(token),
      hasLocationId: Boolean(locationId),
      hasUserId: Boolean(userId),
    });
    return null;
  }

  if (!params.contactId) {
    logError("ghl_invoice.missing_contact_id", {});
    return null;
  }

  const setupFee = parseAmount(params.setupFee);
  const monthlyFee = parseAmount(params.monthlyFee);

  const items: Array<{ name: string; qty: number; amount: number; currency: string }> = [];
  if (setupFee > 0) {
    items.push({ name: "Setup Fee", qty: 1, amount: setupFee, currency: "USD" });
  }
  if (monthlyFee > 0) {
    items.push({ name: "Monthly Fee (First Payment)", qty: 1, amount: monthlyFee, currency: "USD" });
  }

  if (items.length === 0) {
    logInfo("ghl_invoice.no_fee_amount", { contactId: params.contactId });
    return null;
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Version: "2021-07-28",
  };

  try {
    const createRes = await fetch("https://services.leadconnectorhq.com/invoices/", {
      method: "POST",
      headers,
      body: JSON.stringify({
        altId: locationId,
        altType: "location",
        name: `Service Agreement Invoice - ${params.contactName}`,
        businessDetails: { name: "Unified Tax Group" },
        invoiceNumber: String(Date.now()),
        currency: "USD",
        contactDetails: {
          id: params.contactId,
          name: params.contactName,
          email: params.contactEmail,
          phoneNo: params.contactPhone,
        },
        issueDate: formatDate(issueDate),
        dueDate: formatDate(dueDate),
        discount: { type: "percentage", value: 0 },
        items,
        total,
        title: "INVOICE",
        amountDue: total,
        liveMode: true,
        automaticTaxesEnabled: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      logError("ghl_invoice.create_failed", { status: createRes.status, body: errText });
      return null;
    }

    const created = (await createRes.json()) as GhlInvoicePayload;
    const invoiceId = extractInvoiceId(created);
    if (!invoiceId) {
      logError("ghl_invoice.create_no_id", {
        keys: created && typeof created === "object" ? Object.keys(created) : [],
      });
      return null;
    }

    const sendRes = await fetch(
      `https://services.leadconnectorhq.com/invoices/${invoiceId}/send`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          altId: locationId,
          altType: "location",
          userId,
          action: "send_manually",
          liveMode: true,
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );

    let paymentUrl: string | null = null;
    if (!sendRes.ok) {
      const errText = await sendRes.text();
      logError("ghl_invoice.send_failed", {
        status: sendRes.status,
        body: errText,
        invoiceId,
      });
    } else {
      const sent = (await sendRes.json()) as GhlInvoicePayload;
      paymentUrl = extractPaymentUrl(sent);
    }

    if (!paymentUrl) {
      const getRes = await fetch(
        `https://services.leadconnectorhq.com/invoices/${invoiceId}?altId=${encodeURIComponent(locationId)}&altType=location`,
        {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(25_000),
        },
      );
      if (getRes.ok) {
        const fetched = (await getRes.json()) as GhlInvoicePayload;
        paymentUrl = extractPaymentUrl(fetched);
      } else {
        const errText = await getRes.text();
        logError("ghl_invoice.fetch_failed", {
          status: getRes.status,
          body: errText,
          invoiceId,
        });
      }
    }

    if (!paymentUrl) {
      logError("ghl_invoice.no_payment_url", { invoiceId });
      return null;
    }

    logInfo("ghl_invoice.created", { invoiceId, contactId: params.contactId });
    return { invoiceId, paymentUrl };
  } catch (error) {
    logError("ghl_invoice.unexpected_error", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
