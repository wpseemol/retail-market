#!/usr/bin/env node
/**
 * Local SMS inbox for development.
 * Speaks a BulkSMSBD-shaped GET /api/smsapi so the API can point SMS_API_URL here.
 * Inbox UI: GET /  · JSON: GET /messages  · clear: DELETE /messages
 */
import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT) || 8026;
const MAX = 200;
/** @type {{ id: number; at: string; number: string; senderid: string; message: string }[]} */
const messages = [];
let nextId = 1;

function json(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(raw);
}

function html(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function inboxPage() {
  const rows = messages
    .map(
      (m) => `<tr>
      <td>${m.id}</td>
      <td><time datetime="${m.at}">${m.at}</time></td>
      <td><code>${escapeHtml(m.number)}</code></td>
      <td>${escapeHtml(m.senderid || "—")}</td>
      <td><pre>${escapeHtml(m.message)}</pre></td>
    </tr>`,
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dev SMS catcher</title>
  <style>
    :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
    body { margin: 1.5rem; line-height: 1.4; }
    h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    p { color: #666; margin: 0 0 1rem; }
    table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
    th, td { border-bottom: 1px solid #ccc3; text-align: left; padding: 0.5rem 0.4rem; vertical-align: top; }
    th { font-weight: 600; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, monospace; }
    code { font-family: ui-monospace, monospace; }
    .bar { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    button, a.btn {
      appearance: none; border: 1px solid #8888; background: #8881; padding: 0.35rem 0.7rem;
      border-radius: 6px; cursor: pointer; text-decoration: none; color: inherit; font: inherit;
    }
  </style>
</head>
<body>
  <h1>Dev SMS catcher</h1>
  <p>BulkSMSBD-shaped <code>GET /api/smsapi</code> · ${messages.length} message(s) (newest first) · auto-refresh 5s</p>
  <div class="bar">
    <a class="btn" href="/">Refresh</a>
    <button type="button" onclick="fetch('/messages',{method:'DELETE'}).then(()=>location.reload())">Clear</button>
    <a class="btn" href="/messages">JSON</a>
  </div>
  <table>
    <thead><tr><th>#</th><th>When</th><th>Number</th><th>Sender</th><th>Message</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5">No SMS yet. Point <code>SMS_API_URL</code> here and send a phone OTP.</td></tr>`}</tbody>
  </table>
  <script>setTimeout(() => location.reload(), 5000);</script>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function acceptSms(query) {
  const number = String(query.get("number") ?? "").trim();
  const message = String(query.get("message") ?? "").trim();
  const senderid = String(query.get("senderid") ?? "").trim();
  if (!number || !message) {
    return { ok: false, body: { response_code: 1002, error_message: "number and message required" } };
  }
  messages.unshift({
    id: nextId++,
    at: new Date().toISOString(),
    number,
    senderid,
    message,
  });
  if (messages.length > MAX) messages.length = MAX;
  console.info(`[sms-catcher] to=${number} sender=${senderid || "-"}\n${message}`);
  // BulkSMSBD success shape expected by backend-api smsGateway.
  return { ok: true, body: { response_code: 202, success_message: "SMS submitted successfully", info_message: "" } };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "GET" && (path === "/" || path === "/index.html")) {
    return html(res, 200, inboxPage());
  }
  if (req.method === "GET" && path === "/messages") {
    return json(res, 200, { messages });
  }
  if (req.method === "DELETE" && path === "/messages") {
    messages.length = 0;
    return json(res, 200, { cleared: true });
  }
  if (req.method === "GET" && (path === "/api/smsapi" || path === "/smsapi")) {
    const result = acceptSms(url.searchParams);
    return json(res, 200, result.body);
  }
  if (req.method === "GET" && path === "/health") {
    return json(res, 200, { ok: true, count: messages.length });
  }
  json(res, 404, { message: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.info(`SMS catcher listening on http://0.0.0.0:${PORT}`);
});
