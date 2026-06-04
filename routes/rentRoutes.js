import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  requestRental,
  acceptRental,
  verifyRental,
  startRental,
  returnRental,
  completeRental,
  getMyRentals,
  updateRentalLocation
} from "../controllers/rentController.js";

const router = express.Router();

router.post("/request", authMiddleware, requestRental);
router.post("/accept", authMiddleware, acceptRental);
router.post("/verify", authMiddleware, verifyRental);
router.post("/start", authMiddleware, startRental);
router.post("/return", authMiddleware, returnRental);
router.post("/complete", authMiddleware, completeRental);
router.get("/my", authMiddleware, getMyRentals);
router.put("/:id/location", authMiddleware, updateRentalLocation);

export default router;
