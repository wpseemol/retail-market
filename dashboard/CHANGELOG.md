# dashboard — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-25

### Save only after an edit

- Edit screens keep **Save changes** off until a field, option, variant, or new product image actually changes. Saving again clears that state.
- Product, brand, category, store, user, profile, password, FAQ, terms, SEO, page design, site settings, and home sections all follow this.
- While the browser is offline the button stays off, the edits remain on the page, and a banner plus a toast say when you are back online and can save.
- `src/store/connection.ts`, `src/hooks/use-edit-save.ts`, `src/hooks/use-baseline-dirty.ts`, `src/components/providers/ConnectionWatcher.tsx`, and the edit pages listed above.

### Product editor TipTap warning

- `src/components/products/RichTextEditor.tsx`: StarterKit already includes link and underline, so those two are not registered a second time. The console warning “Duplicate extension names found” stops.

### Dashboard permission policy

- `vercel.json`: the same permission list as the storefront. `unload` and clipboard stay allowed on this site. Camera, microphone, and location stay blocked.

### Dashboard saves and unload policy

- `vercel.json`: the page allows `unload` again, so Chrome stops reporting “unload is not allowed” while a save is in progress.
- `api/gateway.js`: staff calls keep their bearer token when the `Authorization` header is dropped, and update bodies are still forwarded if the host already parsed them. API responses are not cached.
- `src/lib/api.ts`, `src/lib/authKeys.ts`, `src/store/auth.ts`: the access token is also sent as `X-Staff-Token` and a same-origin `rm_access` cookie.
- `AGENTS.md`: proxy note for that token.

### Dashboard API proxy reached login

- `api/gateway.js`, `vercel.json`: every `/api` path, including `/api/dashboard/auth/login`, is forwarded to the API with the server keys. The old catch-all missed nested paths (404) and crashed while copying the response (500).
- Removed `api/[...path].js`.

### `.env.dev` and `.env.prod`

- `.env.dev`, `.env.prod`: local values and live values are separate. `.env` no longer holds those values.
- `vite.config.ts`: `pnpm dev` reads `.env.dev`. `pnpm build` and `pnpm start` read `.env.prod`.
- `.env.example`, `AGENTS.md`: the two file names.

### API calls go through a server proxy

- `vite.config.ts`: the dev and preview servers forward `/api` to the real API and add `X-Public-Key` and `X-Api-Secret`. Those values are not `VITE_` variables, so they are not in the browser bundle.
- `api/[...path].js`, `vercel.json`: the hosted dashboard does the same. `/api` is not rewritten to `index.html`.
- `src/lib/api.ts`: a missing app key is reported as `API_KEY_REQUIRED` instead of signing the staff user out.
- `.env.example` and `AGENTS.md` document `API_PUBLIC_KEY`, `API_SECRET_KEY`, and `API_PROXY_TARGET`.

### Vercel build and live URLs

- `package-lock.json`: removed. It pointed at this machine’s pnpm store, so Vercel’s `npm install` never installed `typescript` and `tsc` exited 127.
- `pnpm-lock.yaml`, `package.json`: the Vercel install uses pnpm 10.28.0. `vercel.json` runs `pnpm install` and `pnpm run build`.
- `vite.config.ts`: a Vercel build calls `https://niyenin-api.wpseemol.site` and links the storefront at `https://niyenin-frontend.vercel.app`. The dashboard origin is `https://niyenin-dashboard.vercel.app`. Local `.env` values still win.
- `.env.example` and `DEPLOY.md` list those hosts.

### Production start script

- `package.json`: `pnpm run start` serves the built app with Vite preview. There was no `start` script, so that command failed.
- Dev, preview, and start listen on **4173**. Port 5173 is inside the Windows reserved range 5141–5240, so `vite preview` exited with `EACCES`.
- `vite.config.ts`, `.env`, `.env.example`, `Dockerfile`: same port. Compose maps the dashboard to 4173. `src/lib/api.ts`: the auth store is imported directly. The dynamic import was also pulled in statically, which Vite warned about during `pnpm run build`.
- `AGENTS.md`: scripts table includes `start` and the new port.

## 2026-10-24

### Vercel deploy and security headers

- `DEPLOY.md` (repo root): this app is hosted on Vercel for now. `vercel.json` serves the SPA and sets HSTS, `nosniff`, frame, referrer, and a content security policy.
- `nginx.conf`: the same headers for a later VPS image. `connect-src` and `img-src` allow `https:` so the API host can change without editing the config.
- `AGENTS.md` points at the deploy guide.

