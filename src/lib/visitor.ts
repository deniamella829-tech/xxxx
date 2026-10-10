// Stable visitor identity for anonymous viewers (localStorage + cookie)
const KEY = 'xpz_visitor_id';

function uuid(): string {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let id = '';
  try { id = localStorage.getItem(KEY) ?? ''; } catch { /* noop */ }
  if (!id) {
    const m = document.cookie.match(/(?:^|;\s*)xpz_vid=([^;]+)/);
    if (m) id = decodeURIComponent(m[1]);
  }
  if (!id) id = uuid();
  try { localStorage.setItem(KEY, id); } catch { /* noop */ }
  document.cookie = `xpz_vid=${encodeURIComponent(id)}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  return id;
}
