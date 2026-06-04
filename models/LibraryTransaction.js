import mongoose from "mongoose";

// ============================================
// LibraryTransaction Model - User -> Library Rent Flow
// ============================================
// Tracks books rented by users TO libraries.

const libraryTransactionSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // The owner of the book (lender)
    required: true,
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library", // The recipient (institutional renter)
    required: true,
  },
  type: {
    type: String,
    enum: ["rent_to_library"],
    default: "rent_to_library",
  },
  status: {
    type: String,
    enum: ["requested", "accepted", "rejected", "otp_verified", "delivered", "returned"],
    default: "requested",
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpiry: {
    type: Date,
    default: null,
  },
  timeline: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
      message: { type: String },
    }
  ],
  deliveredAt: {
    type: Date,
    default: null,
  },
  returnedAt: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

// Index for fast lookups
libraryTransactionSchema.index({ userId: 1, status: 1 });
libraryTransactionSchema.index({ libraryId: 1, status: 1 });
libraryTransactionSchema.index({ bookId: 1, status: 1 });

const LibraryTransaction = mongoose.model("LibraryTransaction", libraryTransactionSchema);
export default LibraryTransaction;
