# frontend — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

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
