// ============================================
// eventRoutes.js - Express Router for Events
// ============================================
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import checkRole from "../middleware/roleMiddleware.js";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  joinEvent,
  leaveEvent,
} from "../controllers/eventController.js";

const router = express.Router();

// Require authentication for all events endpoints
router.use(authMiddleware);

// Publicly browse events (within the system)
router.get("/", getEvents);
router.get("/:id", getEventById);

// Registration/Join endpoints
router.post("/:id/join", joinEvent);
router.post("/:id/leave", leaveEvent);

// Librarian & Admin event management endpoints
router.post("/", checkRole(["librarian", "admin"]), createEvent);
router.put("/:id", checkRole(["librarian", "admin"]), updateEvent);
router.delete("/:id", checkRole(["librarian", "admin"]), deleteEvent);

export default router;
