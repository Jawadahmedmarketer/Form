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

/** Accept array, comma-separated string, or JSON-encoded array from GHL/n8n/jsonb. */
export function normalizeSelectedServices(raw: unknown): string[] {
  if (raw == null || raw === "") return [];

  let items: string[] = [];
  if (Array.isArray(raw)) {
    items = raw.flatMap((item) =>
      typeof item === "string" && (item.includes(",") || item.trim().startsWith("["))
        ? normalizeSelectedServices(item)
        : [String(item ?? "")],
    );
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        return normalizeSelectedServices(JSON.parse(trimmed));
      } catch {
        // Fall through to comma-separated parsing.
      }
    }
    items = trimmed.split(/[,;\n]+/);
  } else {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const item of items) {
    const id = item.trim().replace(/^["']|["']$/g, "");
    if (!id || !(id in SERVICE_LABELS) || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}
