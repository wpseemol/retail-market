/** Theme preference — localStorage + cookie so SSR can paint dark without a flash. */

export const THEME_STORAGE_KEY = "niyenin-theme";
export const THEME_COOKIE_KEY = "niyenin-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export type Theme = "light" | "dark";

export function parseTheme(value: string | null | undefined): Theme {
  return value === "dark" ? "dark" : "light";
}

/**
 * Blocking inline script for `<head>` — runs before first paint.
 * Reads localStorage/cookie, applies `.dark`, and keeps cookie in sync.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var c=${JSON.stringify(THEME_COOKIE_KEY)};var t=null;try{t=localStorage.getItem(k)}catch(e){}if(t!=="dark"&&t!=="light"){var m=document.cookie.match(new RegExp("(?:^|; )"+c+"=([^;]*)"));t=m?decodeURIComponent(m[1]):"light"}var d=document.documentElement;if(t==="dark"){d.classList.add("dark");d.style.colorScheme="dark"}else{d.classList.remove("dark");d.style.colorScheme="light"}try{localStorage.setItem(k,t)}catch(e){}document.cookie=c+"="+t+"; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax"}catch(e){}})();`;

export function themeCookieHeader(theme: Theme): string {
  return `${THEME_COOKIE_KEY}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}
