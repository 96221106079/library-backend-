import mongoose from "mongoose";

const rentalSchema = new mongoose.Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    renterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["REQUESTED", "ACCEPTED", "VERIFIED", "RENTED", "RETURNED", "COMPLETED"],
      default: "REQUESTED",
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpiry: {
      type: Date,
      default: null,
    },
    rentDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    fine: {
      type: Number,
      default: 0,
    },
    ownerLocation: {
      lat: Number,
      lng: Number,
    },
    borrowerLocation: {
      lat: Number,
      lng: Number,
    },
  },
  { timestamps: true }
);

const Rental = mongoose.model("Rental", rentalSchema);
export default Rental;
