// ============================================
// libraryTransactionRoutes.js - User -> Library Endpoints
// ============================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  requestLibraryRent,
  getIncomingLibraryTransactions,
  acceptLibraryTransaction,
  rejectLibraryTransaction,
  verifyLibraryOtp,
  deliverLibraryTransaction,
  getMyLibraryTransactions
} from "../controllers/libraryTransactionController.js";

const router = express.Router();

router.use(authMiddleware);

// -- 1. User initiates rent request to library --
router.post("/request", requestLibraryRent);

// -- 2. Librarian fetches incoming requests --
router.get("/incoming", getIncomingLibraryTransactions);

// -- 3. Librarian accepts (generates OTP) --
router.post("/accept/:id", acceptLibraryTransaction);

// -- 4. Librarian rejects --
router.post("/reject/:id", rejectLibraryTransaction);

// -- 5. User verifies OTP --
router.post("/verify-otp", verifyLibraryOtp);

// -- 6. Librarian confirms physical delivery --
router.post("/deliver/:id", deliverLibraryTransaction);

// -- 7. User history --
router.get("/my", getMyLibraryTransactions);

export default router;