### Products per page only for numbered shop pages

- `src/pages/system/settings/storefront/ShopSettingsPage.tsx`: “Products per page” shows only when pagination is numbered pages. Infinite scroll keeps the other shop options and explains that shoppers do not pick a page size.

### Storefront login image

- `src/lib/imagePresets.ts`: `loginPanel` is 960 × 1200 (4:5).
- `src/lib/validators/siteSettings.ts`: settings include `login_image`, and the file check rejects unsafe uploads.
- `src/pages/system/settings/storefront/IdentitySettingsPage.tsx`: Website identity has a Storefront login image upload. It is resized on the server and shown on the left side of the storefront login page.

### Shop pagination setting

- `src/lib/validators/siteSettings.ts`: `shop_pagination_mode` is `pages` or `infinite`.
- `src/pages/system/settings/settingsContext.ts`: form defaults include the mode so a save keeps the stored value.
- `src/pages/system/settings/storefront/ShopSettingsPage.tsx`: Shop catalog has a Pagination select (numbered pages or infinite scroll).

## 2026-10-23

### Show wholesale orders

- `src/lib/orders.ts`: `OrderRow.kind` is `retail` or `wholesale`.
- `src/pages/orders/OrdersPage.tsx`: wholesale orders show a Wholesale label next to the order number and the customer name.

## 2026-10-22

### Production Docker stack

- `nginx.conf`: gzip, no cache on `index.html`, long cache on hashed `/assets/`, and basic response headers.
- `package.json`: `@types/geojson` and `@types/topojson-specification` are direct dependencies so the production image type-check can see them. `HomeComponentsEditor.tsx`: the unused `onError` argument no longer fails `tsc`.
- Root `docker-compose.prod.yml` and `.env.production.example`: the dashboard image is built with `VITE_API_URL` / `VITE_APP_URL` / `VITE_STOREFRONT_URL` from the public production URLs.

### Top loading bar on reload and page changes

- `src/components/providers/NavigationProgress.tsx`: `react-top-loading-bar` shows a green bar at the top when the dashboard reloads and when the route changes. Mounted in `src/main.tsx`.

## 2026-10-16

### WhatsApp gateway settings

- New Settings tab `/settings/whatsapp` (`WhatsAppGatewaySettingsPage` + `WhatsAppGatewaySettingsPanel`): configure Meta Cloud API or Twilio WhatsApp for phone OTP (encrypted token, reveal with password, test send).
- `src/lib/validators/whatsappGateway.ts`: Zod form schema + API body helpers.
- `settingsTabs.ts` / `App.tsx` / settings barrel: WhatsApp tab next to SMS gateway.

## 2026-10-15

### Optional Bangla version for products

- `src/components/products/ProductBanglaSection.tsx` (new): step 04 "Bangla version" on the product create / edit pages — a switch (off by default) revealing the Bangla name, short description and rich-text description. The slug is shared with English.
- `src/components/dashboard/bangla-version-fields.tsx`: `BanglaVersionFormFields` takes `descriptionLabel`, `extraFields` (also cleared when switched off) and `children` for extra inputs.
- `src/lib/validators/product.ts`: `bn_enabled`, `name_bn`, `short_description_bn`, `description_bn` with safe-input / safe rich-text checks; `toProductApiBody` sends `null` when the switch is off. `PRODUCT_BANGLA_DEFAULTS` + `productBanglaValues()` for form defaults.
- `src/pages/catalog/products/ProductCreatePage.tsx` / `ProductEditPage.tsx`: Bangla section added (variants moved to step 05). Edit opens the switch when Bangla text exists and confirms before removing it.
- `src/lib/products.ts`: Bangla fields on `Product`.

### Optional Bangla version for stores + shared Bangla fields
- New `src/components/dashboard/bangla-version-fields.tsx` with two versions of the "Add Bangla version" switch plus Bangla name and description fields: `BanglaVersionFields` (controlled, for `useState` pages) and `BanglaVersionFormFields` (shadcn `FormField`s, for react-hook-form pages). It replaces `components/categories/CategoryBanglaFields.tsx` and `components/brands/BrandBanglaFields.tsx`, which were deleted, and the category and brand pages now use it.
- `src/pages/stores/StoreCreatePage.tsx`: new step 03 "Bangla version", off by default so it can be skipped. Sends `shop_name_bn` / `description_bn` only when the switch is on.
- `src/pages/stores/StoreEditPage.tsx`: new step 02 "Bangla version". "Storefront layout" is now step 03 and "Change history" step 04. The switch starts on when the store already has Bangla text, and turning it off with text present asks for confirmation (`useConfirm`). The Bangla fields are checked with Zod and safe input before saving.
- `src/lib/validators/shop.ts`: `bn_enabled`, `shop_name_bn`, `description_bn` in the create schema; new `shopBanglaSchema`, `STORE_BANGLA_COPY` and `bnOrNull()`. `src/lib/validators/brand.ts`: new `BRAND_BANGLA_COPY`.
- `src/lib/shops.ts`: `shop_name_bn` / `description_bn` on `Shop`.

