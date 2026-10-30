# frontend — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-30

### Product and store image wells in dark mode

- Shop cards, store directory logos, store/brand showcase product cards, PDP thumbs, quick view, and zoom: keep a white image well in light mode, and use `bg-bg-subtle` in dark mode so the card no longer flashes a bright white plate.

### Dev uses Webpack when Turbopack native SWC is blocked

- `package.json` `dev`: `next dev --webpack --port 3000`. On this Windows machine Application Control blocks `@next/swc-win32-x64-msvc`, so Turbopack exits and the storefront never listens on :3000.

### Product image wells aligned (shop, brand, store)

- Shop cards (`ShopProductCard.tsx`), brand/store showcase cards (`ShowcaseProductCard.tsx`), PDP / quick view / related thumbs: product photos use a white square well with `object-contain object-center` so studio shots (white backgrounds) no longer float in dark `bg-subtle` letterboxing.
- Removed double padding on shop grid image links; thumbs fill the well edge-to-edge.
- Stores directory logos (`StoresPageContent.tsx`): white well + centered contain.

### Header chrome cache + product rich text

- `StoreProvider` / `store.ts` / `siteChromeSlice.ts` / `siteChromeCache.ts`: seed header/footer/topbar chrome from the layout payload on first paint, and keep a `localStorage` copy (`niyenin.site-chrome.v1`) so reloads do not flash empty/fallback nav.
- `Header.tsx`: pulse skeletons for theme toggle, cart total, and nav while those pieces are not ready; theme storage key `niyenin-theme`.
- `CartHydrator.tsx`: restore the last cart from cache right away so the header total can leave the skeleton sooner.
- Product short blurb vs TipTap body: `shortDescription` (plain) + `description` (HTML) in `types.ts` / `products.ts`. PDP, cards, and quick view show the plain blurb; the description tab uses `SafeHtml` (`safeHtml.ts` + `SafeHtml.tsx`) with allow-list sanitize + `dangerouslySetInnerHTML`. Meta description strips HTML tags.

### Dropped legacy API host wpseemol.site

- `next.config.ts`: production API fallback and image host is `https://api.niyenin.com` only. Removed `https://niyenin-api.wpseemol.site`.
- Root `DEPLOY.md`: storefront / dashboard env examples use `api.niyenin.com` and the niyenin.com app domains.

### Production domains on niyenin.com

- `.env.prod`: `NEXT_PUBLIC_API_URL` → `https://api.niyenin.com`, `NEXT_PUBLIC_APP_URL` → `https://www.niyenin.com`, `NEXT_PUBLIC_DASHBOARD_URL` → `https://dashboard.niyenin.com`.

## 2026-10-25

### Account page kept a logged-in shopper

- `src/lib/sessionToken.ts`, `src/middleware.ts`: on HTTPS the login cookie is `__Secure-authjs.session-token`. The account and wishlist guard was looking for the name used on localhost, so a signed-in shopper was sent to `/login?next=/account`. The public and secret API keys are not involved in that redirect.
- `src/app/api/backend/[...path]/route.ts` reads that same cookie.
- `src/components/providers/AuthHydrator.tsx`: a session whose refresh already failed no longer leaves the name in the menu.

### API connection caption removed

- Login, sign-up, and the account page no longer show “API connected”, including while the storefront runs in dev mode.
- Removed `src/components/ApiHealthBadge.tsx` and `fetchHealth` from `src/lib/api.ts`. `src/components/auth/AuthShell.tsx` and `src/components/account/AccountProfile.tsx` no longer mount it.

### Product tabs sit under the menu

- `src/components/shop/ProductPageContent.tsx`: specification, description, FAQ, and review stay pinned while the page scrolls, directly under the site menu instead of a tall empty gap. Related products use the same offset.
- English and Bangla dictionaries: those tab labels.

### Shop filters on a phone, and pages you opened stay available offline

- `src/components/shop/ShopPageContent.tsx`, `ShopFilterSheet.tsx`, `ShopSidebar.tsx`, `ShopToolbar.tsx`, `ShopProductCard.tsx`, `types.ts`: on a phone the filters open in a full sheet with larger tap targets, the product grid starts at two columns, and the toolbar keeps sort plus a shorter set of layout buttons.
- `public/sw.js`, `src/components/providers/OfflineCache.tsx`, `src/app/offline/page.tsx`, `src/app/layout.tsx`, `next.config.ts`: a service worker stores successful page and read responses. A page you already opened loads again without a network. An address you never opened shows a short offline page in the current language.
- `src/components/shop/useShopCatalog.ts`, `ShopProductGrid.tsx`: a filter refresh that fails while offline keeps the products already on screen.
- English and Bangla dictionaries, `AGENTS.md`.

