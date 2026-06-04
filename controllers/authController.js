import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "hybrid_library_jwt_secret_key_2024";

// JWT token expiration time
const JWT_EXPIRES_IN = "7d";



export const registerUser = async (req, res) => {
  try {

    const { name, username, email, password, confirmPassword } = req.body;


    if (!name || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required. Please fill in every field.",
      });
    }

    //  Check if password and confirmPassword match
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match. Please try again.",
      });
    }

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Step 5: Hash the password using bcrypt with 12 salt rounds
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Step 6: Create a new User document and save to MongoDB
    const user = new User({
      name,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "user"
    });

    await user.save();

    // Step 7: Return success response (no sensitive data)
    res.status(201).json({
      success: true,
      message: "Registration successful! You can now log in.",
    });
  } catch (error) {
    console.error("Registration Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during registration. Please try again later.",
    });
  }
};


export const loginUser = async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password.",
      });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        address: user.address,
        country: user.country,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error during login. Please try again later.",
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    // req.user is set by the auth middleware after token verification
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};


export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    console.log("Attempting Google Login verification...");
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    // Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    console.log("Google Token Verified. Payload email:", payload.email);
    const { sub: googleId, email, name, picture } = payload;

    // Find user by Google ID or Email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    if (!user) {
      const baseUsername = email.split('@')[0];
      const username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;

      user = new User({
        name,
        username,
        email: email.toLowerCase(),
        googleId,
        role: "user",

      });
      await user.save();
    } else if (!user.googleId) {
      // Link Google ID to existing email account
      user.googleId = googleId;
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      success: true,
      message: "Google login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        address: user.address,
        country: user.country,
        location: user.location,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("CRITICAL: Google Login Error:", error);
    res.status(500).json({
      success: false,
      message: `Google Login Error: ${error.message}${error.code === 11000 ? " (Database Conflict - Duplicate Email/ID)" : ""}`,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};