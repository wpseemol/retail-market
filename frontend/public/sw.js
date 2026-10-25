/* Caches successful same-origin reads so a page you already opened can load again while offline. */
const CACHE = "niyenin-pages-v1";
let locale = "en";

self.addEventListener("message", (event) => {
    const next = event.data && event.data.type === "locale" ? event.data.locale : "";
    if (next === "bn" || next === "en") locale = next;
});

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
            )
            .then(() => self.clients.claim()),
    );
});

function cacheKey(request) {
    const url = new URL(request.url);
    const kind =
        request.headers.get("RSC") === "1" ? "rsc" : request.mode === "navigate" ? "doc" : "get";
    url.searchParams.set("__niyenin_cache", kind);
    return new Request(url.toString(), { method: "GET" });
}

function shouldHandle(request) {
    if (request.method !== "GET") return false;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    if (url.pathname === "/sw.js") return false;
    if (url.pathname.includes("webpack-hmr") || url.pathname.includes("hot-update")) return false;
    if (url.pathname.startsWith("/_next/webpack")) return false;
    if (request.headers.has("range")) return false;
    return true;
}

async function offlinePage(request) {
    const cookie = request.headers.get("cookie") || "";
    const bn = locale === "bn" || /NEXT_LOCALE=bn/.test(cookie);
    const title = bn ? "আপনি অফলাইনে" : "You're offline";
    const body = bn
        ? "এই পাতাটি এই ডিভাইসে সেভ নেই। আগে খোলা কোনো পাতায় যান, অথবা ইন্টারনেট এসে আবার চেষ্টা করুন।"
        : "This page isn't saved on this device yet. Open a page you visited earlier, or reconnect and try again.";
    const home = bn ? "হোম পাতায় যান" : "Go to the home page";
    const html = `<!doctype html><html lang="${bn ? "bn" : "en"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f6f6;color:#1a1a1a"><main style="max-width:28rem;padding:2rem;text-align:center"><h1 style="font-size:1.6rem;margin:0 0 .75rem">${title}</h1><p style="line-height:1.5">${body}</p><p><a href="/">${home}</a></p></main>`;
    return new Response(html, {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
}

async function fromNetwork(request) {
    const cache = await caches.open(CACHE);
    const key = cacheKey(request);
    if (self.navigator.onLine !== false) {
        try {
            const response = await fetch(request);
            if (response && response.ok && (response.type === "basic" || response.type === "default")) {
                try {
                    await cache.put(key, response.clone());
                } catch {
                    /* The disk quota can refuse a large response. The live response still returns. */
                }
            }
            return response;
        } catch {
            /* Fall through to a saved copy. */
        }
    }
    const cached = await cache.match(key);
    if (cached) return cached;
    if (request.mode === "navigate") return offlinePage(request);
    return new Response("", { status: 503, headers: { "Cache-Control": "no-store" } });
}

self.addEventListener("fetch", (event) => {
    if (!shouldHandle(event.request)) return;
    event.respondWith(fromNetwork(event.request));
});