### Offline browsing stays friendly

- Redux keeps a connection flag plus the cart and wishlist. Offline cart edits stay on this device and sync when the browser is online again. A banner explains both states.
- `src/store/connectionSlice.ts`, `src/store/cartSlice.ts`, `src/store/cartCache.ts`, `src/store/wishlistCache.ts`, `src/components/providers/ConnectionBanner.tsx`, `CartHydrator.tsx`, `WishlistHydrator.tsx`, `src/hooks/useWishlist.ts`, `src/app/layout.tsx`, and the English and Bangla dictionaries.

### Storefront permission policy

- `next.config.ts`: the page allows `unload` and clipboard read/write on this site. Camera, microphone, and location stay blocked. This matches the dashboard and stops Chrome’s “unload is not allowed” console line.

### Storefront console 401 and 404

- `src/app/api/backend/[...path]/route.ts`: the signed-in cart and wishlist calls now read the https session cookie, so those requests are no longer sent without a token.
- `next.config.ts`: old menu addresses (`/blog`, `/category/laptops`, `/shop/product/1`, and the other footer links) redirect to pages that exist.
- Home header, footer, and product blocks no longer point at those missing addresses.
- Cart and wishlist loaders skip the account API when the session is already expired.

### Storefront proxy accepts an empty visit response

- `src/app/api/backend/[...path]/route.ts`: a 204 from `/api/analytics/visit` is returned with no body. Passing that empty body into `NextResponse` made the beacon a 500. A missing session token no longer fails the proxy.

### `.env.dev` and `.env.prod`

- `.env.dev`, `.env.prod`: local values and live values are separate. `.env` and `.env.local` no longer hold those values.
- `next.config.ts`: `next dev` loads `.env.dev`. `next build` and `next start` load `.env.prod`. A value already set on Vercel is kept.
- `.env.example`, `AGENTS.md`: the two file names. The example `AUTH_SECRET` line is its own line again.

### API keys stay on the server

- `src/lib/api.ts`, `src/lib/session.ts`, `src/auth.ts`, `src/app/actions/auth.ts`: server calls send `X-Public-Key` and `X-Api-Secret` from `API_PUBLIC_KEY` and `API_SECRET_KEY`.
- Catalog, content, sitemap, visit beacon, and social-login fetches go through the Next.js proxy when they run in the browser, so the secret is not in the page.
- `.env.example` and `AGENTS.md` document the two server-only names.

### Vercel install and live product images

- `pnpm-lock.yaml`: refreshed so it matches `package.json`. Vercel’s frozen `pnpm install` was failing because this copy still listed Next.js 16.3.5 and was missing newer dependencies.
- `next.config.ts`: product images may load from the live API `/uploads` host. On Vercel, that host is the API URL when `NEXT_PUBLIC_API_URL` is not set. File tracing no longer points at the parent folder, which is not part of a frontend-only upload.

### Cart images on a local production server

- `next.config.ts`: the image optimizer may fetch loopback API hosts (`localhost`, `127.0.0.1`, `::1`) during `next start`. A public media host stays blocked. Standalone output is only for Docker (`NEXT_STANDALONE=1`), so `pnpm run start` no longer warns that `next start` cannot serve it.
- `Dockerfile`: the image build sets `NEXT_STANDALONE=1`. The dashboard URL default is port 4173.

### Dashboard link port

- `src/config/site.ts`, `.env.example`: the staff dashboard URL defaults to `http://localhost:4173`. Port 5173 cannot be bound on Windows (reserved range 5141–5240).

## 2026-10-24

### Vercel deploy and shopper IP

- `DEPLOY.md` (repo root): this app is hosted on Vercel for now. `next.config.ts` skips the Docker `standalone` output when `VERCEL` is set, and sends HSTS, `nosniff`, frame, and referrer headers.
- `src/lib/clientIp.ts`, `src/auth.ts`, `src/lib/session.ts`: server calls send the shopper IP with `PROXY_IP_SECRET`. The value is not public.
- `src/app/api/backend/[...path]/route.ts`: the proxy no longer forwards `X-Forwarded-For`.
- `.env.example` documents `PROXY_IP_SECRET`. `AGENTS.md` points at the deploy guide.

### Infinite scroll product hover

