import "./lib/env.js";
import express from "express";
import cors from "cors";
import { env } from "./lib/env.js";
import { healthRouter } from "./routes/health.js";
import { customerAuthRouter } from "./routes/customerAuth.js";
import { dashboardAuthRouter } from "./routes/dashboardAuth.js";

const app = express();

app.set("trust proxy", 1);
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/auth", customerAuthRouter);
app.use("/api/dashboard/auth", dashboardAuthRouter);

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
