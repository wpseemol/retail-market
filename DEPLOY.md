# Manual deploy (Spaceship + Vercel)

This is the current low-cost setup. There is no CI pipeline yet. When the API moves to a VPS later, `docker-compose.prod.yml` is the server layout to automate. Until then, deploy by hand with the steps below.

| App | Host now | Later |
| --- | --- | --- |
| `backend-api` | [Spaceship Web Hosting Supreme](https://www.spaceship.com/web-hosting/) (shared, cPanel, Node.js via Passenger) | AWS or another VPS |
| `frontend` | Vercel | same VPS, or stay on Vercel |
| `dashboard` | Vercel | same VPS, or stay on Vercel |

Spaceship Supreme is shared hosting. It can run this API: cPanel **Setup Node.js App** uses CloudLinux and Passenger, Node.js up to 24, and MariaDB. It cannot run `docker-compose.prod.yml`. Do not upload a `node_modules` folder built on Windows. `sharp` and Prisma must install on the server.

Use **Node.js 22** in the cPanel app.

## 1. API on Spaceship

### Database

1. cPanel → **MySQL Databases**.
2. Create a database and a user, and add the user to the database with all privileges.
3. cPanel prefixes both names (`cpaneluser_retail`). The host from PHP/Node on the same account is `localhost`.

`DATABASE_URL` (encode any `@`, `:`, `/`, `#` in the password):

```text
mysql://cpaneluser_api:PASSWORD@localhost:3306/cpaneluser_retail
```

### Node.js app

1. cPanel → **Setup Node.js App** → Create.
2. Node.js version **22**, application mode **Production**.
3. Application root: a folder under your home directory, for example `niyenin-api`. Do not put the app inside `public_html` if you can avoid it. Point the application URL at a subdomain such as `api.yourdomain.com`.
4. Application startup file: `dist/server.js`.
5. Save. Application startup file stays `dist/server.js`.

### Run it

Upload `backend-api/` into the application root (`package.json` in that folder, no `node_modules`, no `.env`). Then, from that folder:

```bash
npm install
npm run build
npm run start
```

On cPanel those are two buttons, then a restart:

1. **Run NPM Install**
2. In the script list, run **build** (`prisma generate` then `tsc`)
3. **Restart**. Passenger runs `dist/server.js`, which is the same program as `npm run start`.

`npm run start` is for a normal terminal. The live site stays up through Passenger, not through the script button.

Under Passenger the process listens on Passenger's socket, not on port 8001. `PORT` in the environment is unused while Passenger is in front.

### Environment variables

Set these in the Node.js app UI (not only in a file). Passenger reads the UI values. Restart the app after every change.

Generate secrets locally:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | the MariaDB URL above |
| `JWT_SECRET` | 32+ bytes, random |
| `SETTINGS_ENCRYPTION_KEY` | a different 32+ byte random value |
| `CORS_ORIGINS` | `https://your-store.vercel.app,https://your-dashboard.vercel.app` (no spaces, no trailing slash). Add the real domains when you attach them. |
| `PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `FRONTEND_URL` | the storefront origin, `https://your-store.vercel.app` |
| `PROXY_IP_SECRET` | same hex string you put on the Vercel storefront. Server-only. |
| `REVALIDATE_SECRET` | same value as the storefront, if you want instant cache refresh |
| `APP_NAME` | `Niyenin` |
| `STORAGE_DRIVER` | `local` on this host, or `s3` if you already have object storage |
| `SMS_MAX_PER_HOUR` | `40` (whole API, protects the SMS wallet) |
| `EMAIL_MAX_PER_HOUR` | `200` |
| `WHATSAPP_MAX_PER_HOUR` | `40` |

Leave `SMS_PROVIDER=console` until the gateway is saved in the dashboard. Production will not send SMS or email until Dashboard → Settings has an active provider. Codes are not printed in production.

If `STORAGE_DRIVER=local`, the `uploads/` directory must be writable by the app user. Image URLs are `{PUBLIC_API_URL}/uploads/...`. Prefer S3 or R2 when you have it: shared hosting has a file-count cap, and local files are not in a separate backup unless you copy them.

Click **Restart** in the Node.js app page.

Check:

```bash
curl -sS https://api.yourdomain.com/api/health
```

### Update later (still manual)

```bash
npm install
npm run build
```

Restart the app. `npm run start` is `node dist/server.js`. Run `npm install` again whenever dependencies change, so the Linux `sharp` binary stays correct.

## 2. Storefront on Vercel

One Vercel project, repository root, **Root Directory** `frontend`. Framework: Next.js. Vercel sets `VERCEL=1`, and the Next config then skips the Docker `standalone` output.

Environment (Production):

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_APP_URL` | the Vercel storefront URL, then your real domain |
| `NEXT_PUBLIC_DASHBOARD_URL` | the dashboard Vercel URL |
| `NEXT_PUBLIC_MEDIA_URL` | only if images are on S3/R2; otherwise omit it and images load from the API `/uploads` path |
| `AUTH_SECRET` | 32+ random bytes. Server-only. |
| `REVALIDATE_SECRET` | same as the API |
| `PROXY_IP_SECRET` | same as the API. Server-only. Do not use a `NEXT_PUBLIC_` name. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | same client id as the API, when Google sign-in is on |

`INTERNAL_API_URL` can stay empty. On Vercel the server calls `NEXT_PUBLIC_API_URL`.

Deploy from the Vercel dashboard (Import, then Redeploy). That is the manual step. Do not add GitHub Actions yet.

The storefront login calls the API from Vercel. `PROXY_IP_SECRET` tells the API which shopper it was, so login limits apply per person. Without it, every storefront login shares Vercel's outbound address. The per-account limit still applies.

## 3. Dashboard on Vercel

Second Vercel project, same repository, **Root Directory** `dashboard`. Framework: Vite. Output directory: `dist`. `dashboard/vercel.json` sends client routes to `index.html` and sets security headers.

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://api.yourdomain.com` |
| `VITE_APP_URL` | the dashboard URL |
| `VITE_STOREFRONT_URL` | the storefront URL |

The dashboard is a static site. The browser calls the API directly, so `CORS_ORIGINS` on the API must include this origin. Redeploy after changing any `VITE_` variable (Vite bakes them in at build time).

Staff sign in here. The storefront login page is for shoppers.

## 4. After the first boot

1. Open the dashboard, sign in as super admin, and set the email provider and SMS gateway. Send one test. Tests are limited to one every 30 seconds and 8 per hour per staff user, and they count toward the process-wide hourly caps.
2. Confirm a shopper can register on the storefront and that a verification code arrives.
3. In SSLCommerz (when you take payments), set the callback / IPN URL to `https://api.yourdomain.com`. `PUBLIC_API_URL` must be that public https origin.
4. Attach your real domains in Vercel and add those origins to `CORS_ORIGINS`, then restart the Node app.

## Rate limits (shared hosting)

Passenger runs one Node process, so the limits live in memory. They reset when you restart the app. That matches a single shared-host app. A future multi-server VPS should move them to a shared store.

| Action | Limit |
| --- | --- |
| Login | 40 / 15 min per network, and 8 / 15 min per account |
| Register | 10 / hour per network, and 3 / hour per email |
| Refresh | 60 / 15 min per network |
| Social login | 20 / 15 min per network |
| Email code | 5 / hour per account or address, 60 s between sends |
| SMS or WhatsApp code | 3 / hour per account or number, plus 8 phone sends / hour per network |
| All email / SMS / WhatsApp from this process | `EMAIL_MAX_PER_HOUR` 200, `SMS_MAX_PER_HOUR` 40, `WHATSAPP_MAX_PER_HOUR` 40 |

`trust proxy` is `1` because Passenger is the only proxy in front of Node. The app does not trust a client-supplied `X-Forwarded-For`. Keep the Node app reachable only through that Passenger app (do not publish the app port).

## What this setup does not include

- GitHub Actions or any other CI. Redeploy Vercel from its dashboard, and rebuild the API over SSH as above.
- Docker on Spaceship. Keep using Docker only on your own machine, or later on a VPS.
- A second API instance. One restart clears in-memory rate-limit counters.
