import type { FieldLockMode, FieldLocks } from "@/lib/supabase/types";

export const DEFAULT_FIELD_LOCKS: Required<FieldLocks> = {
  firstName: "prefilled_editable",
  lastName: "prefilled_editable",
  businessName: "prefilled_editable",
  email: "prefilled_editable",
  phone: "prefilled_editable",
  businessAddress: "prefilled_editable",
  taxPeriod: "prefilled_editable",
  agreementDate: "prefilled_editable",
  businessesCovered: "prefilled_editable",
  selectedServices: "prefilled_editable",
  otherService: "prefilled_editable",
  serviceDescription: "prefilled_editable",
  serviceStartDate: "locked",
  serviceEndDate: "locked",
  setupFee: "locked",
  monthlyFee: "locked",
  paymentSchedule: "locked",
  paymentMethod: "locked",
};

export function mergeFieldLocks(locks?: FieldLocks | null): Required<FieldLocks> {
  return { ...DEFAULT_FIELD_LOCKS, ...(locks ?? {}) };
}

export function isLocked(mode: FieldLockMode | undefined) {
  return mode === "locked";
}

/** Lock service description when admin/GHL prefilled a non-empty value. */
export function withServiceDescriptionLock(
  locks: FieldLocks | null | undefined,
  serviceDescription?: string | null,
): FieldLocks {
  const next: FieldLocks = { ...(locks ?? {}) };
  if (serviceDescription?.trim()) {
    next.serviceDescription = "locked";
  } else {
    delete next.serviceDescription;
  }
  return next;
}
