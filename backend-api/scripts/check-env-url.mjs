import fs from "node:fs";

const text = fs.readFileSync(new URL("../.env.prod", import.meta.url), "utf8");
const match = text.match(/DATABASE_URL="([^"]+)"/);
if (!match) {
  console.log("missing");
  process.exit(1);
}
const url = new URL(match[1]);
const password = decodeURIComponent(url.password);
console.log(
  JSON.stringify({
    user: url.username,
    host: url.hostname,
    port: url.port,
    db: url.pathname,
    passwordLength: password.length,
    passwordHasAmp: password.includes("&"),
  }),
);
