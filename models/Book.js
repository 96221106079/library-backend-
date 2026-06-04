// ============================================
// Book Model - Mongoose Schema Definition
// ============================================
import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Book title is required"],
    trim: true,
  },
  author: {
    type: String,
    required: [true, "Author name is required"],
    trim: true,
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["Education", "Technology", "Fiction", "Non-Fiction", "Biography", "Science", "History", "Business", "Health"],
  },
  ownerType: {
    type: String,
    enum: ["user", "library"],
    default: "user",
    required: true,
  },

  image: {
    type: String,
    default: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400",
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    // Not required at schema level because it could be a library book
  },
  libraryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Library",
    // For institutional books
  },
  ownerTypeModel: {
    type: String,
    enum: ["User", "Library"],
    default: "User",
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  dueDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["available", "requested", "out_for_delivery", "purchased", "rented", "sold"],
    default: "available",
  },
  ownershipStatus: {
    type: String,
    enum: ["owned", "temporary"],
    default: "owned",
  },
  ratings: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rating: { type: Number, min: 1, max: 5 },
    }
  ],
  averageRating: { type: Number, default: 0 },
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: { type: String }
    }
  ],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      message: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },

  availabilityType: {
    type: String,
    enum: ["both", "buy", "rent"],
    default: "both",
  },
  availableForBuy: {
    type: Boolean,
    default: false,
  },
  availableForRent: {
    type: Boolean,
    default: false,
  },
  buyPrice: {
    type: Number,
    default: null,
  },
  rentPrice: {
    type: Number,
    default: null,
  },
  rentDuration: {
    type: Number,
    default: 7,
  }
});

const Book = mongoose.model("Book", bookSchema);
export default Book;
