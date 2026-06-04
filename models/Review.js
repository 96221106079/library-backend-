import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

// One review per user per book
reviewSchema.index({ bookId: 1, userId: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
