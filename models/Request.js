// ============================================
// Request Model - Borrow/Rent Request Lifecycle
// ============================================
import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "ownerTypeModel",
    },
    ownerTypeModel: {
      type: String,
      required: true,
      enum: ["User", "Library"],
      default: "User",
    },
    borrowerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["buy", "rent"],
      default: "buy",
    },
    status: {
      type: String,
      enum: ["REQUESTED", "ACCEPTED", "REJECTED", "OTP_VERIFIED", "RENTED", "RETURN_PENDING", "RETURNED", "COMPLETED"],
      default: "REQUESTED",
    },
    rentDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
    },
    fine: {
      type: Number,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    otp: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    ownerLocation: {
      lat: Number,
      lng: Number,
    },
    borrowerLocation: {
      lat: Number,
      lng: Number,
    }
  },
  { timestamps: true }
);

const Request = mongoose.model("Request", requestSchema);
export default Request;
