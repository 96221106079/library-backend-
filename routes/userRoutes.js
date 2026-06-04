// ============================================
// User Routes - Profile & Location Management
// ============================================

import express from "express";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/roleMiddleware.js";

const router = express.Router();

// @route   PUT /api/users/location
// @desc    Update user location (GeoJSON)
// @access  Private
router.put("/location", authMiddleware, async (req, res) => {
  try {
    const { lat, lng, address, country } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude are required.",
      });
    }

    const updateData = {
      $set: {
        location: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)], // GeoJSON: [lng, lat]
        }
      }
    };
    if (address) updateData.$set.address = address;
    if (country) updateData.$set.country = country;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { returnDocument: 'after' });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({
      success: true,
      message: "Location updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        address: user.address,
        country: user.country,
        location: user.location,
      },
    });
  } catch (error) {
    console.error("Location Update Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during location update.",
    });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private/Admin
router.get("/", authMiddleware, checkRole(["admin"]), async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users/profile
// @desc    Get current logged-in user's full profile (including location)
// @access  Private
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


export default router;
