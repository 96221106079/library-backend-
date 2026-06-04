// ============================================
// requestRoutes.js
// ============================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  purchaseRequest,
  acceptRequest,
  rejectRequest,
  getMyRequests,
  verifyRequest,
  verifyOtp,
  confirmHandover,
  returnBook,
  completeRequest,
} from "../controllers/requestController.js";

const router = express.Router();

// POST /api/requests/buy — buyer initiates
router.post("/buy", authMiddleware, purchaseRequest);

// ACCEPT & REJECT (Multiple methods/paths for flexibility)
router.post("/accept", authMiddleware, acceptRequest);
router.post("/reject", authMiddleware, rejectRequest);

// Specific PUT routes as requested
router.put("/:id/accept", authMiddleware, acceptRequest);
router.put("/:id/reject", authMiddleware, rejectRequest);

// POST /api/requests/verify-otp — owner enters OTP
router.post("/verify-otp", authMiddleware, verifyOtp);

// PUT /api/requests/:id/confirm-handover — owner confirms delivery after OTP
router.put("/:id/confirm-handover", authMiddleware, confirmHandover);

// POST /api/requests/verify — borrower submits OTP (Legacy)
router.post("/verify", authMiddleware, verifyRequest);

// ── Return Flow ──
router.post("/:id/return", authMiddleware, returnBook);
router.post("/:id/complete", authMiddleware, completeRequest);

// GET  /api/request/my-requests — both parties
router.get("/my-requests", authMiddleware, getMyRequests);

export default router;