### Optional Bangla version for brands
- New `src/components/brands/BrandBanglaFields.tsx`: shadcn `FormField`s (via `useFormContext`) for an "Add Bangla version" switch plus optional Bangla name and description. Turning the switch off clears both fields.
- `src/pages/catalog/brands/BrandCreatePage.tsx`: new step 03 "Bangla version", off by default so it can be skipped.
- `src/pages/catalog/brands/BrandEditPage.tsx`: the same step 03. The switch starts on when the brand already has Bangla text. Turning it off with text present asks for confirmation (`useConfirm`). "Linked store" is now step 04.
- `src/lib/validators/brand.ts`: `bn_enabled`, `name_bn` (≤120), `description_bn` (≤500) with safe input. `toBrandApiBody` sends `null` when the switch is off or a field is blank.
- `src/lib/brands.ts`: `name_bn` / `description_bn` on `Brand`.

### Optional Bangla version for categories
- New `src/components/categories/CategoryBanglaFields.tsx`: an "Add Bangla version" switch that shows optional Bangla name and description fields. The help text explains that the slug is shared and that the English name is used when the Bangla name is empty.
- `src/pages/catalog/categories/CategoryCreatePage.tsx`: new step 03 "Bangla version", off by default so it can be skipped. Sends `name_bn` / `description_bn` only when the switch is on.
- `src/pages/catalog/categories/CategoryEditPage.tsx`: the same step. The switch starts on when the category already has Bangla text. Turning it off with text present asks for confirmation (`useConfirm`), then the text is cleared on save.
- `src/lib/categories.ts`, `src/lib/validators/category.ts`: `name_bn` / `description_bn` types and Zod rules (safe input, ≤150 / ≤5000, blank becomes `null`).

### Readable primary buttons
- `src/components/ui/button.tsx`: the default button variant used white text on the bright brand green (`#00b207`). That contrast is only about 2.9:1, so labels such as "Add product", "Add brand", "Add category" and Save looked faint. The variant now uses the darker brand green (`bg-brand-hover`, `#2c742f`, about 5.8:1 with white), bold text and a soft shadow, with a darker green on hover. There are no `dark:` classes, so pages that pass their own `bg-*` keep working in dark mode. The `--primary` token is unchanged, so focus rings, charts and accents keep the bright green.

### Stores hero "Create store" button
- `src/pages/stores/StoresPage.tsx`: the hero button used `text-brand-deep`, which turns pale green in dark mode, so its text could hardly be seen on the white button. It now uses fixed dark-green text (`#14361c`) in both themes, is taller (`h-10`), has bold text, a soft shadow and ring, and a bigger icon.
- `src/pages/stores/StoresPage.tsx`: the store card status badge ("publish" / "draft" / …) had the same dark-mode problem. It is now a rounded pill with fixed dark-green text on white for active stores, and a darker translucent pill (`bg-black/60` with blur) for the other statuses, so it stays readable on bright banners. Each badge also has a small status dot. The card banner gradient now starts from a fixed `#002603`, so it no longer looks washed out in dark mode.

### Image dimensions on every upload
- `src/lib/imagePresets.ts`:
  - New `checkImageDimensions(file, preset)`, which follows the API's rule: shape within 3% and at least the preset size.
  - Also adds `imageSizeLabel()`, `presetShape()` and `formatRatio()`. "~" presets now show their real shape (e.g. 1920 × 500 is shown as 3.84:1, not "4:1").
  - Hint text now says "At least 1200 × 1200 px, 1:1 shape" instead of "Recommended".
  - Error messages give the actual and required size, e.g. "Wrong shape: your image is 1920 × 1080 px (16:9), this spot needs 1:1 … Crop it to 1:1 and try again."
