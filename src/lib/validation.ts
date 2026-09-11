import { z } from "zod";
import { SERVICE_OPTIONS, normalizeSelectedServices } from "@/config/services";

const serviceIds = SERVICE_OPTIONS.map((service) => service.id) as [string, ...string[]];
const selectedServiceIdList = z.array(z.enum(serviceIds));

/**
 * Runtime: accept array / CSV / JSON via normalizeSelectedServices.
 * Types: string[] in and out so zodResolver matches useForm (z.preprocess
 * would otherwise type the field input as unknown and break RHF inference).
 */
function preprocessSelectedServices<T extends z.ZodType<string[]>>(
  schema: T,
): z.ZodType<z.output<T>, z.ZodTypeDef, z.output<T>> {
  return z.preprocess(
    (value: unknown) => normalizeSelectedServices(value),
    schema,
  ) as z.ZodType<z.output<T>, z.ZodTypeDef, z.output<T>>;
}

const optionalText = z.string().trim().max(2000);
const requiredText = z.string().trim().min(1, "This field is required.").max(200);

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(25, "Enter a valid phone number.")
  .regex(/^\+?[0-9\s().-]{7,25}$/, "Enter a valid US or international phone number.");

export const signAgreementSchema = z
  .object({
    firstName: requiredText.max(80),
    lastName: requiredText.max(80),
    businessName: optionalText,
    email: z.string().trim().email("Enter a valid email address.").max(160),
    phone: phoneSchema,
    businessAddress: optionalText,
    taxPeriod: optionalText,
    agreementDate: z.string().trim().min(1, "Agreement date is required."),
    businessesCovered: z.string().trim().max(4000),
    selectedServices: preprocessSelectedServices(
      selectedServiceIdList.min(1, "Select at least one service."),
    ),
    otherService: optionalText,
    serviceDescription: z.string().trim().max(4000),
    serviceStartDate: optionalText,
    serviceEndDate: optionalText,
    setupFee: optionalText,
    monthlyFee: optionalText,
    setupFeeLabel: z.string().trim().max(4000),
    monthlyFeeLabel: z.string().trim().max(4000),
    paymentSchedule: optionalText,
    paymentMethod: optionalText,
    acceptedTerms: z.boolean().refine((value) => value === true, {
      message: "You must accept the terms of this agreement.",
    }),
    clientSignature: z
      .string()
      .min(80, "A signature is required.")
      .refine((value) => value.startsWith("data:image/png;base64,"), "Signature must be a PNG image."),
    clientPrintedName: requiredText.max(120),
    clientTitle: optionalText,
    clientSignedDate: z.string().trim().min(1, "Signature date is required."),
  });

export type SignAgreementInput = z.infer<typeof signAgreementSchema>;

function looseString(maxLen = 4000, fallback = "") {
  return z.preprocess((val) => {
    if (val === null || val === undefined || val === "null" || val === "undefined") return fallback;
    return String(val).trim();
  }, z.string().max(maxLen).default(fallback));
}

