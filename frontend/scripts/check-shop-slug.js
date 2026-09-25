const fs = require("fs");
const http = require("http");

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      })
      .on("error", reject);
  });
}

(async () => {
  const detail = await get(
    "http://localhost:3000/shop/apple-iphone-14-pro-max-256",
  );
  console.log("detail status", detail.status);
  console.log("title", (detail.body.match(/<title>([^<]+)/) || [])[1]);
  console.log("has 404 crumb", detail.body.includes(">404<"));
  console.log("has product name", detail.body.includes("Apple iPhone 14 Pro Max"));

  const shop = await get("http://localhost:3000/shop");
  console.log("shop status", shop.status);
  const hrefs = [
    ...shop.body.matchAll(/href="(\/shop\/[^"]+)"/g),
  ].map((m) => m[1]);
  console.log("sample hrefs", [...new Set(hrefs)].slice(0, 15));
})();
