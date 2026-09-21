import "./lib/env.js";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", database: "disconnected" });
  }
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
