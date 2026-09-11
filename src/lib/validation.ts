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

export const createAgreementSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if (obj.selectedServices == null && obj.selected_services != null) {
    obj.selectedServices = obj.selected_services;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === "null" || value === "undefined") {
      obj[key] = undefined;
    }
  }
  return obj;
}, z.object({
  firstName: z.string().trim().max(80).nullish().default(""),
  lastName: z.string().trim().max(80).nullish().default(""),
  businessName: z.string().trim().max(160).nullish().default(""),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, "Enter a valid email address.")
    .nullish()
    .default(""),
  phone: z.string().trim().max(25).nullish().default(""),
  businessAddress: z.string().trim().max(2000).nullish().default(""),
  taxPeriod: z.string().trim().max(200).nullish().default(""),
  agreementDate: z.string().trim().nullish().default(""),
  businessesCovered: z.string().trim().max(4000).nullish().default(""),
  selectedServices: preprocessSelectedServices(selectedServiceIdList).nullish().default([]),
  otherService: z.string().trim().max(2000).nullish().default(""),
  representativeName: z.string().trim().max(80).nullish().default(""),
  representativeTitle: z.string().trim().max(80).nullish().default(""),
  representativeSignature: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || value.startsWith("data:image/png;base64,"),
      "Signature must be a PNG image.",
    )
    .nullish()
    .default(""),
  serviceDescription: z.string().trim().max(4000).nullish().default(""),
  serviceStartDate: z.string().trim().nullish().default(""),
  serviceEndDate: z.string().trim().nullish().default("Ongoing — no fixed end date"),
  setupFee: z.string().trim().max(80).nullish().default(""),
  monthlyFee: z.string().trim().max(80).nullish().default(""),
  setupFeeLabel: z.string().trim().max(4000).nullish().default(""),
  monthlyFeeLabel: z.string().trim().max(4000).nullish().default(""),
  paymentSchedule: z.string().trim().max(200).nullish().default("Setup due on signing; monthly thereafter"),
  paymentMethod: z.string().trim().max(200).nullish().default("Card / bank payment via secure payment link"),
  ghlContactId: z.string().trim().max(80).nullish().default(""),
  paymentUrl: z.string().trim().url().optional().or(z.literal("")).nullish().default(""),
  expiresAt: z.string().trim().nullish().default(""),
  fieldLocks: z.record(z.enum(["editable", "prefilled_editable", "locked"])).optional(),
  status: z.enum(["draft", "sent"]).nullish().default("sent"),
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
