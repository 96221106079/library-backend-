import express from "express";
import { addReview, getReviews } from "../controllers/reviewController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/:bookId", authMiddleware, addReview);
router.get("/:bookId", getReviews);

export default router;
