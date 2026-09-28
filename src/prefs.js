// Per-device preferences (text size, theme, alerts). localStorage can be unavailable; never throw.
export function getPref(key) {
  try { return localStorage.getItem(`wlc-${key}`); } catch { return null; }
}
export function setPref(key, value) {
  try { localStorage.setItem(`wlc-${key}`, String(value)); } catch { /* private mode */ }
}
