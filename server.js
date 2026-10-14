
import express from "express";
import cors from "cors";
import "dotenv/config";
import { createServer } from "http";

import configureDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import libraryRoutes from "./routes/libraryRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import rentRoutes from "./routes/rentRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import libraryTransactionRoutes from "./routes/libraryTransactionRoutes.js";

import requestRoutes from "./routes/requestRoutes.js";

import cartRoutes from "./routes/cartRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import setupCronJobs from "./utils/cronJobs.js";

import { Server } from "socket.io";

// ── App & HTTP Server ────────────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ── Socket.io Setup ──────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
     origin: [
  "https://smart-hybrid-library.vercel.app",
  "https://smart-hybrid-library-iu1n5n9yn-project-52c1.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
    process.env.CLIENT_URL,
  ].filter(Boolean),
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`📡 New device connected: ${socket.id}`);

  // Join a specific transaction tracking room
  socket.on("join-tracking", (requestId) => {
    socket.join(`tracking-${requestId}`);
    console.log(`👤 Socket ${socket.id} joined tracking for request: ${requestId}`);
  });

  // Handle location updates (from either borrower or owner)
  socket.on("update-location", ({ requestId, role, lat, lng }) => {
    // Broadcast to everyone in the room (the other party)
    socket.to(`tracking-${requestId}`).emit("location-updated", { role, lat, lng });
  });

  socket.on("disconnect", () => {
    console.log(`❌ Device disconnected: ${socket.id}`);
  });
});



// ── Middleware ────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: [
  "https://smart-hybrid-library.vercel.app",
  "https://smart-hybrid-library-iu1n5n9yn-project-52c1.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
      process.env.CLIENT_URL,
    ].filter(Boolean),
    credentials: true,
  })
);




app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

let dbPromise;

const connectDB = async () => {
  if (!dbPromise) {
    dbPromise = configureDB().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
};


app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failed:", err.message);
    res.status(503).json({
      success: false,
      message: "Database connection failed",
    });
  }
});
// ── REST Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/libraries", libraryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/rent", rentRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/library-transactions", libraryTransactionRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "⚡ Smart Library API is running!",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      books: "/api/books",
      requests: "/api/requests",
      libraries: "/api/libraries",
      nearbyBooks: "/api/books/nearby?lat=&lng=&radius=5",
    },
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error.",
  });
});




export default app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;

  const start = async () => {
    try {
      await connectDB();
      httpServer.listen(PORT, () => {
        console.log(`Smart Library API running on port ${PORT}`);
        setupCronJobs();
      });
    } catch (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
  };

  start();
}
