import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getMyNotifications,
  markNotificationsRead,
  getUnreadCount,
  testEmail
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/my", authMiddleware, getMyNotifications);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.put("/mark-read", authMiddleware, markNotificationsRead);
router.get("/test-email", testEmail); // Public endpoint for testing

export default router;
