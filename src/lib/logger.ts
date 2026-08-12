type LogFields = Record<string, unknown>;

function safeFields(fields?: LogFields) {
  if (!fields) return {};
  const blocked = new Set([
    "signature",
    "clientSignature",
    "representativeSignature",
    "token",
    "apiToken",
    "authorization",
    "serviceRoleKey",
    "email",
    "phone",
    "ip",
    "userAgent",
  ]);
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (blocked.has(key)) continue;
    out[key] = value;
  }
  return out;
}

export function logInfo(event: string, fields?: LogFields) {
  console.log(JSON.stringify({ level: "info", event, ts: new Date().toISOString(), ...safeFields(fields) }));
}

export function logError(event: string, fields?: LogFields) {
  console.error(JSON.stringify({ level: "error", event, ts: new Date().toISOString(), ...safeFields(fields) }));
}

export function logWarn(event: string, fields?: LogFields) {
  console.warn(JSON.stringify({ level: "warn", event, ts: new Date().toISOString(), ...safeFields(fields) }));
}
