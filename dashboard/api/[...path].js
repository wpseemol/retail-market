export const config = { api: { bodyParser: false } };

const API_ORIGIN = "https://niyenin-api.wpseemol.site";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * Same-origin proxy. The public key and secret stay in Vercel env,
 * not in the dashboard JavaScript.
 */
export default async function handler(req, res) {
  const publicKey = process.env.API_PUBLIC_KEY?.trim() ?? "";
  const secretKey = process.env.API_SECRET_KEY?.trim() ?? "";
  if (!publicKey || !secretKey) {
    res.status(500).json({
      message: "Set API_PUBLIC_KEY and API_SECRET_KEY on the dashboard host.",
      code: "API_KEY_REQUIRED",
    });
    return;
  }

  const targetBase = (process.env.API_PROXY_TARGET || API_ORIGIN).replace(/\/$/, "");
  const incoming = req.url || "/api";
  const upstreamUrl = `${targetBase}${incoming.startsWith("/") ? incoming : `/${incoming}`}`;
  const method = req.method || "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(req);

  const headers = {
    "X-Public-Key": publicKey,
    "X-Api-Secret": secretKey,
    Accept: req.headers.accept || "application/json",
  };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  if (req.headers["content-type"]) headers["Content-Type"] = req.headers["content-type"];

  const upstream = await fetch(upstreamUrl, { method, headers, body });
  const payload = Buffer.from(await upstream.arrayBuffer());
  const out = {};
  const type = upstream.headers.get("content-type");
  if (type) out["Content-Type"] = type;
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) out["Content-Disposition"] = disposition;
  const total = upstream.headers.get("x-total-rows");
  if (total) out["X-Total-Rows"] = total;
  res.status(upstream.status).set(out).send(payload);
}
