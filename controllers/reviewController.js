import Review from "../models/Review.js";
import Book from "../models/Book.js";

// POST /api/reviews/:bookId
export const addReview = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { rating, review, feedback } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    // Upsert: update if exists, create if not
    const result = await Review.findOneAndUpdate(
      { bookId, userId },
      { rating, review, feedback },
      { upsert: true, returnDocument: 'after' }
    ).populate("userId", "name username");

    res.status(200).json({ success: true, message: "Review saved!", review: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/reviews/:bookId
export const getReviews = async (req, res) => {
  try {
    const { bookId } = req.params;
    const reviews = await Review.find({ bookId })
      .populate("userId", "name username")
      .sort({ createdAt: -1 });

    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    res.json({ success: true, reviews, averageRating: avg, count: reviews.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/books/list
export const listBook = async (req, res) => {
  try {
    const { bookId, availableForRent, availableForBuy, location } = req.body;
    const userId = req.user.id;

    const book = await Book.findById(bookId);

    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found." });
    }

    if (book.owner.toString() !== userId) {
      return res.status(403).json({ success: false, message: "You are not the owner of this book." });
    }

    book.availableForRent = availableForRent;
    book.availableForBuy = availableForBuy;
    book.location = location;

    await book.save();
    console.log("=== LIST BOOK - Saved Book ===", { title: book.title, availableForRent: book.availableForRent, availableForBuy: book.availableForBuy });

    res.status(200).json({ success: true, message: "Book listed successfully!", book });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/books/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { otp, bookId, borrowerId } = req.body;
    const userId = req.user.id;

    // Logic to verify OTP between owner and borrower
    const isValidOtp = await verifyOtpLogic(userId, borrowerId, otp);

    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    res.status(200).json({ success: true, message: "OTP verified successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
