// ============================================
// Event.js - Mongoose Schema for Library Events
// ============================================
import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "Reading competition",
        "Workshop",
        "Seminar",
        "Book fair",
        "Coding event",
        "Other",
      ],
      required: [true, "Event category is required"],
    },
    banner: {
      type: String,
      default: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=600",
    },
    dateTime: {
      type: Date,
      required: [true, "Event date and time is required"],
    },
    venue: {
      type: String,
      required: [true, "Event venue is required"],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, "Event coordinates are required"],
      },
    },
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      default: null,
    },
    libraryName: {
      type: String,
      default: "",
    },
    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attendees: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        fullName: String,
        email: String,
        registeredAt: { type: Date, default: Date.now }
      },
    ],
    maxAttendees: {
      type: Number,
      default: 100,
    },
  },
  { timestamps: true }
);

// Add 2dsphere index for location-based nearby event queries
eventSchema.index({ location: "2dsphere" });

const Event = mongoose.model("Event", eventSchema);
export default Event;
