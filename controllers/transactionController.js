// ============================================
// transactionController.js - P2P Lifecycle
// ============================================
import Transaction from "../models/Transaction.js";
import Book from "../models/Book.js";
import User from "../models/User.js";

// -- 1a. Specialized BUY REQUEST --
// POST /api/transactions/buy
export const buyBook = async (req, res) => {
  // Ensure req.body is an object so we can attach type
  if (typeof req.body !== "object") {
    req.body = { bookId: req.body };
  }
  req.body.type = "buy";
  return createRequest(req, res);
};

// -- 1b. Specialized RENT REQUEST --
// POST /api/transactions/rent
export const rentBook = async (req, res) => {
  if (typeof req.body !== "object") {
    req.body = { bookId: req.body };
  }
  req.body.type = "rent";
  return createRequest(req, res);
};

// -- 1. CREATE REQUEST --
// POST /api/transactions/request
export const createRequest = async (req, res) => {
  try {
    let { bookId, ownerId, type } = req.body;

    // 1. Validate bookId
    if (!bookId || typeof bookId !== "string") {
      return res.status(400).json({ success: false, message: "Valid bookId is required." });
    }

    // 2. Fetch book to verify existence and get owner if missing
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });

    // 3. Derive ownerId if not provided
    if (!ownerId) {
      ownerId = book.ownerId || book.libraryId;
    }

    if (!ownerId) {
      return res.status(400).json({ success: false, message: "Owner information missing for this book." });
    }

    // 4. Validate other fields
    if (!type) {
      return res.status(400).json({ success: false, message: "Transaction type (buy/rent) is required." });
    }

    const requesterId = req.user.id;
    if (String(ownerId) === String(requesterId)) {
      return res.status(400).json({ success: false, message: "You cannot request your own book." });
    }

    if (book.status !== "available") {
      return res.status(400).json({ success: false, message: `Book is currently ${book.status}.` });
    }

    // Check for existing active request
    const existing = await Transaction.findOne({ 
      bookId, 
      requesterId, 
      status: { $in: ["requested", "accepted", "otp_verified"] } 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "Request already in progress." });
    }

    // Create Transaction
    const transaction = await Transaction.create({
      bookId,
      ownerId,
      requesterId,
      type,
      status: "requested",
      timeline: [{ status: "requested", timestamp: new Date(), message: "Request sent to book owner." }]
    });

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    console.error("Create Request Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// -- 2. ACCEPT REQUEST --
// POST /api/transactions/accept/:id
export const acceptTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found." });

    if (txn.ownerId.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    if (txn.status !== "requested") {
      return res.status(400).json({ success: false, message: "Invalid status for acceptance." });
    }

    // Generate 6-digit OTP (5 min expiry)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    txn.status = "accepted";
    txn.otp = otp;
    txn.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min
    txn.timeline.push({ status: "accepted", timestamp: new Date(), message: "Owner accepted the request. OTP generated." });
    
    await txn.save();
    res.json({ success: true, message: "Request accepted! Share OTP with borrower.", otp });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -- 3. REJECT REQUEST --
// POST /api/transactions/reject/:id
export const rejectTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found." });

    if (txn.ownerId.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: "Unauthorized." });
    }

    txn.status = "rejected";
    txn.timeline.push({ status: "rejected", timestamp: new Date(), message: "Owner rejected the request." });
    
    await txn.save();
    res.json({ success: true, message: "Request rejected." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -- 4. VERIFY OTP (Borrower side) --
// POST /api/transactions/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { transactionId, otp } = req.body;
    const txn = await Transaction.findById(transactionId);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found." });

    if (txn.requesterId.toString() !== req.user.id && txn.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only participants can verify." });
    }

    if (txn.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Request not accepted yet." });
    }

    if (txn.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    // if (new Date() > txn.otpExpiry) {
    //   return res.status(400).json({ success: false, message: "OTP expired." });
    // }

    txn.status = "otp_verified";
    txn.timeline.push({ status: "otp_verified", timestamp: new Date(), message: "OTP verified by buyer/borrower." });
    
    await txn.save();
    res.json({ success: true, message: "OTP verified! Handover handshake complete." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -- 5. CONFIRM DELIVERY (Owner side) --
// POST /api/transactions/deliver/:id
export const deliverTransaction = async (req, res) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found." });

    if (txn.ownerId.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: "Only owner can confirm delivery." });
    }

    if (txn.status !== "otp_verified") {
       return res.status(400).json({ success: false, message: "Handover not verified by borrower yet." });
    }

    txn.status = "delivered";
    txn.issuedAt = new Date();
    txn.timeline.push({ status: "delivered", timestamp: new Date(), message: "Physical handover confirmed by owner." });
    await txn.save();

    // Update Book
    const book = await Book.findById(txn.bookId);
    if (book) {
      if (txn.type === "buy") {
        book.status = "purchased";
        book.ownerId = txn.requesterId;
        book.ownerType = "user";
        book.ownerTypeModel = "User";
        book.borrower = null;
        book.dueDate = null;
        book.ownershipStatus = "owned";
      } else {
        book.status = "rented";
        book.borrower = txn.requesterId;
        book.ownershipStatus = "temporary";
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (book.rentDuration || 7));
        book.dueDate = dueDate;
      }
      await book.save();
    }

    res.json({ success: true, message: "Delivery confirmed. Book marked as issued." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -- 6. RETURN BOOK --
// POST /api/transactions/return
export const returnBook = async (req, res) => {
  try {
    const { transactionId } = req.body;
    const txn = await Transaction.findById(transactionId);
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found." });

    if (txn.requesterId.toString() !== req.user.id) {
       return res.status(403).json({ success: false, message: "Only borrower can return." });
    }

    txn.status = "returned";
    txn.returnedAt = new Date();
    txn.timeline.push({ status: "returned", timestamp: new Date(), message: "Book returned by borrower." });
    await txn.save();

    const book = await Book.findById(txn.bookId);
    if (book) {
      book.status = "available";
      book.borrower = null;
      await book.save();
    }

    res.json({ success: true, message: "Book returned successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// -- 7. GET MY TRANSACTIONS --
// GET /api/transactions/my
export const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const all = await Transaction.find({
      $or: [{ requesterId: userId }, { ownerId: userId }]
    })
    .populate("bookId", "title author image price category")
    .populate("ownerId", "username")
    .populate("requesterId", "username")
    .sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      requested: all.filter(t => t.status === "requested"),
      accepted: all.filter(t => t.status === "accepted" || t.status === "otp_verified"),
      completed: all.filter(t => ["delivered", "returned"].includes(t.status))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};