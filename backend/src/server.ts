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
app.use("/api/dashboard/auth", dashboardAuthRouter);
app.use("/api/dashboard/users", dashboardUsersRouter);
app.use("/api/dashboard/shops", dashboardVendorsRouter);

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