- `src/components/shop/ShopProductGrid.tsx`: infinite scroll uses the same product grid as numbered pages. Cards stay in normal flow, so a hovered card and its buy buttons sit above the next row and no longer cover the footer. The next batch loads when the end of the list nears the screen.

### Shop page size only on numbered pages

- `src/components/shop/ShopToolbar.tsx` and `src/components/shop/ShopPageContent.tsx`: the “Show” page-size menu is only on numbered pages. Infinite scroll shows how many products are on screen (`Showing 24 of 120 products`) and keeps sort and layout.
- `src/app/shop/page.tsx`: infinite scroll ignores `?per_page=` and always loads the site’s batch size.

### Shopper login page

- `src/components/auth/LoginForm.tsx` and `src/lib/authErrors.ts`: the storefront login page no longer links to the dashboard. Only shoppers can sign in here. Staff who try are told to use the dashboard, without a URL.
- `src/app/(auth)/layout.tsx` and `src/components/auth/AuthShell.tsx`: the left side of the login and create-account card keeps the welcome text and shows the photo from site settings (`login_image`). The form stays on the right. Until a photo is uploaded, the green welcome panel stays.

### Shop pagination: numbered pages or infinite scroll

- `src/app/shop/page.tsx`: the shop asks the API for one page (`products_per_page`, or `?page=` in numbered mode) instead of a fixed batch of 48.
- `src/components/shop/useShopCatalog.ts`: filter, sort, price, and brand changes load that page from the API. Infinite scroll appends the next page and remembers the loaded pages plus scroll position in `sessionStorage` (up to 8 pages).
- `src/components/shop/ShopProductGrid.tsx`: numbered pages render a normal grid. Infinite scroll virtualizes rows with `@tanstack/react-virtual` and does not move the window scroll, so Lenis smooth scrolling does not snap the page back to the top.
- `src/components/shop/ShopPagination.tsx`: numbered pages show a short window (page 1, neighbors, last) when there are many pages.
- `src/lib/products.ts`, `src/lib/siteSettings.ts`, `src/i18n/dictionaries/en.ts`, `bn.ts`: catalog query helper, `shop.pagination_mode`, and loading copy.

### Wholesale orders need a verified account

- `src/components/bulk/BulkOrderPageContent.tsx`: guests see a sign-in gate. Signed-in customers must have a verified email and mobile number before the order form opens. Those two fields stay locked to the account. Products can be browsed by category, searched, and added with a quantity stepper. A saved address can fill the delivery fields.
- `src/i18n/dictionaries/en.ts` and `bn.ts`: copy for the sign-in gate, verification checklist, and product picker.

## 2026-10-23

### Wholesale order page

- `src/app/bulk-order/page.tsx` and `src/components/bulk/BulkOrderPageContent.tsx`: customers can search products, set quantities, and place one wholesale order. The shop cart and checkout are unchanged.
- `src/lib/validators/bulkOrder.ts`: shadcn Form schema (safe strings, phone, up to 100 lines).
- `src/i18n/dictionaries/en.ts` and `bn.ts`: `nav.wholesale` and `bulk` copy.
- `src/components/home/Header.tsx`: Wholesale / পাইকারি link in the desktop and phone menus.
- `src/app/account/orders/page.tsx`: wholesale orders show a Wholesale label.

### Allow Next.js to optimize object-storage images

- `next.config.ts`: `NEXT_PUBLIC_MEDIA_URL` is no longer limited to `/uploads/**`. The allowed path is the URL's own prefix (for example `/niyenin-media/**` when media is on MinIO or R2). API uploads stay on `/uploads/**`.

## 2026-10-22

### Production Docker stack

- `Dockerfile`: the health check uses Node, because the Alpine image has no `wget`.
- `next.config.ts`: `outputFileTracingRoot` is the repo root so the image runs `node frontend/server.js`.
- Root `docker-compose.prod.yml`, `.env.production.example`, and `README.md`: production compose with public URLs, `AUTH_SECRET`, and `REVALIDATE_SECRET`. MySQL is not published.

### Top loading bar on reload and page changes

- `src/components/providers/NavigationProgress.tsx`: `nextjs-toploader` draws a green bar at the top when a storefront link changes the page.
- `src/components/providers/bootProgress.ts` and `src/app/layout.tsx`: a small script shows the same bar on a full reload, before React starts.

### Keep only the menu bar sticky

- `src/components/home/Header.tsx`: the logo row (logo, promo, wishlist, cart, theme) scrolls away. The menu bar stays fixed, including the phone menu button and search.

