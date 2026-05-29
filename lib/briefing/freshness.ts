/**
 * Hours elapsed since `publishedAt`, clamped at 0.
 * Returns null when the timestamp is missing or unparseable,
 * so callers can decide how to treat "unknown age".
 */
export function ageInHours(
  publishedAt: string | undefined,
  now: Date,
): number | null {
  if (!publishedAt) {
    return null;
  }

  const published = Date.parse(publishedAt);
  if (Number.isNaN(published)) {
    return null;
  }

  return Math.max(0, (now.getTime() - published) / (1000 * 60 * 60));
}
