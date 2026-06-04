// ============================================
// User Model - Mongoose Schema Definition
// ============================================
// Defines the User schema with all required fields
// for the Smart Hybrid Library authentication system.

import mongoose from "mongoose";

/**
 * User Schema
 * - firstName: User's first name (required)
 * - lastName: User's last name (required)
 * - username: Unique username for display (required)
 * - email: Unique email address for login (required)
 * - password: Hashed password string (required)
 * - createdAt: Timestamp of account creation (auto-generated)
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
  },

  username: {
    type: String,
    required: [true, "Username is required"],
    trim: true,
  },

  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
  },

  password: {
    type: String,
    required: false, // Optional for Google Auth users
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  upiId: {
    type: String,
    required: false,
    trim: true,
  },

  country: {
    type: String,
    trim: true,
  },

  address: {
    type: String,
    trim: true,
  },

  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
  },

  // Socket.io connection ID for real-time tracking
  socketId: {
    type: String,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add 2dsphere index for location-based searches
userSchema.index({ location: "2dsphere" });

// Create and export the User model
const User = mongoose.model("User", userSchema);

export default User;