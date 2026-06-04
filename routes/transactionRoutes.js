// ============================================
// transactionRoutes.js - P2P Transaction Endpoints
// ============================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createRequest,
  buyBook,
  rentBook,
  acceptTransaction,
  rejectTransaction,
  verifyOtp,
  deliverTransaction,
  returnBook,
  getMyTransactions,
} from "../controllers/transactionController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// -- 1. Create Request --
router.post("/request", createRequest);
router.post("/buy", buyBook);
router.post("/rent", rentBook);

// -- 2. Accept Request --
router.post("/accept/:id", acceptTransaction);

// -- 3. Reject Request --
router.post("/reject/:id", rejectTransaction);

// -- 4. Verify OTP (For Borrowers) --
router.post("/verify-otp", verifyOtp);

// -- 5. Confirm Delivery (For Owners) --
router.post("/deliver/:id", deliverTransaction);

// -- 6. Return Book --
router.post("/return", returnBook);

// -- 7. Get My Transactions --
router.get("/my", getMyTransactions);

export default router;