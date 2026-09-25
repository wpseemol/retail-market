import "./lib/env.js";
import path from "node:path";
import express from "express";
import cors from "cors";
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
import { dashboardOverviewRouter } from "./routes/dashboardOverview.js";
import { publicProductsRouter } from "./routes/publicProducts.js";
import { publicShopsRouter } from "./routes/publicShops.js";
import { publicSiteSettingsRouter } from "./routes/publicSiteSettings.js";
import { publicAnalyticsRouter } from "./routes/publicAnalytics.js";

const app = express();

app.set("trust proxy", 1);
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());

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
app.use("/api/site-settings", publicSiteSettingsRouter);
app.use("/api/analytics", publicAnalyticsRouter);
app.use("/api/shops", publicShopsRouter);
app.use("/api/products", publicProductsRouter);
app.use("/api/dashboard/auth", dashboardAuthRouter);
app.use("/api/dashboard/users", dashboardUsersRouter);
app.use("/api/dashboard/shops", dashboardVendorsRouter);
app.use("/api/dashboard/categories", dashboardCategoriesRouter);
app.use("/api/dashboard/brands", dashboardBrandsRouter);
app.use("/api/dashboard/products", dashboardProductsRouter);
app.use("/api/dashboard/site-settings", dashboardSiteSettingsRouter);
app.use("/api/dashboard/overview", dashboardOverviewRouter);

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

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
