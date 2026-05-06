// Title-case helpers for display + on-save normalization.

// People + clients: aggressive — assume input may be all-lowercase, fix everything.
// Handles: spaces, hyphens, apostrophes, "Mc" prefix.
export function toPersonName(input: string | null | undefined): string {
  if (!input) return input ?? "";
  let out = input
    .toLowerCase()
    .replace(/(^|\s|-|')(\w)/g, (_, sep, ch) => sep + ch.toUpperCase());
  // "mcdonough" → "McDonough"
  out = out.replace(/\bMc(\w)/g, (_, ch) => "Mc" + ch.toUpperCase());
  return out;
}

// Companies: conservative — only title-case words that are entirely lowercase.
// Words containing any uppercase (HBO, NBC, McDonough, iHeartMedia) are preserved.
// Plus a small whitelist of industry acronyms that should be ALL-CAPS.
const COMPANY_ACRONYMS = new Set([
  "tv", "mgm", "hbo", "nbc", "cbs", "abc", "fox", "amc", "ifc", "bbc",
  "mtv", "espn", "fbi", "usa", "uk", "ny", "la", "dc", "fx", "fxx",
  "vh1", "tnt", "tbs", "tlc", "cnn", "nfl", "nba", "mlb", "nhl",
  "ufc", "wwe", "ai", "ip",
]);

export function toCompanyName(input: string | null | undefined): string {
  if (!input) return input ?? "";
  return input.replace(/\b([a-z]+)\b/g, (word) => {
    if (COMPANY_ACRONYMS.has(word)) return word.toUpperCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
}
