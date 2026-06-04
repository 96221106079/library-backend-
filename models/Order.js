import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "LibraryBook", required: true },
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: "Library", default: null },
  libraryName: { type: String, trim: true },
  type: {
    type: String,
    enum: ["rent", "buy", "borrow"], // Added borrow to enum if needed, though rent is used
    required: true
  },
  status: {
    type: String,
    enum: ["REQUESTED", "ACCEPTED", "VERIFIED", "DELIVERED", "RETURNED", "CANCELLED", "pending", "issued"],
    default: "REQUESTED"
  },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  dueDate: { type: Date },
  issuedAt: { type: Date },
  returnedAt: { type: Date },
  fineAmount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
