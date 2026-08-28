export interface BusinessItem {
  name: string;
  nature: string;
  software: string;
  accountingBasis: string;
}

export const ACCOUNTING_BASIS_OPTIONS = [
  "Select...",
  "Cash",
  "Accrual",
  "Tax Basis",
  "Modified Cash",
  "Other",
] as const;

export function emptyBusinessItem(): BusinessItem {
  return {
    name: "",
    nature: "",
    software: "",
    accountingBasis: "",
  };
}

export function formatBusinesses(items: BusinessItem[]): string {
  const valid = items.filter((item) => item.name.trim() || item.nature.trim() || item.software.trim() || item.accountingBasis.trim());
  if (valid.length === 0) return "";

  return valid
    .map((item, index) => {
      const parts: string[] = [];
      if (item.nature.trim()) parts.push(`Nature: ${item.nature.trim()}`);
      if (item.software.trim()) parts.push(`Software: ${item.software.trim()}`);
      if (item.accountingBasis.trim() && item.accountingBasis !== "Select...") {
        parts.push(`Basis: ${item.accountingBasis.trim()}`);
      }

      const label = item.name.trim() || `Business ${index + 1}`;
      return parts.length > 0 ? `${label} (${parts.join(" | ")})` : label;
    })
    .join("\n");
}

export function parseBusinesses(raw?: string | null): BusinessItem[] {
  if (!raw || !raw.trim()) {
    return [emptyBusinessItem()];
  }

  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return [emptyBusinessItem()];
  }

  const parsed: BusinessItem[] = [];

  for (const line of lines) {
    // Try matching: Name (Nature: X | Software: Y | Basis: Z)
    const match = line.match(/^([^(]+)(?:\((.*)\))?$/);
    if (!match) {
      parsed.push({
        name: line,
        nature: "",
        software: "",
        accountingBasis: "",
      });
      continue;
    }

    const name = match[1].trim();
    const details = match[2] || "";
    let nature = "";
    let software = "";
    let accountingBasis = "";

    if (details) {
      const segments = details.split("|").map((s) => s.trim());
      for (const seg of segments) {
        if (/^nature:\s*/i.test(seg)) {
          nature = seg.replace(/^nature:\s*/i, "").trim();
        } else if (/^software:\s*/i.test(seg)) {
          software = seg.replace(/^software:\s*/i, "").trim();
        } else if (/^basis:\s*/i.test(seg)) {
          accountingBasis = seg.replace(/^basis:\s*/i, "").trim();
        }
      }
    }

    parsed.push({
      name,
      nature,
      software,
      accountingBasis,
    });
  }

  return parsed.length > 0 ? parsed : [emptyBusinessItem()];
}
