/**
 * Where to send the user after they sign in: the page they tried to open
 * before being sent to the login page (e.g. the RFQ Acknowledgement link in a
 * vendor's email). Kept in sessionStorage; only same-app paths are accepted.
 */
const KEY = 'pm.returnUrl';

export function rememberReturnUrl(url: string): void {
  if (!isSafe(url)) return;
  try { sessionStorage.setItem(KEY, url); } catch { /* not remembered */ }
}

/** The remembered URL (once — it is cleared when read). */
export function takeReturnUrl(): string | null {
  try {
    const url = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return url && isSafe(url) ? url : null;
  } catch {
    return null;
  }
}

function isSafe(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/auth/');
}
