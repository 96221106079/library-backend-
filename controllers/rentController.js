import Rental from "../models/Rental.js";
import Book from "../models/Book.js";
import Notification from "../models/Notification.js";

// Helper to create notification
const createNotify = async (userId, message, type = "INFO") => {
  try {
    await Notification.create({ userId, message, type });
  } catch (err) {
    console.error("Notify failed:", err.message);
  }
};

// 1. POST /api/rent/request
export const requestRental = async (req, res) => {
  try {
    const { bookId, renterLocation } = req.body;
    const renterId = req.user.id;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: "Book not found" });

    // Ensure it's not the owner renting their own book
    if (book.ownerId.toString() === renterId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot rent your own book" });
    }

    const rental = await Rental.create({
      bookId,
      ownerId: book.ownerId,
      renterId,
      status: "REQUESTED",
      borrowerLocation: renterLocation // Map to borrowerLocation field
    });

    await createNotify(book.ownerId, `New rent request for your book: ${book.title}`, "REQUEST");

    res.status(201).json({ success: true, rental });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. POST /api/rent/accept
export const acceptRental = async (req, res) => {
  try {
    const { rentalId, ownerLocation } = req.body;
    const ownerId = req.user.id;

    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ success: false, message: "Rental not found" });

    if (rental.ownerId.toString() !== ownerId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    rental.status = "ACCEPTED";
    rental.otp = otp;
    rental.otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    rental.ownerLocation = ownerLocation;
    await rental.save();

    await createNotify(rental.renterId, `Your rent request for book was accepted!`, "ACCEPTED");

    res.json({ success: true, rental });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. POST /api/rent/verify
export const verifyRental = async (req, res) => {
  try {
    const { rentalId, otp } = req.body;
    const ownerId = req.user.id; // Owner verifies

    const rental = await Rental.findById(rentalId).populate("bookId");
    if (!rental) return res.status(404).json({ success: false, message: "Rental not found" });

    if (rental.ownerId.toString() !== ownerId) {
      return res.status(403).json({ success: false, message: "Only owner can verify" });
    }

    if (rental.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    rental.status = "VERIFIED";
    rental.rentDate = new Date();
    // Default 7 days
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    rental.dueDate = dueDate;
    
    await rental.save();

    res.json({ success: true, message: "OTP Verified. Ready to start rental." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. POST /api/rent/start
export const startRental = async (req, res) => {
  try {
    const { rentalId } = req.body;
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ success: false, message: "Rental not found" });

    rental.status = "RENTED";
    await rental.save();

    // Update book status
    await Book.findByIdAndUpdate(rental.bookId, { status: "rented", borrower: rental.renterId });

    res.json({ success: true, message: "Rental started!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. POST /api/rent/return
export const returnRental = async (req, res) => {
  try {
    const { rentalId } = req.body;
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ success: false, message: "Rental not found" });

    rental.status = "RETURNED";
    await rental.save();

    res.json({ success: true, message: "Book marked as returned. Awaiting completion." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. POST /api/rent/complete
export const completeRental = async (req, res) => {
  try {
    const { rentalId } = req.body;
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ success: false, message: "Rental not found" });

    rental.status = "COMPLETED";
    await rental.save();

    // Make book available again
    await Book.findByIdAndUpdate(rental.bookId, { status: "available", borrower: null });

    res.json({ success: true, message: "Transaction completed!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper for fetching my rentals
export const getMyRentals = async (req, res) => {
  try {
    const userId = req.user.id;
    const rentals = await Rental.find({
      $or: [{ renterId: userId }, { ownerId: userId }]
    }).populate("bookId").populate("renterId").populate("ownerId");
    
    res.json({ success: true, rentals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. PUT /api/rent/:id/location
export const updateRentalLocation = async (req, res) => {
  try {
    const { id: rentalId } = req.params;
    const { lat, lng, role } = req.body;

    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ success: false, message: "Rental not found" });

    if (role === "owner") {
      rental.ownerLocation = { lat, lng };
    } else {
      rental.borrowerLocation = { lat, lng };
    }

    await rental.save();
    res.json({ success: true, message: "Location updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
