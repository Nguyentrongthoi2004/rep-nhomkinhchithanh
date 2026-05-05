/** Express `req.query`: một key có thể là string hoặc mảng string. */
export function firstQueryString(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first === undefined || first === null) return undefined;
    return String(first);
  }
  return String(raw);
}
