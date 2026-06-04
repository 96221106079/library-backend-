// ============================================
// bookRoutes.js - Upgraded to use controller
// ============================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addBook,
  getAllBooks,
  getNearbyBooks,
  getNearbyUserBooks,
  getNearbyLibraryBooks,
  getBookById,
  updateBook,
  deleteBook,
  getMyBooks,
  getMyActivity,
  rentBook,
  returnBook,
  addRating,
  addReview,
  addComment,
} from "../controllers/bookController.js";
import OTP from "../models/OTP.js";
import Book from "../models/Book.js";
import { listBook, verifyOtp } from "../controllers/reviewController.js";

const router = express.Router();

// ── Core CRUD ─────────────────────────────────────
router.post("/add", authMiddleware, addBook);
router.get("/", getAllBooks);
router.get("/nearby", getNearbyBooks);  // ?lat=&lng=&radius=5
router.get("/nearby-users", getNearbyUserBooks);
router.get("/nearby-libraries", getNearbyLibraryBooks);
router.get("/my-books", authMiddleware, getMyBooks);
router.get("/activity", authMiddleware, getMyActivity);
router.get("/:id", getBookById);
router.put("/:id", authMiddleware, updateBook);
router.delete("/:id", authMiddleware, deleteBook);

// ── Transactions & Interactions ───────────────────
router.post("/:id/rent", authMiddleware, rentBook);
router.put("/:id/return", authMiddleware, returnBook);
router.post("/:id/rating", authMiddleware, addRating);
router.post("/:id/review", authMiddleware, addReview);
router.post("/:id/comment", authMiddleware, addComment);

// ── Legacy OTP flow (kept for backwards compat) ───
// POST /api/books/:id/request-otp
router.post("/:id/request-otp", authMiddleware, async (req, res) => {
  try {
    const { type } = req.body;
    const book = await Book.findById(req.params.id);
    if (!book || book.status !== "available") {
      return res.status(400).json({ success: false, message: "Book is not available." });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await OTP.create({ code, bookId: book._id, requesterId: req.user.id, type: type || "buy" });
    res.json({ success: true, message: "OTP generated!", code });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/books/:id/verify-p2p
router.post("/:id/verify-p2p", authMiddleware, async (req, res) => {
  try {
    const { otp } = req.body;
    const book = await Book.findById(req.params.id);
    const otpDoc = await OTP.findOne({ bookId: book._id, code: otp, requesterId: req.user.id });
    if (!otpDoc) return res.status(400).json({ success: false, message: "Invalid OTP." });
    const statusMap = { buy: "sold", rent: "rented" };
    book.status = statusMap[otpDoc.type] || "sold";
    book.borrower = req.user.id;
    await book.save();
    await OTP.deleteOne({ _id: otpDoc._id });
    res.json({ success: true, message: `Handover done. Book is ${book.status}.`, status: book.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Rent/Borrow Listing ─────────────────────────
router.post("/list", authMiddleware, listBook);
router.post("/verify-otp", authMiddleware, verifyOtp);

export default router;
