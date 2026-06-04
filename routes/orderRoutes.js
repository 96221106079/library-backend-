import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { createOrder, returnOrder } from "../controllers/orderController.js";

const router = express.Router();

router.post("/", authMiddleware, createOrder);
router.put("/:id/return", authMiddleware, returnOrder);

export default router;
