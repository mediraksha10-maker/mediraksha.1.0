import "dotenv/config"; // MUST be first — loads .env before any other module reads process.env

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
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
    // Strip trailing slash from FRONTEND_URL so browser Origin header matches exactly
    origin:
      process.env.NODE_ENV === "production"
        ? (process.env.FRONTEND_URL || "").replace(/\/$/, "")
        : "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

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