### Empty search shows recent queries, categories, and popular keywords

- `src/components/home/HeaderSearch.tsx`: with an empty query, the left side lists recent searches and categories. The right side lists popular keywords for the selected category and related products with photos. Typed results are unchanged. A photo can be chosen, dropped, or pasted; its preview sits in the search field and a useful file name still runs search.
- `src/lib/search.ts`: loads one product shelf for keywords, related photos, and category covers.
- `src/i18n/dictionaries/en.ts` and `bn.ts`: popular searches, related products, and empty-category copy.

### AliExpress-style search dropdown

- `src/components/home/HeaderSearch.tsx`: focusing search opens an 80% wide dropdown under the bar (search history, a discover list, and category image tiles). Typed results stay in that panel. The full-screen overlay is gone.
- `src/components/home/Header.tsx`: passes catalog categories into both search fields. Category tiles use the category image, or a product photo from that category when none is uploaded.
- `src/lib/validators/searchImage.ts`: image search trusts file bytes, accepts common JPEG labels and `.jfif`, and allows photos up to 5 MB. The file still stays in the browser. The panel stays open when the file dialog closes.
- `src/lib/search.ts`: suggestion requests ask for 8 products so the result grid can fill the panel.
- `src/i18n/dictionaries/en.ts` and `bn.ts`: labels for search history, discover, other recommendations, and the 5 MB image note.

### Stop header search effects from setting state immediately

- `src/components/home/HeaderSearch.tsx`: client mount uses `useSyncExternalStore` instead of `setState` in an effect. Recent searches and products are read when the panel opens, not inside an effect.

### Full-window header search with recent results and image check

- `src/components/home/HeaderSearch.tsx`: focusing the header search opens a full-window panel with recent searches, recently viewed or suggested products (with images), and live results. Short or unsafe queries show a validation message and are not sent.
- `src/lib/search.ts`: recent-search storage and the suggested-product fetch.
- `src/lib/validators/searchImage.ts`: image search accepts only JPEG, PNG, WebP, or GIF up to 1 MB, checked by magic bytes. The file stays in the browser.
- `src/i18n/dictionaries/en.ts` and `bn.ts`: copy for the new search states.

### Open footer Sell & Manage links in a new tab

- `src/components/home/Footer.tsx`: `FooterNavLink` sets `target="_blank"` and `rel="noopener noreferrer"` on external links (dashboard logins and other off-site hrefs). In-site footer links stay in the same tab.

## 2026-10-16

### Fix VerifyRow setState-in-effect + harden WhatsApp via

- `src/components/account/AccountVerification.tsx`: removed `useEffect` sync for phone / `via` (React “setState in effect” cascading-render error). Profile phone adjusts during render; delivery channel is derived from `phone_channels` + optional user override and clamped to available gateways. Client never posts `via: "whatsapp"` unless WhatsApp is advertised; handles `WHATSAPP_UNAVAILABLE`.

### Fix verification code input + Verify button layout

- `src/components/account/AccountVerification.tsx`: code field and Verify button share one equal-height row (`flex` + `shrink-0`) so they no longer break inside the half-width email/mobile cards; lighter tracking, matched border radius with profile inputs; send-code control height aligned to `h-11`.

### Stop frontend reload / login↔account bounce

- Killed duplicate Next.js processes that were fighting on port 3000 (continuous `✓ Compiled`).
- `src/components/account/AccountProfile.tsx`: sync `initialUser` by field fingerprint, not object reference (SSR/HMR new objects no longer loop setState).
- `src/components/providers/AuthSessionProvider.tsx`: `refetchOnWindowFocus={false}` / `refetchWhenOffline={false}` so session polls don’t flip auth.
- `src/auth.ts`: once `RefreshTokenError` is set, stop retrying refresh (stopped middleware bouncing `/account` ↔ `/login?next=/account`).
- `src/components/providers/AuthHydrator.tsx`: depend on a stable user key instead of the whole session object.

### Fix account page reload loop from WhatsApp channel sync

- `src/components/account/AccountVerification.tsx`: stopped syncing `via` from `phone_channels` with setState-during-render + object reference compare (that re-fired whenever verification status refreshed). Channel preference now updates in a `useEffect` on the `sms` / `whatsapp` flags only.

### WhatsApp option for mobile verification

- `src/components/account/AccountVerification.tsx`: phone OTP can be sent via WhatsApp or SMS when the API reports `phone_channels`. Prefers WhatsApp when configured; offers “Send via SMS instead” if WhatsApp returns `NOT_ON_WHATSAPP`.

