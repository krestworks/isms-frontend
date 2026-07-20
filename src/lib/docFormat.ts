/** Masks a phone number for display — keeps the first 4 and last 3 characters,
 *  replaces the middle with a fixed "***" (matches receipt/invoice convention). */
export function maskPhone(phone?: string | null): string {
  if (!phone) return phone ?? "";
  const s = phone.trim();
  if (s.length <= 7) return s;
  return `${s.slice(0, 4)}***${s.slice(-3)}`;
}

/** Truncates a display name to at most its first two words. */
export function twoNames(name?: string | null): string {
  if (!name) return name ?? "";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).join(" ");
}
