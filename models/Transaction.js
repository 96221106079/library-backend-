import mongoose from "mongoose";

// ============================================
// Transaction Model - Borrow / Rent Lifecycle
// ============================================
// Tracks the full lifecycle of a book transaction:
//   pending → accepted (OTP generated) → completed (OTP verified) → returned
//   pending → rejected

const transactionSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book", // Unified reference for P2P and Library (if Book model handles both)
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  type: {
    type: String,
    enum: ["buy", "rent"],
    required: true,
  },
  status: {
    type: String,
    enum: ["requested", "accepted", "rejected", "otp_verified", "delivered", "returned"],
    default: "requested",
  },
  timeline: [
    {
      status: { type: String },
      timestamp: { type: Date, default: Date.now },
      message: { type: String },
    }
  ],
  otp: {
    type: String,
    default: null,
  },
  otpExpiry: {
    type: Date,
    default: null,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  issuedAt: {
    type: Date,
    default: null,
  },
  returnedAt: {
    type: Date,
    default: null,
  },
  fineAmount: {
    type: Number,
    default: 0,
  },
  // Location snapshot at time of request (Optional for P2P)
  userLocation: {
    lat: { type: Number },
    lng: { type: Number },
  },
  libraryName: {
    type: String, // Kept for hybrid compatibility
    default: null,
  },
  isLibrary: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Index for fast lookups
transactionSchema.index({ requesterId: 1, status: 1 });
transactionSchema.index({ ownerId: 1, status: 1 });
transactionSchema.index({ bookId: 1, status: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;

