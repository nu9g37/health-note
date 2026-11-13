const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Returns `next` only when it is a safe relative internal path, preventing open redirects. */
export function getSafeRedirectPath(next: string | null): string | null {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return null;
  }

  try {
    const parsed = new URL(next, "http://localhost");
    if (parsed.origin !== "http://localhost") return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

/** Parses and validates a loopback `Host` header (for local development), returning its HTTP(S) origin. */
export function parseLoopbackOrigin(
  hostHeader: string | null,
  protocolHint?: string | null,
): string | null {
  const host = hostHeader?.trim();
  if (!host || /[\s,@/\\?#]/.test(host)) return null;

  const firstProto = protocolHint?.split(",")[0]?.trim().toLowerCase();
  const proto =
    firstProto === "https" || firstProto === "https:" ? "https" : "http";

  try {
    const parsed = new URL(`${proto}://${host}`);
    if (parsed.username || parsed.password) return null;
    if (!LOOPBACK_HOSTNAMES.has(parsed.hostname)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}
