import mongoose from "mongoose";

const rentSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    fine: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "returned"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Rent = mongoose.model("Rent", rentSchema);
export default Rent;
