# frontend — Changelog

Every change made to this app is recorded here, newest first.
Format: date heading, then one bullet per change with the files touched.

## 2026-10-01

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
