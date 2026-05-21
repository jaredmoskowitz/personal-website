/** Hostnames that count as "this machine" for admin / approval flows. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/** Strip port and IPv6 brackets from a Host header or location.hostname. */
export function normalizeHostname(hostOrHostname: string): string {
  const withoutPort = hostOrHostname.split(':')[0] ?? hostOrHostname;
  return withoutPort.toLowerCase().replace(/^\[|\]$/g, '');
}

export function isLocalHostname(hostname: string): boolean {
  const h = normalizeHostname(hostname);
  if (LOCAL_HOSTS.has(h)) return true;
  if (h.endsWith('.local')) return true;
  return false;
}

export function hostFromRequest(req: { headers: Headers }): string {
  const host = req.headers.get('host') ?? '';
  return normalizeHostname(host);
}

/** True when the request targets this machine (dev server on loopback, etc.). */
export function isLocalRequest(req: { headers: Headers }): boolean {
  return isLocalHostname(hostFromRequest(req));
}

/** Local dev server — admin UI and unauthenticated mutations are allowed. */
export function isLocalDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

/** Admin approve/reject without READING_SECRET (local UI or dev server). */
export function isLocalAdminContext(req: { headers: Headers }): boolean {
  return isLocalDev() || isLocalRequest(req);
}
