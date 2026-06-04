// ============================================
// eventController.js - Community Events API Logic
// ============================================
import Event from "../models/Event.js";
import User from "../models/User.js";
import { haversineDistance, formatDistance } from "../utils/haversine.js";
import { sendEmail } from "../utils/sendEmail.js";
import { getEventRegistrationTemplate } from "../utils/emailTemplates.js";

// ── GET /api/events ─────────────────────────────────────────────────────────
// Retrieve all events, supports filters (category, nearby geolocation, my-events)
// ────────────────────────────────────────────────────────────────────────────
export const getEvents = async (req, res) => {
  try {
    const { lat, lng, radius = 20, category, myEvents, myOrganized } = req.query;
    const userId = req.user.id;

    let filter = {};

    // 1. Category filter
    if (category) {
      filter.category = category;
    }

    // 2. "My Events" (events joined by logged-in user)
    if (myEvents === "true") {
      filter["attendees.userId"] = userId;
    }

    // 3. "My Organized Events" (events created by logged-in librarian)
    if (myOrganized === "true") {
      filter.organizerId = userId;
    }

    let events;

    // 4. Geolocation proximity search (Nearby Events)
    if (lat && lng) {
      const uLat = parseFloat(lat);
      const uLng = parseFloat(lng);
      const radiusMeters = (parseFloat(radius) || 20) * 1000;

      // When querying nearby, we can use MongoDB $near query if a 2dsphere index exists
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [uLng, uLat],
          },
          $maxDistance: radiusMeters,
        },
      };

      events = await Event.find(filter)
        .populate("organizerId", "name email username")
        .populate("libraryId", "name location");
    } else {
      // Regular lookup sorted by upcoming date
      events = await Event.find(filter)
        .populate("organizerId", "name email username")
        .populate("libraryId", "name location")
        .sort({ dateTime: 1 });
    }

    // Add proximity labels if user location is supplied
    if (lat && lng) {
      const uLat = parseFloat(lat);
      const uLng = parseFloat(lng);

      events = events.map((event) => {
        const eventObj = event.toObject();
        if (eventObj.location && eventObj.location.coordinates) {
          const eLng = eventObj.location.coordinates[0];
          const eLat = eventObj.location.coordinates[1];
          const distKm = haversineDistance(uLat, uLng, eLat, eLng);
          eventObj.distanceKm = distKm;
          eventObj.distanceLabel = formatDistance(distKm);
        }
        return eventObj;
      });
    }

    res.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("[getEvents] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/events/:id ─────────────────────────────────────────────────────
// Retrieve a single event details
// ────────────────────────────────────────────────────────────────────────────
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id)
      .populate("organizerId", "name email username")
      .populate("libraryId", "name location");

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("[getEventById] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/events ────────────────────────────────────────────────────────
// Create a new event (restricted to librarian/admin)
// ────────────────────────────────────────────────────────────────────────────
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      banner,
      dateTime,
      venue,
      lat,
      lng,
      libraryId,
      libraryName,
      maxAttendees,
    } = req.body;

    const organizerId = req.user.id;

    if (!title || !description || !category || !dateTime || !venue || lat === undefined || lng === undefined) {
      return res.status(400).json({
        success: false,
        message: "Title, description, category, date/time, venue, lat and lng are required.",
      });
    }

    // Set high-quality defaults for banner if not supplied based on category
    let finalBanner = banner;
    if (!finalBanner) {
      switch (category) {
        case "Reading competition":
          finalBanner = "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600";
          break;
        case "Workshop":
          finalBanner = "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=600";
          break;
        case "Seminar":
          finalBanner = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600";
          break;
        case "Book fair":
          finalBanner = "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=600";
          break;
        case "Coding event":
          finalBanner = "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=600";
          break;
        default:
          finalBanner = "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=600";
      }
    }

    const newEvent = await Event.create({
      title,
      description,
      category,
      banner: finalBanner,
      dateTime: new Date(dateTime),
      venue,
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      libraryId: libraryId || null,
      libraryName: libraryName || "",
      organizerId,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : 100,
      attendees: [],
    });

    res.status(201).json({
      success: true,
      message: "Event created successfully!",
      event: newEvent,
    });
  } catch (error) {
    console.error("[createEvent] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── PUT /api/events/:id ─────────────────────────────────────────────────────
// Update event details (restricted to organizer or admin)
// ────────────────────────────────────────────────────────────────────────────
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      banner,
      dateTime,
      venue,
      lat,
      lng,
      libraryId,
      libraryName,
      maxAttendees,
    } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    // Authorization: only creator or admin
    if (event.organizerId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this event.",
      });
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (category) event.category = category;
    if (banner) event.banner = banner;
    if (dateTime) event.dateTime = new Date(dateTime);
    if (venue) event.venue = venue;
    if (lat !== undefined && lng !== undefined) {
      event.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
    }
    if (libraryId !== undefined) event.libraryId = libraryId;
    if (libraryName !== undefined) event.libraryName = libraryName;
    if (maxAttendees !== undefined) event.maxAttendees = parseInt(maxAttendees);

    await event.save();

    res.json({
      success: true,
      message: "Event updated successfully!",
      event,
    });
  } catch (error) {
    console.error("[updateEvent] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── DELETE /api/events/:id ──────────────────────────────────────────────────
// Delete event (restricted to organizer or admin)
// ────────────────────────────────────────────────────────────────────────────
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    // Authorization check
    if (event.organizerId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this event.",
      });
    }

    await Event.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Event deleted successfully!",
    });
  } catch (error) {
    console.error("[deleteEvent] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/events/:id/join ───────────────────────────────────────────────
// User registers / joins an event
// ────────────────────────────────────────────────────────────────────────────
export const joinEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { fullName, email } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    // Check if user already registered
    if (event.attendees.some(att => (att.userId || att).toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: "You have already registered for this event.",
      });
    }

    // Check if max capacity reached
    if (event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({
        success: false,
        message: "This event has reached maximum capacity.",
      });
    }

    event.attendees.push({
      userId,
      fullName: fullName || "Attendee",
      email: email || "",
    });
    await event.save();

    // Send Email Notification to User
    try {
      const user = await User.findById(userId);
      const userEmail = email || user?.email;
      if (userEmail) {
        const userName = fullName || user?.name || user?.username || "Attendee";
        const eventDate = new Date(event.dateTime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const emailContent = getEventRegistrationTemplate(userName, event.title, eventDate);
        await sendEmail(userEmail, "Event Registration Successful", emailContent);
      }
    } catch (emailErr) {
      console.error("Failed to send event registration email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "Successfully registered for the event! 🎉",
      attendeesCount: event.attendees.length,
    });
  } catch (error) {
    console.error("[joinEvent] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/events/:id/leave ──────────────────────────────────────────────
// User unregisters / leaves an event
// ────────────────────────────────────────────────────────────────────────────
export const leaveEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    // Check if user is registered
    if (!event.attendees.some(att => (att.userId || att).toString() === userId)) {
      return res.status(400).json({
        success: false,
        message: "You are not registered for this event.",
      });
    }

    event.attendees = event.attendees.filter((att) => (att.userId || att).toString() !== userId);
    await event.save();

    res.json({
      success: true,
      message: "Successfully cancelled your registration.",
      attendeesCount: event.attendees.length,
    });
  } catch (error) {
    console.error("[leaveEvent] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
