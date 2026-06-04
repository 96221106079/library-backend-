import Request from "../models/Request.js";
import Book from "../models/Book.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { generateOtpSync } from "../utils/generateOtp.js";
import { sendEmail } from "../utils/sendEmail.js";
import { getBorrowRequestTemplate, getRequestAcceptedTemplate } from "../utils/emailTemplates.js";

// Helper to create notification
const createNotify = async (userId, message, type = "INFO") => {
  try {
    await Notification.create({ userId, message, type });
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};

// POST /api/requests/buy — buyer initiates a request
export const purchaseRequest = async (req, res) => {
  try {
    const { bookId, type } = req.body; // type is "buy" or "rent"
    const borrowerId = req.user.id;

    if (!bookId) {
      return res.status(400).json({ success: false, message: "bookId is required" });
    }

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    let ownerId;
    let ownerTypeModel = "User";

    if (book.ownerType === "user") {
      ownerId = book.ownerId || book.owner;
      ownerTypeModel = "User";
    } else if (book.ownerType === "library") {
      ownerId = book.libraryId;
      ownerTypeModel = "Library";
    }

    if (!ownerId) {
      return res.status(400).json({ 
        success: false, 
        message: "Owner not found." 
      });
    }

    if (ownerId.toString() === borrowerId) {
      return res.status(400).json({ success: false, message: "This is your own book!" });
    }

    if (book.status !== "available" && book.status !== "requested") {
      return res.status(400).json({
        success: false,
        message: `Oops! This book is currently ${book.status}.`,
      });
    }

    // ── availability guard ────────────────────────────────────────
    if (type === "buy" && !book.availableForBuy) {
      return res.status(400).json({
        success: false,
        message: "This book is listed for rent only and cannot be purchased.",
      });
    }
    if (type === "rent" && !book.availableForRent) {
      return res.status(400).json({
        success: false,
        message: "This book is listed for purchase only and cannot be rented.",
      });
    }
    // ─────────────────────────────────────────────────────────────────

    const request = await Request.create({
      bookId,
      ownerId,
      ownerTypeModel,
      borrowerId,
      type: type || "buy",
      status: "REQUESTED",
    });

    book.status = "requested";
    await book.save();

    await createNotify(ownerId, `New request received for your book: ${book.title}`, "REQUEST");

    // Send Email Notification
    try {
      let ownerEmail, ownerName;
      if (ownerTypeModel === "User") {
        const ownerUser = await User.findById(ownerId);
        if (ownerUser) {
          ownerEmail = ownerUser.email;
          ownerName = ownerUser.name || ownerUser.username;
        }
      } else if (ownerTypeModel === "Library") {
        const Library = (await import("../models/Library.js")).default;
        const library = await Library.findById(ownerId);
        if (library) {
          ownerEmail = library.contactEmail || library.email;
          ownerName = library.name;
        }
      }
      if (ownerEmail) {
        const requester = await User.findById(borrowerId);
        const requesterName = requester ? (requester.name || requester.username) : "A user";
        const emailContent = getBorrowRequestTemplate(ownerName, requesterName, book.title);
        await sendEmail(ownerEmail, "New Borrow Request", emailContent);
      }
    } catch (emailErr) {
      console.error("Failed to send borrow request email:", emailErr.message);
    }

    res.status(201).json({ success: true, message: "Request sent to owner!", request });
  } catch (error) {
    console.error("[PURCHASE] ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST/PUT /api/requests/:id/accept — owner accepts
export const acceptRequest = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.requestId;
    const { ownerLocation } = req.body; // Owner passes their loc on accept

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    if (request.status !== "REQUESTED") {
      return res.status(400).json({ success: false, message: `Request already processed.` });
    }

    if (request.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    // Fetch borrower's last known location
    const borrower = await User.findById(request.borrowerId);
    const borrowerLocation = borrower?.location?.coordinates
      ? { lat: borrower.location.coordinates[1], lng: borrower.location.coordinates[0] }
      : null;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    request.otp = otp;
    request.status = "ACCEPTED";
    request.expiresAt = null; // No expiration as requested
    
    // Store locations for tracking
    if (ownerLocation) request.ownerLocation = ownerLocation;
    if (borrowerLocation) request.borrowerLocation = borrowerLocation;

    await request.save();

    await createNotify(request.borrowerId, `Owner accepted your request for book! Check Activity for the OTP.`, "ACCEPTED");

    // Send Email Notification to Borrower
    try {
      if (borrower && borrower.email) {
        const book = await Book.findById(request.bookId);
        const bookName = book ? book.title : "Requested Book";
        const borrowerName = borrower.name || borrower.username;
        const emailContent = getRequestAcceptedTemplate(borrowerName, bookName);
        await sendEmail(borrower.email, "Request Approved", emailContent);
      }
    } catch (emailErr) {
      console.error("Failed to send request accepted email:", emailErr.message);
    }

    // NOTE: We do NOT send the OTP back to the owner anymore. 
    // The borrower will see it on their screen.
    res.json({ success: true, message: "Request accepted! Borrower will show you the OTP." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST/PUT /api/requests/:id/reject — owner rejects request
export const rejectRequest = async (req, res) => {
  try {
    const requestId = req.params.id || req.body.requestId;
    if (!requestId) return res.status(400).json({ success: false, message: "requestId is required" });

    const request = await Request.findById(requestId).populate("bookId");

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    if (request.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized. Only the owner can reject." });
    }

    request.status = "REJECTED";
    await request.save();

    // Unlock book
    if (request.bookId) {
      request.bookId.status = "available";
      await request.bookId.save();
    }

    await createNotify(request.borrowerId, `Owner rejected your request for book.`, "REJECTED");

    res.json({ success: true, message: "Request rejected." });
  } catch (error) {
    console.error("[REJECT]", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/requests/verify-otp — OWNER enters OTP provided by Borrower
export const verifyOtp = async (req, res) => {
  try {
    const { requestId, otp } = req.body;
    const currentUserId = req.user.id;

    if (!requestId || !otp) {
      return res.status(400).json({ success: false, message: "Request ID and OTP are required" });
    }

    const request = await Request.findById(requestId).populate("bookId");
    if (!request) {
      console.error(`[VERIFY_OTP] Request not found: ${requestId}`);
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // ONLY the Owner enters the OTP provided by the Buyer/Borrower
    if (request.ownerId.toString() !== currentUserId) {
      console.error(`[VERIFY_OTP] Unauthorized access attempt by ${currentUserId} on request ${requestId}`);
      return res.status(403).json({ success: false, message: "Only the owner can verify the handover OTP." });
    }

    // Debugging logs to help identify the 400 error cause
    console.log(`[VERIFY_OTP] Checking Request ${requestId}: Status=${request?.status}, InboundOTP=${otp}, DB_OTP=${request?.otp}`);

    // Case-insensitive status check
    if (request.status?.toUpperCase() !== "ACCEPTED") {
      console.error(`[VERIFY_OTP] Invalid status: ${request.status}`);
      return res.status(400).json({ success: false, message: `Handover cannot be verified yet (Current Status: ${request.status}). Expected: ACCEPTED` });
    }

    // String-safe OTP comparison
    const cleanInbound = String(otp).trim();
    const cleanDB = String(request.otp).trim();

    if (cleanDB !== cleanInbound) {
      console.error(`[VERIFY_OTP] OTP mismatch for request ${requestId}`);
      return res.status(400).json({ success: false, message: "Invalid OTP code. Please check with the buyer." });
    }

    request.status = "OTP_VERIFIED";
    await request.save();

    res.json({ success: true, message: "OTP verified! Please click 'Confirm Delivery' to finalize." });
  } catch (error) {
    console.error("[VERIFY_OTP] Critical Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/requests/:id/confirm-handover — Final finalization after OTP
export const confirmHandover = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const currentUserId = req.user.id;

    const request = await Request.findById(requestId).populate("bookId");
    if (!request) return res.status(404).json({ success: false, message: "Request not found." });

    // Authorization check: Only the owner should confirm they handed it over
    if (request.ownerId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: "Only the book owner can confirm handover." });
    }

    if (request.status !== "OTP_VERIFIED") {
      return res.status(400).json({ success: false, message: "Handover can only be confirmed after OTP verification." });
    }

    if (request.type === "rent") {
      request.status = "RENTED";
      request.rentDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (request.bookId?.rentDuration || 7));
      request.dueDate = dueDate;
    } else {
      // type === "buy"
      request.status = "COMPLETED";
      request.delivered = true;
    }

    await request.save();

    // Mark book as purchased or rented
    try {
      const book = request.bookId;
      if (book) {
        if (request.type === "buy") {
          book.status = "purchased";
          book.ownerId = request.borrowerId; 
          book.ownerType = "user";
          book.ownerTypeModel = "User";
          book.borrower = null;
          book.dueDate = null;
          book.ownershipStatus = "owned";
        } else {
          book.status = "rented";
          book.borrower = request.borrowerId;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (book.rentDuration || 7));
          book.dueDate = dueDate;
          book.ownershipStatus = "temporary";
        }
        await book.save();
      }
    } catch (bookErr) {
      console.error("[CONFIRM_HANDOVER] Book Update Failed:", bookErr.message);
    }

    await createNotify(request.borrowerId, `Handover completed successfully!`, "INFO");

    res.json({ success: true, message: "Handover finalized successfully." });
  } catch (error) {
    console.error("[CONFIRM_HANDOVER] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/requests/:id/return — Borrower returns the book
export const returnBook = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId).populate("bookId");

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });
    if (request.type !== "rent") {
      return res.status(400).json({ success: false, message: "Only rent requests can be returned." });
    }

    // Calculate Fine
    const today = new Date();
    const due = new Date(request.dueDate);

    if (today > due) {
      const lateDays = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
      request.fine = lateDays * 10;
    }

    request.status = "RETURNED";
    await request.save();

    // Mark book as available again
    if (request.bookId) {
      request.bookId.status = "available";
      request.bookId.borrower = null;
      request.bookId.dueDate = null;
      request.bookId.ownershipStatus = "owned";
      await request.bookId.save();
    }

    await createNotify(request.ownerId, `📚 Book returned by the borrower.`, "INFO");

    res.json({ success: true, message: "Book returned. Status updated to RETURNED.", fine: request.fine });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/requests/:id/complete — Owner verifies return and completes transaction
export const completeRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    const request = await Request.findById(requestId);

    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    request.status = "COMPLETED";
    await request.save();

    res.json({ success: true, message: "Transaction completed." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/requests/my-requests — fetch for both asOwner and asBorrower
export const getMyRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const [asOwnerRaw, asBorrowerRaw] = await Promise.all([
      Request.find({ ownerId: userId })
        .populate("bookId", "title author image buyPrice rentPrice rentDuration status")
        .populate({ path: "borrowerId", select: "name username email" })
        .sort({ createdAt: -1 }),

      Request.find({ borrowerId: userId })
        .populate("bookId", "title author image buyPrice rentPrice rentDuration status")
        .sort({ createdAt: -1 }),
    ]);

    // SECURE OTP: Only the borrower should see the OTP on their screen
    const asOwner = asOwnerRaw.map(r => {
      const obj = r.toObject();
      if (obj.status === "ACCEPTED") delete obj.otp; // Hide from owner until verified
      return obj;
    });

    // Safely populate ownerId for borrower side
    const asBorrower = await Promise.all(
      asBorrowerRaw.map(async (r) => {
        try {
          const ownerModel = r.ownerTypeModel || "User";
          const Model = ownerModel === "Library"
            ? (await import("../models/Library.js")).default
            : (await import("../models/User.js")).default;
          const owner = await Model.findById(r.ownerId).select("name username email");
          const obj = r.toObject();
          obj.ownerId = owner;
          return obj;
        } catch (_) {
          return r.toObject();
        }
      })
    );

    res.json({ success: true, asOwner, asBorrower });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/requests/verify — OWNER submits OTP provided by Borrower
export const verifyRequest = async (req, res) => {
  try {
    const { requestId, otp } = req.body;
    const currentUserId = req.user.id;

    if (!requestId || !otp) {
      return res.status(400).json({ success: false, message: "requestId and otp are required" });
    }

    const request = await Request.findById(requestId).populate("bookId");
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    // Borrower verifies the OTP from the Owner
    if (request.borrowerId.toString() !== currentUserId) {
      return res.status(403).json({ success: false, message: "Only the buyer/borrower can verify the handover OTP." });
    }

    if (request.status !== "ACCEPTED") {
      return res.status(400).json({ success: false, message: "Request is not in accepted state." });
    }

    if (request.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP provided." });
    }

    if (request.expiresAt && new Date() > new Date(request.expiresAt)) {
      return res.status(400).json({ success: false, message: "OTP has expired." });
    }

    request.status = "OTP_VERIFIED";
    await request.save();

    // Mark book as purchased or rented
    const book = request.bookId;
    if (book) {
      if (request.type === "buy") {
        book.status = "purchased";
        book.ownerId = request.borrowerId; // Transfer ownership
        book.ownerType = "user";
        book.ownerTypeModel = "User";
        book.borrower = null;
        book.dueDate = null;
        book.ownershipStatus = "owned";
      } else {
        // Rent
        book.status = "rented";
        book.borrower = request.borrowerId;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (book.rentDuration || 7));
        book.dueDate = dueDate;
        book.ownershipStatus = "temporary";
      }
      await book.save();
    }

    res.json({ success: true, message: "OTP verified! Handover successful." });
  } catch (error) {
    console.error("[VERIFY]", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── History & Archival ──────────────────────────────────────────────────────
