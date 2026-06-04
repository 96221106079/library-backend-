// ============================================
// Authentication Routes
// ============================================
// Defines all authentication-related API endpoints.
// Routes are organized following RESTful conventions.

import express from "express";
import { registerUser, loginUser, getUserProfile, googleLogin } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// ---- Public Routes (No authentication required) ----

// @route   POST /api/auth/register
// @desc    Register a new user account
// @access  Public
router.post("/register", registerUser);

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT token
// @access  Public
router.post("/login", loginUser);

// @route   POST /api/auth/google
// @desc    Google login
// @access  Public
router.post("/google", googleLogin);

// ---- Protected Routes (JWT token required) ----

// @route   GET /api/auth/profile
// @desc    Get logged-in user's profile information
// @access  Private
router.get("/profile", authMiddleware, getUserProfile);

export default router;
