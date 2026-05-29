/**
 * Lowercases, maps "&" to "and", reduces any run of non-alphanumeric
 * characters to a single space, and trims. Shared base for comparison
 * keys and dedupe canonicalization.
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
