import mongoose from "mongoose";

const libraryBookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  image: { type: String }, // Base64 or URL
  // MongoDB-backed libraries use ObjectId; OSM libraries use libraryName string
  libraryId: { type: mongoose.Schema.Types.ObjectId, ref: "Library", default: null },
  libraryName: { type: String, trim: true, default: "" },
  totalCopies: { type: Number, default: 1 },
  availableCopies: { type: Number, default: 1 },
  rentPrice: { type: Number, default: 0 },
  buyPrice: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  status: {
    type: String,
    enum: ["available", "borrowed", "rented"],
    default: "available",
  },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  category: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// For fast lookup by library
libraryBookSchema.index({ libraryId: 1 });
libraryBookSchema.index({ libraryName: 1 });

const LibraryBook = mongoose.model("LibraryBook", libraryBookSchema);
export default LibraryBook;