- `src/components/dashboard/image-size-badge.tsx` (new): `ImageSizeBadge`, a ruler badge with the required size shown beside every image label.
- The check runs before upload, and the badge is shown, on:
  - category create and edit, brand create and edit, store create and edit (logo and banner)
  - the product gallery, which lists each rejected file on its own line
  - the store / brand page designer (logo, banner, share image)
  - SEO share image, login logo and favicon
  - home hero slots and home-block images
  - profile photo: badge only, since avatars have no size rule
- Shared fields updated: `CategoryFormShell`, `BrandFormShell`, `ShopFormShell`, `ShowcaseImageField`, `BrandingImageDropzone`, `HomeImageField`, `HeroBannerSettingsPanel`, `ProductImageGalleryField`.
- `src/components/ui/sonner.tsx`: toast titles keep line breaks, so multi-file errors are readable.

### Animations
- `package.json` + `src/index.css`: added `tw-animate-css`. It was missing, so dialogs, the confirm popup, sheets, dropdowns, selects and tooltips had no open / close animation even though they use its `animate-in` classes.
- `src/index.css`: `prefers-reduced-motion` turns animations and transitions off everywhere; loading spinners keep spinning.
- `src/layouts/DashboardLayout.tsx` + `src/lib/motion.ts`: route changes fade and rise in (0.25 s, `pageEnter` preset, reduced-motion safe).
- `src/components/ui/button.tsx`: buttons shrink slightly while pressed (`active:scale-[0.97]`); link buttons don't.
- Uploaded image previews fade and zoom in when added or replaced. Product gallery thumbnails zoom on hover.
- `CategoryIconPicker`: the selected icon pops in, and tiles lift on hover and press down when clicked.

### Toast notifications on save
- `package.json`: added `sonner`.
- `src/components/ui/sonner.tsx` (new): brand-themed `Toaster` using the dashboard's own colours, with a matching icon per type.
  - Card colours, Poppins font and radius come from the dashboard theme. A green left border marks success, red marks errors.
  - Shown top-right below the header, with a close button and a 4 s duration. It follows the light / dark theme.
- `src/main.tsx`: mounts `<Toaster />`.
- `src/hooks/use-toast-messages.ts` (new):
  - `useToastMessages(success, error)` shows a toast whenever a page's message changes.
  - `toastNotice({ tone, text })` is for list pages.
- Save toasts (the inline messages stay as well):
  - Edit pages: category, brand, product, store, user (including restrictions) and profile (photo, details, password).
  - Content and settings: SEO, FAQ, Terms, the showcase editor, all site-settings tabs through `SiteSettingsLayout`, history, and the SMS, email, payment, social login and shipping panels.
- Create pages (product, store, brand, category): a "… created" toast before redirecting, and an error toast when creating fails.
- Orders, reviews, products and categories lists: the old notice banners are replaced by toasts. The duplicate auto-dismiss code and unused imports are gone.

### Clearer category icon picker
- `src/components/categories/CategoryIconPicker.tsx` (used on category create and edit):
  - New "Selected icon" card at the top showing a large preview, the icon's name and group, "Show in list" and "Remove icon". When nothing is picked, it says so.
  - Every tile now shows its name, and the selected tile is solid brand colour with a check.
  - The list scrolls to the current icon when the page opens.
  - A notice with "Show it" appears when the search or group filter hides the selected icon.
  - The footer shows the icon's readable name instead of the internal one (e.g. `FolderTree`).

### Remove a category cover photo
- `src/pages/catalog/categories/CategoryEditPage.tsx`: new "Remove photo" action on the cover dropzone. It asks for confirmation with `useConfirm`, then calls `DELETE /api/dashboard/categories/:id/image`, so the category goes back to using only its icon.
- `src/components/categories/CategoryFormShell.tsx`: the dropzone's remove button is now styled as destructive, with a trash icon and the label "Remove photo". The create page uses the same button.

### API health badge polling
- `src/components/ApiHealthBadge.tsx`: still shown to signed-in staff in production, but skips the 30 s check while the tab is hidden and re-checks when the tab becomes visible again.

### Dependency fix (DB-11)
- Root `package.json` `pnpm.overrides` pins `source-map-js >=1.2.2` (pulled in by `@tailwindcss/vite`). No dashboard code changed.

### Security re-audit
- `SECURITY_AUDIT.md`: re-checked DB-01 – DB-07; all still open (DB-08 stays fixed). Added DB-11 (`source-map-js` via `@tailwindcss/vite`). Root `SECURITY_AUDIT.md` counts updated. No code changed.