export const createAgreementSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const src = raw as Record<string, unknown>;
  const obj: Record<string, unknown> = {};

  // Copy and normalize snake_case / camelCase aliases
  for (const [k, v] of Object.entries(src)) {
    const cleanVal = v === null || v === "null" || v === "undefined" ? undefined : v;
    obj[k] = cleanVal;
  }

  const alias = (target: string, ...sources: string[]) => {
    if (obj[target] !== undefined && obj[target] !== "") return;
    for (const s of sources) {
      if (obj[s] !== undefined && obj[s] !== "" && obj[s] !== null) {
        obj[target] = obj[s];
        break;
      }
    }
  };

  alias("firstName", "first_name", "first", "fname");
  alias("lastName", "last_name", "last", "lname");
  alias("businessName", "business_name", "company_name", "company");
  alias("businessAddress", "business_address", "address");
  alias("taxPeriod", "tax_period");
  alias("agreementDate", "agreement_date", "date");
  alias("businessesCovered", "businesses_covered", "businesses");
  alias("selectedServices", "selected_services", "services");
  alias("otherService", "other_service");
  alias("representativeName", "representative_name", "rep_name");
  alias("representativeTitle", "representative_title", "rep_title");
  alias("representativeSignature", "representative_signature", "rep_signature");
  alias("serviceDescription", "service_description", "description");
  alias("serviceStartDate", "service_start_date", "start_date");
  alias("serviceEndDate", "service_end_date", "end_date");
  alias("setupFee", "setup_fee");
  alias("monthlyFee", "monthly_fee");
  alias("setupFeeLabel", "setup_fee_label");
  alias("monthlyFeeLabel", "monthly_fee_label");
  alias("paymentSchedule", "payment_schedule");
  alias("paymentMethod", "payment_method");
  alias("ghlContactId", "ghl_contact_id", "contact_id", "contactId", "id");
  alias("paymentUrl", "payment_url");
  alias("expiresAt", "expires_at");

  return obj;
}, z.object({
  firstName: looseString(80, ""),
  lastName: looseString(80, ""),
  businessName: looseString(160, ""),
  email: looseString(160, ""),
  phone: looseString(80, ""),
  businessAddress: looseString(2000, ""),
  taxPeriod: looseString(200, ""),
  agreementDate: looseString(100, ""),
  businessesCovered: looseString(4000, ""),
  selectedServices: z.preprocess(
    (val) => normalizeSelectedServices(val),
    z.array(z.string()).default([]),
  ),
  otherService: looseString(2000, ""),
  representativeName: looseString(80, ""),
  representativeTitle: looseString(80, ""),
  representativeSignature: looseString(200000, ""),
  serviceDescription: looseString(4000, ""),
  serviceStartDate: looseString(100, ""),
  serviceEndDate: looseString(200, "Ongoing — no fixed end date"),
  setupFee: looseString(80, ""),
  monthlyFee: looseString(80, ""),
  setupFeeLabel: looseString(4000, ""),
  monthlyFeeLabel: looseString(4000, ""),
  paymentSchedule: looseString(200, "Setup due on signing; monthly thereafter"),
  paymentMethod: looseString(200, "Card / bank payment via secure payment link"),
  ghlContactId: looseString(80, ""),
  paymentUrl: looseString(2000, ""),
  expiresAt: looseString(100, ""),
  fieldLocks: z.record(z.string()).optional(),
  status: z.preprocess(
    (val) => (val === "draft" ? "draft" : "sent"),
    z.enum(["draft", "sent"]).default("sent"),
  ),
}));

export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;

export const adminCreateFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required.").max(80),
    lastName: z.string().trim().min(1, "Last name is required.").max(80),
    businessName: z.string().trim().max(160),
    email: z.string().trim().email("Enter a valid email address.").max(160),
    phone: z.string().trim().max(25),
    businessAddress: z.string().trim().max(2000),
    taxPeriod: z.string().trim().max(200),
    agreementDate: z.string().trim(),
    businessesCovered: z.string().trim().max(4000),
    selectedServices: preprocessSelectedServices(
      selectedServiceIdList.min(1, "Select at least one service."),
    ),
    otherService: z.string().trim().max(2000),
    representativeName: z.string().trim().max(80),
    representativeTitle: z.string().trim().max(80),
    representativeSignature: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || value.startsWith("data:image/png;base64,"),
        "Signature must be a PNG image.",
      ),
    serviceDescription: z.string().trim().max(4000),
    serviceStartDate: z.string().trim(),
    serviceEndDate: z.string().trim(),
    setupFee: z.string().trim().max(80),
    monthlyFee: z.string().trim().max(80),
    setupFeeLabel: z.string().trim().max(4000),
    monthlyFeeLabel: z.string().trim().max(4000),
    paymentSchedule: z.string().trim().max(200),
    paymentMethod: z.string().trim().max(200),
    ghlContactId: z.string().trim().max(80),
    paymentUrl: z
      .string()
      .trim()
      .refine((value) => value === "" || z.string().url().safeParse(value).success, "Enter a valid URL."),
    status: z.enum(["draft", "sent"]),
  })
  .superRefine((value, ctx) => {
    if (value.selectedServices.includes("other") && !value.otherService.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherService"],
        message: "Describe the other service.",
      });
    }
  });

export type AdminCreateFormInput = z.infer<typeof adminCreateFormSchema>;