## 2026-10-15

### Bangla product text on the storefront

- `src/lib/products.ts`: Bangla fields on `ApiProduct`; new `localizeProduct(product, locale)` swaps in the Bangla name, short / full description and category / brand / store names (each falls back to English). `toShopProduct` takes a `locale`.
- `src/lib/stores.ts`: Bangla fields on `StorefrontProduct`.
- `src/app/shop/page.tsx`, `src/app/shop/[slug]/page.tsx`, `src/components/wishlist/WishlistPageContent.tsx`, `src/app/stores/[slug]/page.tsx`, `src/app/brands/[slug]/page.tsx`: products are localized for Bangla shoppers. Metadata and JSON-LD stay English (shared URL).

### Bangla store names on the storefront
- `src/lib/stores.ts`: `shop_name_bn` / `description_bn` on store types, `name_bn` on the store page's brand list, and a new `storeText(store, locale)` helper. In Bangla it returns the Bangla name and description when they are set; each one falls back to English on its own.
- `src/app/stores/[slug]/page.tsx`: the store page hero (name and description), breadcrumb, page sections and "brands from this store" chips use the Bangla text. SEO metadata and JSON-LD stay on the English name because the URL is the same for both languages.
- `src/app/stores/page.tsx`, `src/components/store/StoresPageContent.tsx`: directory cards show the Bangla name and description; the page now passes `locale` to the cards.

### Bangla brand names on the storefront
- `src/lib/brands.ts`: `name_bn` / `description_bn` on brand types, plus a new `brandText(brand, locale)` helper. In Bangla it returns the Bangla name and description when they are set; each one falls back to English on its own.
- `src/app/brands/[slug]/page.tsx`: the brand page hero (name and description), breadcrumb, "Shop all" button and page sections use the localized text. SEO metadata and JSON-LD stay on the English name because the URL is the same for both languages.
- `src/app/brands/page.tsx`: directory cards show the Bangla name in Bangla. The A–Z grouping still uses the English name.
- `src/components/shop/ShopSidebar.tsx`, `src/lib/products.ts`: brand filters show `label_bn` in Bangla.

### Bangla category names
- `src/lib/categories.ts`: `name_bn` on category types, plus a new `categoryName(category, locale)` helper that returns the Bangla name in Bangla when one is set, and the English name otherwise.
- `src/components/home/CategoryBrowseMenu.tsx`: the category menu (visible list and screen-reader list) uses `categoryName`.
- `src/lib/products.ts`, `src/components/shop/ShopPageContent.tsx`, `src/components/shop/ShopSidebar.tsx`: category facets carry `label_bn`, and the sidebar shows it when the locale is Bangla.

### Hover animations back
- `src/app/globals.css`: the site-wide "no motion" rule (added 2026-09-29) also set `transition: none !important` on every element, which killed all hover / focus transitions. Transitions are allowed again; they are still turned off for visitors with `prefers-reduced-motion: reduce`. Keyframe animations stay off (spinners excepted) and `DisableMotion` (framer-motion) is unchanged.
- `src/components/shop/ShopProductCard.tsx`: restored the hover classes removed in the wishlist commit — grid card lift + shadow, image zoom (grid and list view), action icons sliding in, purchase panel slide-down, button press / icon pop, saved-heart fade. All respect `motion-reduce`.
- Home: `HeroBanner`, `LaptopRepairBanner`, `PromoBannerSlider`, `BottomBanners`, `BestSellerSection`, `DealsOfTheDay/DealsLeftPromo` (CTA arrows slide on hover); `DealsBannerSection`, `LatestProducts/LatestProductsSection`, `LatestProducts/LatestItemsSidebar`, `ProductGroupsSection`, `Footer` (image zoom); `FeaturedSection`, `TopBrandsSection` (item lift); `TopBar` (social icon scale).
- `src/components/shop/ShopSidebar.tsx`: colour swatches scale on hover.
- `src/components/store/StoresPageContent.tsx`: store cards lift and the banner zooms on hover.

### API health badge hidden in production
- `src/components/ApiHealthBadge.tsx`: renders nothing when `NODE_ENV=production`, so shoppers no longer see "API connected" on the login / sign-up and account pages and production doesn't poll `/api/health`. Still shown in `next dev`.