### Categories: export / import with cover images
- `src/pages/catalog/categories/CategoriesPage.tsx`: Export menu (ZIP with cover images, or CSV with image links; follows the current search / status filter), Import button and a notice bar. Shown according to `permissions` from `GET /api/dashboard/categories` (super_admin, admin, moderator).
- `src/components/categories/CategoryImportDialog.tsx` (new): shadcn `Form` + Zod, accepts `.csv` or `.zip`, import mode, template download, dry-run preview with created / updated / new-cover counts and per-row errors, then a warning confirm before applying. Helper text says images are always resized on the server.
- `src/lib/validators/categoryBulk.ts` (new): file pre-check (CSV ≤2 MB, ZIP ≤25 MB, type + name) and the form schema.
- `src/lib/categories.ts`: `CategoryBulkPermissions`, `CategoryImportRow`, `CategoryImportResult` types.

### Live preview header fix (create / edit forms)
- The preview card under the header was meant to overlap it, but the header was positioned and painted on top, hiding the card's top edge. The overlap block is now `relative z-10`, and the header uses the solid `#14361c` (blur blobs removed) to match the role banners. Files: `components/categories/CategoryFormShell.tsx`, `components/products/ProductFormShell.tsx`, `components/brands/BrandFormShell.tsx`, `components/shops/ShopFormShell.tsx`, `pages/account/ProfilePage.tsx`, `pages/access/UserEditPage.tsx`; `pages/stores/StoresPage.tsx` hero switched to the same solid colour.

### Products: CSV export / import and bulk edit
- `src/pages/catalog/products/ProductsPage.tsx`: Export menu (all / filtered / selected), Import button, per-card checkboxes with select-all, and a selection bar with Bulk edit, Export selected and Delete selected. Buttons follow the `permissions` returned by `GET /api/dashboard/products`, so each role only sees what the API allows. Bulk delete asks for confirmation through `useConfirm`.
- `src/components/products/ProductImportDialog.tsx` (new): shadcn `Form` + Zod (CSV type / name / 2 MB pre-check), import mode select, template download, server dry-run preview with per-row errors and warnings, then a warning confirm before applying.
- `src/components/products/ProductBulkEditDialog.tsx` (new): shadcn `Form` + Zod; every field defaults to "Keep current". Price (set / ±% / ±৳) and stock (set / add / remove) are hidden for moderators. Confirms before applying and reports skipped products.
- `src/components/products/productCsvDownload.ts` (new): `saveBlob()` download helper.
- `src/lib/validators/productBulk.ts` (new): import and bulk-edit schemas, CSV limits mirrored from the API, `toBulkChanges()`.
- `src/lib/products.ts`: `ProductBulkPermissions`, `ProductImportResult`, `ProductBulkResult` types.

### Solid role banners instead of gradients
- `src/pages/overview/RolePage.tsx`: the Super Admin / Admin / Moderator / Vendor hero is now one solid, muted green per role (`#14361c`, `#1e4a2a`, `#33483a`, `#1f4740`) instead of a three-stop gradient with blurred glow circles. Config fields `accent` / `heroClass` replaced by `heroBg` / `heroInk`; the white "Your role" badge and primary button use the matching banner colour for text (they used `text-brand-deep`, which turns light green in dark mode).
- `src/components/dashboard/page-shell.tsx`: `PageHero` uses the same solid `#14361c` with a thin border and soft shadow; glow circle removed.

## 2026-10-08

### Login page redesign
- `src/pages/auth/LoginPage.tsx`: new split layout with a plain dark-green brand panel on the left (logo, one short line about the dashboard, footer) and a left-aligned form on the right. On mobile it's one column. The form now uses shadcn `Form` + react-hook-form + `zodResolver`, has a password show/hide toggle, a left-border session-expired notice, inline field errors, and a "Customer sign-in" link. The page is wrapped in `MotionProvider` because `/login` sits outside `DashboardLayout`, and without it `FadeUp` stayed at opacity 0.
- `src/lib/validators/auth.ts` (new): `staffLoginSchema` with `withSafeInput` on identifier and password, plus length limits. Closes audit item DB-08 (`SECURITY_AUDIT.md`).

### Security audit
- `SECURITY_AUDIT.md`: new findings tracker (DB-01 – DB-10) from `npm audit` + code review; rolled up in the root `SECURITY_AUDIT.md`. No code changed.
- `AGENTS.md`: points to the audit file.

