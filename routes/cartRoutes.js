// ============================================
// cartRoutes.js - Shopping Cart Management
// ============================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
  checkout,
} from "../controllers/cartController.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get("/", getCart);
router.post("/add", addToCart);
router.delete("/:bookId", removeFromCart);
router.delete("/", clearCart);
router.post("/checkout", checkout);

export default router;
