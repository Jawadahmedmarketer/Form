import { headers } from "next/headers";

export async function getClientIp() {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return (
    headerList.get("x-real-ip") ||
    headerList.get("cf-connecting-ip") ||
    null
  );
}

export async function getUserAgent() {
  const headerList = await headers();
  return headerList.get("user-agent");
}

export function maskIp(ip: string | null) {
  if (!ip) return "Not recorded";
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 2).join(":")}:xxxx:xxxx`;
  }
  return "Recorded";
}
