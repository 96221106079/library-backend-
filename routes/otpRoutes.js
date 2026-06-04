import express from "express";
import { generateOtp, verifyOtp } from "../controllers/otpController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate", authMiddleware, generateOtp);
router.post("/verify", authMiddleware, verifyOtp);

export default router;
