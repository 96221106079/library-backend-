// ============================================
// libraryRoutes.js - Institutional API Endpoints
// ============================================
import express from "express";
import {
  getNearbyLibraries, getLibraries, getLibraryBooks, createLibrary,
  createLibraryOrder, verifyLibraryOtp, getBooksByLibraryName, getMyLibraryOrders,
} from "../controllers/libraryController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ── Standard Library Endpoints ─────────────────────
// Standard List
router.get("/", getLibraries);

// My Orders
router.get("/my-orders", authMiddleware, getMyLibraryOrders);

// Publicly readable institutional locations
router.get("/nearby", getNearbyLibraries);

// Books by library NAME (for OSM libraries) — MUST be before /:id/books
router.get("/books-by-name", getBooksByLibraryName);

// Books catalogue by ID (auto-seeds 20 if empty)
router.get("/:id/books", getLibraryBooks);

// Borrow/Rent flow — requires auth
router.post("/orders", authMiddleware, createLibraryOrder);
router.post("/orders/:id/verify", authMiddleware, verifyLibraryOtp);

// Admin-only seed
router.post("/", createLibrary);

export default router;
