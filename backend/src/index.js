import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import groupRoutes from "./routes/groups.js";
import eventRoutes from "./routes/events.js";
import paymentRoutes from "./routes/payments.js";
import userRoutes from "./routes/users.js";
import webhookRoutes from "./routes/webhooks.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many attempts. Try again in 15 minutes." },
});
app.use("/api/auth", authLimiter);

app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/groups",   groupRoutes);
app.use("/api/events",   eventRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/webhooks", webhookRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`🚀 Auto-Link API running on http://localhost:${PORT}`);
});