### Security fixes (FE-01, FE-03, FE-02 partly)
- `package.json`: `next` and `eslint-config-next` 16.3.5 → 16.4.1 (RCE, SSRF and cache-poisoning advisories). `AGENTS.md` version updated. Root `pnpm.overrides` patches `sharp` and `source-map-js`.
- `src/store/cartSlice.ts`: `applyCoupon` is now an async thunk that checks the code with `POST /api/customer/orders/coupon`; hard-coded `SAVE10` / `SAVE20` removed.
- `src/components/cart/CartPageContent.tsx`, `src/components/checkout/CheckoutPageContent.tsx`: coupon fields await the server check (button shows "Checking…"), no longer reveal valid codes in the error text; checkout sends `coupon_code` instead of `discount_amount` and drops the coupon on `COUPON_INVALID`.

### Security re-audit
- `SECURITY_AUDIT.md`: re-checked FE-01 – FE-12; all still open, `pnpm audit` unchanged (10 advisories). Root `SECURITY_AUDIT.md` counts updated (new workspace item WS-01, `shell-quote` via root `concurrently`). No code changed.

## 2026-10-08

### Shop sidebar scrolling fix
- `src/components/shop/ShopSidebar.tsx`: removed the sidebar's inner scroll box (`lg:max-h` + `overflow-y-auto` + `data-lenis-prevent`). It hid Brands / Tags behind a thin scrollbar and, via Lenis' `overscroll-behavior: contain`, stopped the page from scrolling while the cursor was over the sidebar. The sidebar now scrolls with the page; a `ResizeObserver` sets a negative sticky `top` when it's taller than the viewport so it pins by its bottom edge (24 px gap) instead.

### Dynamic shop price range
- `src/hooks/usePriceRange.ts` (new): fetches `GET /api/products/price-range` when search (debounced 300 ms), category or brands change; uses the SSR range until then.
- `src/lib/products.ts`: `fetchPriceRange()` + `PriceRange` type.
- `src/components/shop/ShopPageContent.tsx`: slider bounds come from `usePriceRange`; when bounds change, an untouched handle follows the new bound and a dragged one is clamped into it.
- `src/components/shop/ShopSidebar.tsx`: `priceRangeLoading` prop dims the price card (`aria-busy`) while bounds load.
- `src/app/shop/page.tsx`: dropped the fake `1000` max fallback when the API returns no products.

### Price filter input: no setState in effect
- `src/components/shop/ShopSidebar.tsx`: `PriceInput` resyncs its draft from the `value` prop during render (tracked `syncedValue`) instead of a `useEffect`, fixing the `react-hooks/set-state-in-effect` lint error.

### Shop price filter redesign
- `src/components/shop/ShopSidebar.tsx`: price section is now a card with a "Selected range" readout, thicker track, catalog min/max labels under the slider, ৳-prefixed Min/Max boxes and a Reset link when filtered. New `PriceInput` keeps typing as a draft and applies it on blur / Enter (previously every keystroke was clamped, so typing e.g. 5000 snapped back to the minimum). Max slider now snaps to the true maximum at the end of the track.
- `src/app/globals.css`: `.shop-range` thumb is a larger white handle with a brand ring, hover/focus halo and grab cursor.

### Welcome modal buttons stay on one line
- `src/components/home/HomeWelcomeModal.tsx`: CTA and dismiss buttons use `whitespace-nowrap shrink-0` so their labels no longer wrap onto two lines.

### Security audit
- `SECURITY_AUDIT.md`: new findings tracker (FE-01 – FE-13) from `pnpm audit` + code review; rolled up in the root `SECURITY_AUDIT.md`. No code changed.
- `AGENTS.md`: points to the audit file.

## 2026-10-01

### FAQ & Terms pages

- `src/app/faq/page.tsx`: help centre with green hero, overlapping search, sticky topic nav, accordion or card grid, help box; FAQPage + Breadcrumb JSON-LD.
- `src/app/terms/page.tsx`: terms page with effective / updated / read-time pills, print button, sticky table of contents, numbered sections, back-to-top, help box; WebPage JSON-LD.
- `src/components/content/`: `ContentHero`, `FaqExplorer` (client search / filter), `HelpCta`, `PlainRichText` (paragraphs + `- ` bullets, never HTML), `PrintButton`.
- `src/lib/contentPages.ts`: `fetchContentPage()` (tags `pages`, `page:<key>`). `src/lib/seo.ts`: `faqPageJsonLd`, `webPageJsonLd`.
- `src/i18n/dictionaries/en.ts` / `bn.ts`: `contentPages` strings + `footer.links.terms`.
- `Footer.tsx`: FAQ + Terms links in the bottom bar. `app/sitemap.ts`: lists `/faq` and `/terms` when published and indexable.

