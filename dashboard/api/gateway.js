const API_ORIGIN = "https://niyenin-api.wpseemol.site";

function header(req, name) {
  const value = req.headers?.[name];
  return Array.isArray(value) ? value[0] : value || "";
}

function targetPath(req) {
  const queryPath = req.query?.path;
  if (Array.isArray(queryPath) && queryPath.length > 0) {
    return `/api/${queryPath.map((part) => String(part)).join("/")}`;
  }
  if (typeof queryPath === "string" && queryPath) {
    return `/api/${queryPath}`;
  }

  const forwarded = header(req, "x-forwarded-uri") || header(req, "x-invoke-path");
  if (forwarded.startsWith("/api/") || forwarded === "/api") {
    return forwarded.split("?")[0];
  }

  const raw = req.url || "/api";
  if (raw.startsWith("/api/") || raw === "/api") return raw.split("?")[0];
  return "/api";
}

function search(req) {
  const raw = req.url || "";
  const q = raw.includes("?") ? raw.slice(raw.indexOf("?") + 1) : "";
  const params = new URLSearchParams(q);
  params.delete("path");
  const text = params.toString();
  return text ? `?${text}` : "";
}

function readBody(req) {
  if (typeof req[Symbol.asyncIterator] !== "function") {
    if (req.body == null || req.body === "") return Promise.resolve(undefined);
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    if (typeof req.body === "string") return Promise.resolve(Buffer.from(req.body));
    return Promise.resolve(Buffer.from(JSON.stringify(req.body)));
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on("error", reject);
  });
}

function send(res, status, body, headers) {
  res.statusCode = status;
  for (const [name, value] of Object.entries(headers)) {
    if (value) res.setHeader(name, value);
  }
  res.end(body);
}

/**
 * Every dashboard /api call is rewritten here.
 * The public key and secret stay in Vercel env, not in the browser bundle.
 */
export default async function handler(req, res) {
  const publicKey = process.env.API_PUBLIC_KEY?.trim() ?? "";
  const secretKey = process.env.API_SECRET_KEY?.trim() ?? "";
  if (!publicKey || !secretKey) {
    send(res, 500, JSON.stringify({
      message: "Set API_PUBLIC_KEY and API_SECRET_KEY on the dashboard host.",
      code: "API_KEY_REQUIRED",
    }), { "Content-Type": "application/json" });
    return;
  }

  const targetBase = (process.env.API_PROXY_TARGET || API_ORIGIN).replace(/\/$/, "");
  const method = req.method || "GET";
  const upstreamUrl = `${targetBase}${targetPath(req)}${search(req)}`;
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);
  const headers = {
    "X-Public-Key": publicKey,
    "X-Api-Secret": secretKey,
    Accept: header(req, "accept") || "application/json",
  };
  const authorization = header(req, "authorization");
  const contentType = header(req, "content-type");
  if (authorization) headers.Authorization = authorization;
  if (contentType) headers["Content-Type"] = contentType;

  const upstream = await fetch(upstreamUrl, { method, headers, body });
  const payload = Buffer.from(await upstream.arrayBuffer());
  const out = {};
  const type = upstream.headers.get("content-type");
  if (type) out["Content-Type"] = type;
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) out["Content-Disposition"] = disposition;
  const total = upstream.headers.get("x-total-rows");
  if (total) out["X-Total-Rows"] = total;
  send(res, upstream.status, payload, out);
}
