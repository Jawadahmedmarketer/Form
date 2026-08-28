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

function cleanKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

const SERVICE_LOOKUP: Record<string, string> = {};
for (const service of SERVICE_OPTIONS) {
  SERVICE_LOOKUP[service.id] = service.id;
  SERVICE_LOOKUP[cleanKey(service.id)] = service.id;
  SERVICE_LOOKUP[cleanKey(service.label)] = service.id;
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
    const rawVal = item.trim().replace(/^["']|["']$/g, "");
    if (!rawVal) continue;
    const resolvedId = SERVICE_LOOKUP[rawVal] || SERVICE_LOOKUP[cleanKey(rawVal)];
    if (!resolvedId || seen.has(resolvedId)) continue;
    seen.add(resolvedId);
    normalized.push(resolvedId);
  }
  return normalized;
}