## 2026-10-01

### Overview page: charts + visitor world map

- `src/pages/overview/HomePage.tsx`: rebuilt — 7 / 30 / 90-day range (kept in `?range=`), refresh, action alerts (pending orders, reviews, low stock), KPI cards with sparklines and change vs previous period, secondary stats, sales & traffic chart, orders-by-status / payment / device charts, visitor world map + top countries, sales by category, best sellers, recent orders, top pages + traffic sources, low stock, quick links.
- `src/components/overview/OverviewCharts.tsx`: Recharts charts built on the shadcn chart wrapper (`KpiCard`, `TrendChart`, donuts, payment + category bars, `ChangeBadge`).
- `src/components/overview/WorldMap.tsx`: lazy-loaded choropleth (d3-geo Equal Earth + world-atlas 110m TopoJSON, ISO alpha-2 → numeric via `i18n-iso-countries`) with hover tooltip and legend; local / unknown traffic is listed but not mapped.
- `src/components/ui/chart.tsx`: shadcn chart component (Recharts 3).
- `src/lib/overview.ts`: response types, labels, compact formatters.
- `src/index.css`: `--chart-1…6` and `--map-empty` tokens (light + dark).
- `package.json`: added `recharts`, `d3-geo`, `topojson-client`, `world-atlas`, `i18n-iso-countries` (+ types), installed with pnpm.

### Fix: FAQ / Terms editors crashed on load

- `src/pages/content/FaqPageEditor.tsx`, `TermsPageEditor.tsx`: `useFieldArray` seeds an empty `content` object before the loaded page is reset into the form, so the form rendered early and `hero.subtitle.length` threw (blank screen). The form now waits for a `hydrated` flag set after `form.reset()`; list / counter reads tolerate missing values.
- `src/components/content/ContentPageSections.tsx`: subtitle counter guards `undefined`.
- `src/components/dashboard/site-header.tsx`: breadcrumb titles for `/seo`, `/content/faq`, `/content/terms` (were showing "Dashboard").

### FAQ & Terms page editors

- `src/pages/content/FaqPageEditor.tsx` (`/content/faq`): hero, layout (accordion / grid, search, topic nav, open first), categories with nested questions (add, reorder, hide, delete with confirm), help box, SEO + publish.
- `src/pages/content/TermsPageEditor.tsx` (`/content/terms`): hero, effective date, intro, TOC / numbering switches, sections (add, reorder, hide, delete with confirm), help box, SEO + publish.
- `src/components/content/`: shared `ContentPageSections` (hero, help box, SEO, status aside with search preview, row actions) and `useContentPage` hook. "Reset to default" asks for confirmation.
- `src/lib/contentPages.ts`, `src/lib/validators/contentPage.ts`: types, limits and Zod schemas mirroring the API.
- `src/lib/rbac.ts`: `CONTENT_PAGE_ROLES` (super_admin, admin). `App.tsx`: routes. `app-sidebar.tsx`: "FAQ page" / "Terms page" links; group renamed "Marketing & content".

### SEO settings page + store / brand page designer
- New `src/pages/marketing/SeoSettingsPage.tsx` at `/seo` (super_admin + admin): title template, per-page defaults (home, shop, stores, brands), social sharing image (removal confirmed), Google / Bing verification, site-wide noindex (warning confirm), live Google + share previews (`src/components/seo/SeoPreview.tsx`). New `src/lib/seo.ts`, `src/lib/validators/seo.ts`.
- SEO fields moved off **Settings → Identity / Social sharing**: those tabs now show `SeoMovedNotice` linking to `/seo`; `validators/siteSettings.ts`, `settingsContext.ts`, `GeneralSettingsForm.tsx` no longer send them.
- New `src/components/showcase/ShowcaseEditor.tsx` (tabs: Branding, Layout, About & contact, Policies, Announcement, SEO; jumps to the tab with the first error; accent contrast warning; section reorder/toggle; noindex warning confirm), `ShowcasePreview.tsx`, `ShowcaseImageField.tsx` (upload / replace / remove with confirm; copy says images are always resized on the server). New `src/lib/showcase.ts`, `src/lib/validators/showcase.ts` (shadcn Form + Zod + safe-input).
- New `src/pages/stores/StoreDesignPage.tsx` at `/stores/:slug/design` (vendor for own store, super_admin/admin for any; "Admin override" badge) and `src/pages/catalog/brands/BrandShowcasePage.tsx` at `/brands/:id/showcase` (super_admin/admin, or the vendor of the linked store).
- New `src/components/brands/BrandLinkedStoreCard.tsx` on `BrandEditPage`: super_admin/admin link a brand to one store; moving or unlinking asks through a warning `useConfirm()`. `BrandEditPage` also shows "Customize brand page" when `permissions.showcase`.
- `BrandsPage.tsx`: vendor "All brands / My brands" toggle (`/brands?mine=1`), "Customize page" action, linked store shown on cards. `src/lib/brands.ts`: `vendor`, `banner`, `tagline`, `BrandPermissions`; `validators/brand.ts`: `brandOwnerSchema`.
- `StoresPage.tsx`: "Customize page" on every card; create / edit only for super_admin + vendor (admins go to the design page). `StoreEditPage.tsx`: "Customize store page" button.
- `src/lib/rbac.ts`: `STORE_MANAGE_ROLES`, `STORE_DELETE_ROLES`, `SEO_ROLES`, `BRAND_SHOWCASE_ROLES`, `BRAND_OWNER_ROLES`; `STORE_ROLES` now includes admin. `src/App.tsx` routes split accordingly. `src/lib/imagePresets.ts`: `brandBanner`.
- `app-sidebar.tsx`: "Marketing & SEO" group (Search & SEO; vendor-only "My store page" and "My brands").

