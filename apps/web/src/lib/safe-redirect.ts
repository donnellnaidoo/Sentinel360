/**
 * Returns `path` if it is a same-site path, otherwise `fallback`. Rejects
 * absolute URLs and protocol-relative forms ("//host", "/\host") so
 * user-supplied redirect params can't send people off-site.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    return fallback;
  }
  return path;
}