### SEO overhaul + brand / store showcase pages
- New `src/lib/seo.ts` (`buildMetadata`, canonical URLs, title template, JSON-LD builders) and `src/components/seo/` (`JsonLd`). `src/app/layout.tsx` emits Organization + WebSite (with SearchAction) JSON-LD and verification meta from the dashboard SEO settings; `src/lib/siteSettings.ts` reads the nested `seo` block.
- `src/app/sitemap.ts` (static pages + stores, brands, products, categories from the API), `src/app/robots.ts` (honours site-wide noindex), new `src/app/manifest.ts`.
- New `src/app/api/revalidate/route.ts`: `POST` with header `x-revalidate-secret` (must equal `REVALIDATE_SECRET`) purges the given cache tags, so dashboard edits show up immediately. Add `REVALIDATE_SECRET` to `.env.local` (same value as the API).
- New `src/components/showcase/` shared by store and brand pages: `ShowcaseTheme` (per-page accent colour → `sc-*` tokens in `globals.css`, readable text colour picked automatically), `AnnouncementBar`, `ShowcaseHero` (banner / split / minimal), `ProductSections` (featured + sortable paginated grid), `InfoSections` (about, contact & social, policies), `ShowcaseReviews`, `ShowcaseSections` (vendor-chosen order), `ShowcaseBreadcrumb`, `DirectoryPage`.
- `src/app/stores/[slug]/page.tsx` rebuilt on the showcase components with per-store metadata (OG image falls back share image → logo → banner; `?sort` pages are noindex), Store + Breadcrumb + ItemList JSON-LD and a "Brands from this store" strip. Removed `src/components/store/StorePageContent.tsx`.
- `src/app/stores/page.tsx` + `StoresPageContent.tsx`: directory layout with pagination; search results are noindex.
- New `src/app/brands/page.tsx` (A–Z directory) and `src/app/brands/[slug]/page.tsx` (brand showcase, "Sold by" store link, Brand JSON-LD). New `src/lib/brands.ts`, `src/lib/showcase.ts`; `src/lib/stores.ts` types extended.
- `src/app/shop/page.tsx` + `ShopPageContent.tsx`: `?brand=` filter for "Shop all" links. `src/config/site.ts`: SEO defaults.
- `src/i18n/dictionaries/en.ts` + `bn.ts`: `showcase` strings (EN / BN).

### Edit / delete your own review
- `src/components/reviews/WriteReviewDialog.tsx`: if the buyer already reviewed the product, the dialog shows their review with its status and **Edit review** / **Delete review** buttons instead of a dead-end message. Edit reuses the form (name, stars, comment, existing photos can be removed, new ones added, max 4). Delete asks in a confirmation modal first.
- Guests still prove ownership with their checkout email or phone. Signed-in customers skip that step: opening the dialog checks their account automatically.
- The dialog now owns its trigger button (`trigger` prop) and calls `onChanged`; `ProductReviews.tsx` reloads the first page of reviews after any create / edit / delete.
- `src/lib/api.ts`: `apiUpload()` takes an optional method (`PATCH` for edits).
- `src/lib/reviews.ts`: `OwnReview`, `ReviewStatus`, `UpdateReviewResponse`; eligibility type includes the own review.
- `src/i18n/dictionaries/en.ts` + `bn.ts`: manage / edit / delete / status copy.

### Reviewer names: first name + full name on hover
- `src/components/reviews/ProductReviews.tsx`: each review shows the reviewer's first name; hovering or focusing it shows the full name in a tooltip (no tooltip when the name is a single word).
- New `src/components/ui/tooltip.tsx` (shadcn-style, `radix-ui` Tooltip, `z-[95]`).
- `src/components/reviews/WriteReviewDialog.tsx`: the name field is prefilled with the full order name instead of "First L.".
- `src/i18n/dictionaries/en.ts` + `bn.ts`: updated `reviews.dialog.nameHint`.

### Simpler review form
- `src/components/reviews/WriteReviewDialog.tsx`: step 1 is now a single "Email or phone number" input (detected by `@`). After verification the buyer's name is filled in from the order (editable), the rating starts at 5 stars, and the title field was removed — the form is name, stars, comment and photos.
- `src/lib/validators/review.ts`: `parseReviewContact()` + single `contact` field; review schema is `name`, `rating`, `comment`.
- `src/lib/reviews.ts`: eligibility response includes `authorName`.
- `src/i18n/dictionaries/en.ts` + `bn.ts`: `contact`, `contactPlaceholder`, `name`, `nameHint`, `contactInvalid`, `nameShort`, `nameLong`; removed the separate email/phone and title keys.

