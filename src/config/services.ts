export const SERVICE_OPTIONS = [
  { id: "monthly_bookkeeping", label: "Monthly bookkeeping" },
  { id: "catch_up_bookkeeping", label: "Catch-up bookkeeping" },
  { id: "business_tax_preparation", label: "Business tax preparation" },
  { id: "individual_tax_preparation", label: "Individual tax preparation" },
  { id: "tax_planning_advisory", label: "Tax planning or advisory" },
  { id: "payroll_support", label: "Payroll support" },
  { id: "sales_tax_state_filing", label: "Sales tax or state filing support" },
  { id: "irs_state_notice_response", label: "IRS or state notice response" },
  { id: "other", label: "Other" },
] as const;

export type ServiceId = (typeof SERVICE_OPTIONS)[number]["id"];

export const SERVICE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_OPTIONS.map((service) => [service.id, service.label]),
);

export function formatSelectedServices(ids: string[] | null | undefined) {
  if (!ids?.length) return [];
  return ids.map((id) => SERVICE_LABELS[id] ?? id);
}
