// ============================================
// Library.js - Official Library Model
// ============================================
import mongoose from "mongoose";

const librarySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    address: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=400",
    },
    librarianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

librarySchema.index({ location: "2dsphere" });

const Library = mongoose.model("Library", librarySchema);
export default Library;
