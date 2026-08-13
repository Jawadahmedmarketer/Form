/**
 * Map GHL custom field IDs from environment variables.
 * Leave a value empty to skip syncing that field.
 */
export type GhlFieldMapping = {
  agreementStatus?: string;
  agreementSignedDate?: string;
  agreementType?: string;
  selectedServices?: string;
  setupFee?: string;
  monthlyFee?: string;
  signedAgreementFile?: string;
};

function envId(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getGhlFieldMapping(): GhlFieldMapping {
  return {
    agreementStatus: envId("GHL_CF_AGREEMENT_STATUS"),
    agreementSignedDate: envId("GHL_CF_AGREEMENT_SIGNED_DATE"),
    agreementType: envId("GHL_CF_AGREEMENT_TYPE"),
    selectedServices: envId("GHL_CF_SELECTED_SERVICES"),
    setupFee: envId("GHL_CF_SETUP_FEE"),
    monthlyFee: envId("GHL_CF_MONTHLY_FEE"),
    signedAgreementFile:
      envId("GHL_SIGNED_AGREEMENT_CUSTOM_FIELD_ID") ||
      envId("GHL_CF_SIGNED_AGREEMENT_FILE"),
  };
}

export const GHL_AGREEMENT_TYPE_VALUE = "Service Agreement";
export const GHL_AGREEMENT_STATUS_DRAFT = "Draft";
export const GHL_AGREEMENT_STATUS_SENT = "Sent";
export const GHL_AGREEMENT_STATUS_SIGNED = "Signed";