### Product review moderation (Support & Quality)
- New `src/pages/support/ReviewsModerationPage.tsx` (+ `index.ts`) at `/support/reviews` (`/reviews` redirects): tabs All / Pending / Approved / Hidden with counts, flagged-only toggle, search, rating filter, desktop table and mobile cards (product thumb + title, stars, customer name/email/phone, Verified Purchase pill, status badge).
- Row actions: view, open on storefront, approve, hide/show, reject (admins), flag/clear flag, vendor reply, delete. Delete asks through `useConfirm()` and is disabled with a tooltip for moderators; vendors don't see it.
- New `src/components/reviews/` (`ReviewStars`, `ReviewBadges`, `ReviewReplyDialog` — shadcn Form; removing a reply is confirmed).
- New `src/lib/reviews.ts` (types, status meta, `reviewStatusBlockReason` mirroring the API rules) and `src/lib/validators/review.ts`.
- `src/lib/rbac.ts`: `REVIEW_ROLES`, `REVIEW_FLAG_ROLES`, `REVIEW_REPLY_ROLES`, `REVIEW_DELETE_ROLES`.
- `src/App.tsx`: new route; `src/components/dashboard/app-sidebar.tsx`: "Support & Quality" group with "Product reviews".

### Pages reorganized into feature domains (RBAC-aligned)
Route URLs and effective access are unchanged; only file locations, imports, and guard grouping changed. Moves done with `git mv` to keep history.
- `src/pages/LoginPage.tsx` → `src/pages/auth/LoginPage.tsx`
- `src/pages/HomePage.tsx` → `src/pages/overview/HomePage.tsx`
- `src/pages/RolePage.tsx` → `src/pages/overview/RolePage.tsx`
- `src/pages/ProfilePage.tsx` → `src/pages/account/ProfilePage.tsx`
- `src/pages/NotificationsPage.tsx` → `src/pages/account/NotificationsPage.tsx`
- `src/pages/OrdersPage.tsx` → `src/pages/orders/OrdersPage.tsx`
- `src/pages/ProductsPage.tsx`, `ProductCreatePage.tsx`, `ProductEditPage.tsx` → `src/pages/catalog/products/`
- `src/pages/CategoriesPage.tsx`, `CategoryCreatePage.tsx`, `CategoryEditPage.tsx` → `src/pages/catalog/categories/`
- `src/pages/BrandsPage.tsx`, `BrandCreatePage.tsx`, `BrandEditPage.tsx` → `src/pages/catalog/brands/`
- `src/pages/ShopsPage.tsx` → `src/pages/stores/StoresPage.tsx`; `ShopCreatePage.tsx` → `stores/StoreCreatePage.tsx`; `ShopEditPage.tsx` → `stores/StoreEditPage.tsx` (file names now match the `Store*` exports)
- `src/pages/UsersPage.tsx`, `UserEditPage.tsx` → `src/pages/access/` (staff management)
- `src/pages/settings/` → `src/pages/system/settings/` (System Settings, super_admin only):
  - root: `SiteSettingsLayout.tsx`, `settingsContext.ts`, `settingsTabs.ts`, `GeneralSettingsForm.tsx`, `index.ts`
  - `storefront/`: `IdentitySettingsPage`, `HeaderSettingsPage`, `FooterSettingsPage`, `HomeSettingsPage`, `ShopSettingsPage`, `SocialShareSettingsPage`
  - `integrations/` (credential-bearing): `SocialLoginSettingsPage`, `SmsGatewaySettingsPage`, `EmailProviderSettingsPage`, `PaymentSettingsPage`, `ShippingSettingsPage`
  - `tracking/`: `AnalyticsSettingsPage`, `PixelsSettingsPage`
  - `audit/`: `HistorySettingsPage`
  - All 14 sub-folder pages: `./settingsContext` / `./GeneralSettingsForm` imports → `../`.
  - `index.ts` re-exports from the new sub-folders.
