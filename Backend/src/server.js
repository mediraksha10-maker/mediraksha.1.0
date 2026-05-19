import "dotenv/config"; // MUST be first — loads .env before any other module reads process.env

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./config/dataBase.js";
import { connectRedis } from "./redis/redisClient.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import slotRoutes from "./routes/slotRoutes.js";
import authMiddleware from "./middlewares/authMiddleware.js";
import { requireDoctor, requirePatient } from "./middlewares/roleMiddleware.js";

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.TRUST_PROXY) {
  const trustProxy = process.env.TRUST_PROXY.trim();
  app.set("trust proxy", /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
}

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, "");

const getAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(","))
    .map(normalizeOrigin)
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    configuredOrigins.push("http://localhost:5173", "http://127.0.0.1:5173");
  }

  return new Set(configuredOrigins);
};

const allowedOrigins = getAllowedOrigins();

const parsePositiveIntegerEnv = (key, fallback) => {
  const parsed = Number(process.env[key]);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

const validateRequiredEnv = () => {
  const required = ["MONGO_URI", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

/* ---------------- FIX __dirname (ES MODULE) ---------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------------- SECURITY & MIDDLEWARE ---------------- */

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parsePositiveIntegerEnv("API_RATE_LIMIT", 300),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parsePositiveIntegerEnv("AUTH_RATE_LIMIT", 30),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

/* ---------------- HEALTH CHECK ---------------- */

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "MediRaksha Backend",
    environment: process.env.NODE_ENV,
  });
});

/* ---------------- API ROUTES ---------------- */

app.use("/api/auth",   authRoutes);
app.use("/api/home",   authMiddleware, requirePatient, userRoutes);  // patients only
app.use("/api/doctor", authMiddleware, requireDoctor,  doctorRoutes); // doctors only
app.use("/api/slots",  slotRoutes); // role guards applied per-route inside slotRoutes.js

/* ---------------- 404 HANDLER (API ONLY) — must come before SPA fallback ---------------- */

app.use("/api/*", (_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

/* ---------------- SERVE FRONTEND (PRODUCTION) ---------------- */

if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../../Frontend/dist");

  // Serve static files
  app.use(express.static(frontendPath));

  // React/Vite SPA fallback — catches all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

/* ---------------- GLOBAL ERROR HANDLER ---------------- */

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

/* ---------------- SERVER START ---------------- */

const startServer = async () => {
  try {
    validateRequiredEnv();
    await connectDB();
    await connectRedis();
    app.listen(PORT, () =>
      console.log(
        `MediRaksha API running on port ${PORT} (${process.env.NODE_ENV})`
      )
    );
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
