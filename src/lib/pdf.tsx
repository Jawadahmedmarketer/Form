import { renderToBuffer } from "@react-pdf/renderer";
import { REPRESENTATIVE } from "@/config/company";
import { AgreementPdf, type AgreementPdfData } from "@/components/pdf/AgreementPdf";
import { logError, logInfo } from "@/lib/logger";
import type { AgreementRow } from "@/lib/supabase/types";

export async function generateAgreementPdf(data: AgreementPdfData) {
  logInfo("pdf.generation_started", { variant: data.variant || "signed" });
  try {
    const buffer = await renderToBuffer(<AgreementPdf data={data} />);
    logInfo("pdf.generation_completed", { bytes: buffer.byteLength });
    return Buffer.from(buffer);
  } catch (error) {
    logError("pdf.generation_failed", {
      message: error instanceof Error ? error.message : "PDF generation failed",
    });
    throw new Error(
      data.variant === "draft"
        ? "Unable to generate the draft agreement PDF."
        : "Unable to generate the signed agreement PDF.",
    );
  }
}

export async function generateDraftAgreementPdf(row: AgreementRow) {
  return generateAgreementPdf({
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    businessName: row.business_name || "",
    email: row.email || "",
    phone: row.phone || "",
    businessAddress: row.business_address || "",
    taxPeriod: row.tax_period || "",
    agreementDate: row.agreement_date || "",
    businessesCovered: row.businesses_covered || "",
    selectedServices: Array.isArray(row.selected_services) ? row.selected_services : [],
    otherService: row.other_service || "",
    serviceDescription: row.service_description || "",
    serviceStartDate: row.service_start_date || "",
    serviceEndDate: row.service_end_date || "",
    setupFee: row.setup_fee || "",
    monthlyFee: row.monthly_fee || "",
    paymentSchedule: row.payment_schedule || "",
    paymentMethod: row.payment_method || "",
    clientPrintedName: "",
    clientTitle: "",
    clientSignedDate: "",
    clientSignatureDataUrl: null,
    representativeName: row.representative_name || REPRESENTATIVE.printedName,
    representativeTitle: row.representative_title || REPRESENTATIVE.title,
    representativeDate: row.representative_date || "",
    representativeSignatureDataUrl: null,
    signedAtLabel: "",
    maskedIp: "",
    fingerprint: "",
    variant: "draft",
  });
}
