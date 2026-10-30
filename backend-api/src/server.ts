import "./lib/env.js";
import path from "node:path";
import express from "express";
// Express 4 drops rejected promises from async handlers; this forwards them to the error middleware.
import "express-async-errors";
import cors from "cors";
import { storageConfig } from "./config/storage.config.js";
import { env } from "./lib/env.js";
import { healthRouter } from "./routes/health.js";
import { customerAuthRouter } from "./routes/customerAuth.js";
import { customerAddressRouter } from "./routes/customerAddresses.js";
import { dashboardAuthRouter } from "./routes/dashboardAuth.js";
import { dashboardUsersRouter } from "./routes/dashboardUsers.js";
import { dashboardVendorsRouter } from "./routes/dashboardVendors.js";
import { dashboardCategoriesRouter } from "./routes/dashboardCategories.js";
import { dashboardBrandsRouter } from "./routes/dashboardBrands.js";
import { dashboardProductsRouter } from "./routes/dashboardProducts.js";
import { dashboardSiteSettingsRouter } from "./routes/dashboardSiteSettings.js";
import { dashboardHomeHeroRouter } from "./routes/dashboardHomeHero.js";
import { dashboardOverviewRouter } from "./routes/dashboardOverview.js";
import { dashboardNotificationsRouter } from "./routes/dashboardNotifications.js";
import { dashboardOrdersRouter } from "./routes/dashboardOrders.js";
import { customerOrdersRouter } from "./routes/customerOrders.js";
import { customerWishlistRouter } from "./routes/customerWishlist.js";
import { customerCartRouter, publicCartRouter } from "./routes/customerCart.js";
import { paymentsRouter } from "./routes/payments.js";
import { publicProductsRouter } from "./routes/publicProducts.js";
import { publicShopsRouter } from "./routes/publicShops.js";
import { publicSiteSettingsRouter } from "./routes/publicSiteSettings.js";
import { publicAnalyticsRouter } from "./routes/publicAnalytics.js";
import { publicCategoriesRouter } from "./routes/publicCategories.js";
import { publicSearchRouter } from "./routes/publicSearch.js";
import { publicHomeRouter } from "./routes/publicHome.js";
import { publicHomeBlocksRouter } from "./routes/publicHomeBlocks.js";
import { dashboardHomeBlocksRouter } from "./routes/dashboardHomeBlocks.js";
import { productReviewsRouter } from "./routes/productReviews.js";
import { dashboardReviewsRouter } from "./routes/dashboardReviews.js";
import { publicBrandsRouter } from "./routes/publicBrands.js";
import { publicSitemapRouter } from "./routes/publicSitemap.js";
import { dashboardSeoRouter } from "./routes/dashboardSeo.js";
import { publicPagesRouter } from "./routes/publicPages.js";
import { dashboardPagesRouter } from "./routes/dashboardPages.js";
import { requireAppKeys } from "./middleware/appKeys.js";
import { closeKvStore, initKvStore } from "./lib/kvStore.js";
import {
  globalApiLimiter,
  isGlobalRateLimitExempt,
} from "./lib/rateLimit.js";

const app = express();

app.disable("x-powered-by");
// One reverse proxy (Passenger / LiteSpeed on Spaceship). Do not set this to `true`.
app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (env.nodeEnv === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Public-Key", "X-Api-Secret"],
    exposedHeaders: ["Content-Disposition", "X-Total-Rows"],
  }),
);
app.use(requireAppKeys);
app.use(express.json());
app.use("/api", (req, res, next) => {
  if (isGlobalRateLimitExempt(req)) return next();
  return globalApiLimiter(req, res, next);
});

// Public uploaded files — e.g. /uploads/users/photos/<file>
app.use(
  "/uploads",
  express.static(path.resolve(process.cwd(), "uploads"), {
    maxAge: env.nodeEnv === "production" ? "7d" : 0,
  }),
);

app.use("/api/health", healthRouter);
app.use("/api/auth", customerAuthRouter);
app.use("/api/customer/addresses", customerAddressRouter);
app.use("/api/customer/orders", customerOrdersRouter);
app.use("/api/customer/wishlist", customerWishlistRouter);
app.use("/api/customer/cart", customerCartRouter);
app.use("/api/cart", publicCartRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/site-settings", publicSiteSettingsRouter);
app.use("/api/analytics", publicAnalyticsRouter);
app.use("/api/shops", publicShopsRouter);
app.use("/api/brands", publicBrandsRouter);
app.use("/api/sitemap-entries", publicSitemapRouter);
app.use("/api/pages", publicPagesRouter);
app.use("/api/products/:idOrSlug/reviews", productReviewsRouter);
app.use("/api/products", publicProductsRouter);
app.use("/api/categories", publicCategoriesRouter);
app.use("/api/search", publicSearchRouter);
app.use("/api/home", publicHomeRouter);
app.use("/api/home", publicHomeBlocksRouter);
app.use("/api/dashboard/auth", dashboardAuthRouter);
app.use("/api/dashboard/users", dashboardUsersRouter);
app.use("/api/dashboard/shops", dashboardVendorsRouter);
app.use("/api/dashboard/categories", dashboardCategoriesRouter);
app.use("/api/dashboard/brands", dashboardBrandsRouter);
app.use("/api/dashboard/products", dashboardProductsRouter);
app.use("/api/dashboard/site-settings", dashboardSiteSettingsRouter);
app.use("/api/dashboard/home-hero", dashboardHomeHeroRouter);
app.use("/api/dashboard/home-blocks", dashboardHomeBlocksRouter);
app.use("/api/dashboard/overview", dashboardOverviewRouter);
app.use("/api/dashboard/notifications", dashboardNotificationsRouter);
app.use("/api/dashboard/orders", dashboardOrdersRouter);
app.use("/api/dashboard/reviews", dashboardReviewsRouter);
app.use("/api/dashboard/seo", dashboardSeoRouter);
app.use("/api/dashboard/pages", dashboardPagesRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  },
);

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

const storage =
  storageConfig.driver === "s3"
    ? `s3 bucket ${storageConfig.bucket}`
    : "local uploads/";

type PassengerRuntime = {
  configure: (opts: { autoInstall: boolean }) => void;
};

async function start() {
  await initKvStore();

  const passenger = (globalThis as { PhusionPassenger?: PassengerRuntime }).PhusionPassenger;
  if (passenger) {
    passenger.configure({ autoInstall: false });
    app.listen("passenger" as never, () => {
      console.log(`Server running on Passenger (storage: ${storage})`);
    });
  } else {
    app.listen(env.port, "0.0.0.0", () => {
      console.log(`Server running on port ${env.port} (storage: ${storage})`);
    });
  }
}

process.on("SIGTERM", () => {
  void closeKvStore();
});
process.on("SIGINT", () => {
  void closeKvStore();
});

void start();
