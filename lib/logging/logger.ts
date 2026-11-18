/**
 * PII-safe structured JSON logger.
 * NEVER logs raw citizen chat messages or personal profile data;
 * actively redacts Aadhaar-like 12-digit IDs, Indian mobile numbers, PANs, and emails.
 */
export function redactPII(input: string): string {
  return input
    // Email addresses
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]')
    // 12-digit Aadhaar numbers (with optional spaces or hyphens)
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED_AADHAAR]')
    // Indian mobile numbers (+91 or 10 digits starting with 6-9)
    .replace(/(?:\+91[\s-]?)?\b[6-9]\d{9}\b/g, '[REDACTED_PHONE]')
    // PAN card pattern (ABCDE1234F)
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/g, '[REDACTED_PAN]');
}

type LogLevel = 'info' | 'warn' | 'error';

export function logStructured(
  level: LogLevel,
  event: string,
  meta: Record<string, string | number | boolean | undefined> = {}
): void {
  const safeMeta: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined) continue;
    // Blocklist any accidentally passed PII/message fields
    if (/^(message|query|prompt|profile|aadhaar|phone|email|name)$/i.test(k)) {
      continue;
    }
    safeMeta[k] = typeof v === 'string' ? redactPII(v) : v;
  }

  const record = {
    ts: new Date().toISOString(),
    level,
    service: 'yojanamitra',
    event,
    ...safeMeta,
  };

  if (level === 'error') {
    console.error(JSON.stringify(record));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(record));
  } else if (process.env.NODE_ENV !== 'test') {
    console.log(JSON.stringify(record));
  }
}