- New barrels: `src/pages/{auth,overview,account,orders,catalog,stores,access}/index.ts`.
- New `src/lib/rbac.ts`: route role lists named after the `TARGET_REQUIREMENTS.md` §2 matrix (`SYSTEM_SETTINGS_ROLES`, `STAFF_MANAGEMENT_ROLES`, `ORDER_ROLES`, `PRODUCT_ROLES`, `TAXONOMY_VIEW_ROLES`, `TAXONOMY_MANAGE_ROLES`, `STORE_ROLES`, `NOTIFICATION_ROLES`, `OVERVIEW_ROLES`, `WORKSPACE_ROLES`), matching the backend's current `requireRoles(...)`.
- `src/App.tsx`: imports from the domain barrels; route tree regrouped into one `ProtectedRoute` block per domain using `lib/rbac.ts` (settings, users, and the super-admin workspace are now separate blocks); `OverviewGate` uses `OVERVIEW_ROLES`.
- `src/components/ProtectedRoute.tsx`: `roles` prop accepts `readonly StaffRole[]`.
- `AGENTS.md`: new `pages/` tree, `lib/rbac.ts`, and the "Pages & routes" convention.

### Docs
- Added `AGENTS.md` and this `CHANGELOG.md`.
- `Dockerfile`: copies `backend-api/package.json` after the backend folder rename.

### Invoice brand logo
- `public/logo/niyenin-print.png`: trimmed Niyenin wordmark (566×225).
- `src/lib/siteBranding.ts`: `PRINT_LOGO`, synchronous `getPrintBranding()`; `invalidateSiteBrandingCache` now refetches.
- `src/components/orders/printInvoices.ts`: header shows the logo + "INVOICE" label, keeps colours when printing, waits for images (max 2.5 s) before `print()`. Signature is now `printInvoices(orders)`.

### Delete confirmation modal everywhere
- New `src/components/providers/ConfirmProvider.tsx` with `useConfirm()`; mounted in `src/main.tsx`.
- Replaced `window.confirm` in BrandEditPage, CategoryEditPage, ProductEditPage (also on remote image remove), ShopEditPage (store delete, clear history), HistorySettingsPage, SiteNavMenuEditor.
- Added confirms to notification removal (`notifications-menu.tsx`, NotificationsPage).

### Order deletion
- `src/lib/orders.ts`: `ORDER_DELETE_ROLES`, `orderDeleteBlockReason()`.
- `src/pages/OrdersPage.tsx`: "Delete order" row action, "Delete Selected" bulk action, delete from drawer and detail page — all behind the confirm modal; disabled with the reason when not deletable.
- `src/components/orders/OrderDetailPanel.tsx`: optional `onDelete` / `deleting` props.

### Order Management page
- `src/pages/OrdersPage.tsx`: KPI cards, search + filters, status tabs with counts, table with selection, bulk bar (status, export, print), detail drawer, status dialog, pagination, detail page.
- `src/components/orders/*`: `OrderBadges`, `OrderDetailPanel`, `OrderStatusDialog`, `printInvoices`, `useOrderActions`.
- `src/lib/api.ts`: `apiDownload()` for CSV export.
- `src/lib/validators/order.ts`: Zod schemas for status/tracking forms.
- KPI cards stack on mobile (`flex-col sm:flex-row`).

### Payment gateways
- Clear message when the test call returns `PAYMENT_MODE_MISMATCH` (sandbox vs live).

### Image hints
- `src/lib/imagePresets.ts`: recommended ratio and pixel size (e.g. 300×300) per upload type, shown on every image dropzone.

## Earlier

- `src/pages/settings/ShopSettingsPage.tsx`: default products-per-page for the storefront shop.