### Verified product reviews on the product page
- `src/app/shop/[slug]/page.tsx`: fetches approved reviews on the server, sets the header rating/count from the real summary, and adds `aggregateRating` + `review` (author, date, body, rating) to the Product JSON-LD (only when there is at least one review).
- New `src/lib/reviews.ts`: types, `fetchProductReviews()` (revalidate 60s, tag `product-reviews:<slug>`), `reviewsJsonLd()`.
- New `src/components/reviews/`: `ProductReviews` (average, 1–5 bars, list with photos, Verified purchase pill, seller reply, "Show more"), `WriteReviewDialog` (step 1 checks the checkout email/phone with the API; step 2 unlocks stars, title, comment and up to 4 photos with type/size pre-checks; "always resized on the server"), `ReviewStars` (fractional stars).
- New `src/lib/validators/review.ts`: Zod schemas built from the active dictionary so errors show in English or Bangla.
- `src/components/shop/ProductPageContent.tsx`: placeholder reviews replaced by `ProductReviews`; header stars show fractions and link to the reviews section.
- New shadcn primitives `src/components/ui/form.tsx`, `label.tsx`, `dialog.tsx` and `src/lib/utils.ts` (`cn`); added `react-hook-form`, `@hookform/resolvers`, `radix-ui`, `clsx`, `tailwind-merge`.
- `src/app/api/backend/[...path]/route.ts`: forwards `X-Forwarded-For` so the API's per-IP rate limits see the shopper, not the Next server.
- `src/i18n/dictionaries/en.ts` + `bn.ts`: new `reviews` section.

### English / Bangla language switch
- New `src/i18n/`: `config.ts` (locales `en` | `bn`, `NEXT_LOCALE` cookie, `format()` for `{placeholders}`), `dictionaries/en.ts` + `bn.ts` (typed so Bangla must have every English key), `server.ts` (`getLocale()` / `getDictionary()` read the cookie).
- New `src/components/providers/LocaleProvider.tsx`: `useI18n()` → `{ locale, t, setLocale, pending }`. `setLocale` writes the cookie and calls `router.refresh()`; URLs do not change.
- `src/app/layout.tsx`: reads the locale cookie, sets `<html lang>`, Open Graph locale (`en_BD` / `bn_BD`), wraps the app in `LocaleProvider`; adds the Hind Siliguri font (`--font-bengali`) because Poppins has no Bengali glyphs. The root layout now reads a cookie, so pages render per request (fetch caching with `revalidate` is unchanged).
- `src/app/globals.css`: `--font-sans` falls back to `--font-bengali`; `body` no longer forces `poppins.className`.
- `src/components/home/TopBar.tsx`: removed the "Deliver to" country block, the hard-coded calendar date and the BDT currency selector (the site only targets Bangladesh). Email/phone moved to the left; the static "Eng" label is now a working EN / বাং switch.
- Translated UI strings in `Header.tsx` (fallback nav, cart/wishlist labels, mobile drawer), `AccountMenu.tsx`, `HeaderSearch.tsx`, `CategoryBrowseMenu.tsx`, `Footer.tsx` (headings, fallback links, copyright). Nav/footer links configured in the dashboard keep their admin-entered labels.

### Docs
- Added a project section to `AGENTS.md` (below the Next.js auto block) and this `CHANGELOG.md`.
- `Dockerfile`: copies `backend-api/package.json` after the backend folder rename.

### Cart
- `src/lib/guestCartCookie.ts`: guest cart stored in an encrypted cookie.
- `src/lib/cart.ts`, `src/lib/cartTypes.ts`, `src/store/cartSlice.ts`: logged-in users use the DB cart; guest cart merges on login (same product → quantity increased).
- `src/app/cart/page.tsx`, `src/components/cart/CartPageContent.tsx`, `ShippingSummaryValue.tsx`: redesigned cart page with item selection.
- `src/app/checkout/page.tsx`: checks out only the selected items; items can be removed there.

## Earlier

- `src/app/shop/page.tsx`: products-per-page picker, default comes from the dashboard shop setting.
- Store cards use `object-contain` so logos are not cropped; stale image cache fix.
- `src/components/auth/*` (`AuthShell`, `AuthTabs`, `authMotion.ts`, `LoginForm`, `SignUpForm`): animated login/register switch with smoother height animation.
