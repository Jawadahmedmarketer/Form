export function formatLongDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTaxPeriod(value?: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const fullDateMatch = trimmed.match(/\b(19\d\d|20\d\d)\b/);
  if (fullDateMatch) {
    const allYears = trimmed.match(/\b(19\d\d|20\d\d)\b/g);
    if (allYears && allYears.length > 1) {
      return `${allYears[0]} – ${allYears[allYears.length - 1]}`;
    }
    return fullDateMatch[1];
  }
  return trimmed;
}

