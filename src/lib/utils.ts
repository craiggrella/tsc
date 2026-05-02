import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Detect a trailing extension ("x123", "ext 123", "extension 123"). Returns
// { main, ext } where ext is digits-only (or "" if no extension). The optional
// `partial` flag matches an "x" with no digits yet (for live typing).
function splitExtension(
  value: string,
  partial = false
): { main: string; ext: string; hasExtMarker: boolean } {
  const re = partial
    ? /^(.*?)\s*(?:x|ext\.?|extension)\s*(\d*)\s*$/i
    : /^(.*?)\s*(?:x|ext\.?|extension)\s*(\d+)\s*$/i;
  const m = value.match(re);
  if (m) return { main: m[1], ext: m[2], hasExtMarker: true };
  return { main: value, ext: "", hasExtMarker: false };
}

/** Format a phone string as xxx-xxx-xxxx, preserving any trailing extension. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const { main, ext, hasExtMarker } = splitExtension(phone);
  const digits = main.replace(/\D/g, "");
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (d.length === 10) {
    const formatted = `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    return hasExtMarker && ext ? `${formatted} x${ext}` : formatted;
  }
  return phone; // return as-is if not 10 digits
}

/**
 * Live-format a US phone number as the user types. Returns a partial
 * `XXX-XXX-XXXX` string (e.g., "412-44" while still typing) and preserves
 * extensions ("412-444-8675 x123"). Empty input returns "". For INTL
 * numbers the caller should pass the value through unchanged instead.
 */
export function formatUSPhoneInput(value: string): string {
  const { main, ext, hasExtMarker } = splitExtension(value, true);
  const digits = main.replace(/\D/g, "").slice(0, 11);
  const d = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  let out: string;
  if (d.length === 0) out = "";
  else if (d.length <= 3) out = d;
  else if (d.length <= 6) out = `${d.slice(0, 3)}-${d.slice(3)}`;
  else out = `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6, 10)}`;
  if (hasExtMarker) {
    return out ? `${out} x${ext}` : `x${ext}`;
  }
  return out;
}
