export const COMPANY = {
  brandName: "Unified Tax Group",
  legalName: "Prosperity Solutions LLC",
  addressLine1: "1209 Mountain Road Pl NE Ste R",
  addressLine2: "Albuquerque, New Mexico 87110",
  country: "United States",
  email: "info@unifiedtaxgroup.com",
  phone: "+1 213-474-3648",
  website: "unifiedtaxgroup.com",
  websiteUrl: "https://unifiedtaxgroup.com",
} as const;

export const COMPANY_ADDRESS_SINGLE_LINE = `${COMPANY.addressLine1}, ${COMPANY.addressLine2}`;

export const REPRESENTATIVE = {
  printedName: "Jawad Ahmed",
  title: "CEO",
  /**
   * pre_authorized: use the approved signature asset on file
   * manual: captured later by an authorized user
   * approval_workflow: completed in a separate internal step
   */
  signatureMode: "pre_authorized" as
    | "pre_authorized"
    | "manual"
    | "approval_workflow",
  signatureFileName: "authorized-signature.png",
};

export function getPaymentUrl() {
  return process.env.PAYMENT_URL?.trim() || "";
}
