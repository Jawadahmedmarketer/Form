export const AGREEMENT_STATUSES = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "cancelled",
  "expired",
] as const;

export type AgreementStatus = (typeof AGREEMENT_STATUSES)[number];

export const GHL_SYNC_STATUSES = [
  "pending",
  "synced",
  "failed",
  "skipped",
] as const;

export type GhlSyncStatus = (typeof GHL_SYNC_STATUSES)[number];

export type FieldLockMode = "editable" | "prefilled_editable" | "locked";

export type FieldLocks = {
  firstName?: FieldLockMode;
  lastName?: FieldLockMode;
  businessName?: FieldLockMode;
  email?: FieldLockMode;
  phone?: FieldLockMode;
  businessAddress?: FieldLockMode;
  taxPeriod?: FieldLockMode;
  agreementDate?: FieldLockMode;
  businessesCovered?: FieldLockMode;
  selectedServices?: FieldLockMode;
  otherService?: FieldLockMode;
  serviceDescription?: FieldLockMode;
  serviceStartDate?: FieldLockMode;
  serviceEndDate?: FieldLockMode;
  setupFee?: FieldLockMode;
  monthlyFee?: FieldLockMode;
  paymentSchedule?: FieldLockMode;
  paymentMethod?: FieldLockMode;
};

export type AgreementRow = {
  id: string;
  public_token: string;
  ghl_contact_id: string | null;
  status: AgreementStatus;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  business_address: string | null;
  tax_period: string | null;
  agreement_date: string | null;
  businesses_covered: string | null;
  selected_services: string[] | null;
  other_service: string | null;
  service_description: string | null;
  service_start_date: string | null;
  service_end_date: string | null;
  setup_fee: string | null;
  monthly_fee: string | null;
  payment_schedule: string | null;
  payment_method: string | null;
  client_printed_name: string | null;
  client_title: string | null;
  client_signed_date: string | null;
  client_signature_path: string | null;
  representative_name: string | null;
  representative_title: string | null;
  representative_date: string | null;
  representative_signature_path: string | null;
  pdf_path: string | null;
  pdf_filename: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  document_fingerprint: string | null;
  ghl_sync_status: GhlSyncStatus | null;
  ghl_synced_at: string | null;
  ghl_sync_error: string | null;
  ghl_webhook_status: string | null;
  ghl_draft_document_id: string | null;
  ghl_signed_document_id: string | null;
  field_locks: FieldLocks | null;
  payment_url: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  email_status: string | null;
  email_sent_at: string | null;
  email_error: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicAgreement = {
  publicToken: string;
  status: AgreementStatus;
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  businessAddress: string;
  taxPeriod: string;
  agreementDate: string;
  businessesCovered: string;
  selectedServices: string[];
  otherService: string;
  serviceDescription: string;
  serviceStartDate: string;
  serviceEndDate: string;
  setupFee: string;
  monthlyFee: string;
  paymentSchedule: string;
  paymentMethod: string;
  fieldLocks: FieldLocks;
  representativeName: string;
  representativeTitle: string;
  representativeDate: string;
  representativeSignatureDataUrl: string | null;
  clientPrintedName: string;
  clientTitle: string;
  clientSignedDate: string;
};
