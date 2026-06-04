import Book from "../models/Book.js";
import OTP from "../models/OTP.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import { getOTPTemplate } from "../utils/emailTemplates.js";

// POST /api/otp/generate
export const generateOtp = async (req, res) => {
  try {
    const { bookId, type } = req.body;

    // Validate required fields
    if (!bookId || !type) {
      return res.status(400).json({ success: false, message: "bookId and type are required" });
    }

    const book = await Book.findById(bookId).populate("owner", "_id username");

    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    // Prevent self-borrowing
    const ownerId = book.owner?._id?.toString() || book.owner?.toString();
    if (ownerId === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot borrow your own book" });
    }

    // Check book availability
    if (book.status !== "available") {
      return res.status(400).json({
        success: false,
        message: `This book is currently "${book.status}" and cannot be requested`,
      });
    }

    // Generate 6-digit OTP
    const otpValue = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove existing OTPs for this book/user if any
    await OTP.deleteMany({ bookId, receiver: req.user.id });

    const newOtp = new OTP({
      otp: otpValue,
      bookId,
      sender: book.owner,
      receiver: req.user.id,
      type: type || "borrow",
    });

    await newOtp.save();

    // Send Email Notification to Receiver
    try {
      const receiverUser = await User.findById(req.user.id);
      if (receiverUser && receiverUser.email) {
        const receiverName = receiverUser.name || receiverUser.username;
        const emailContent = getOTPTemplate(receiverName, otpValue);
        await sendEmail(receiverUser.email, "Pickup OTP", emailContent);
      }
    } catch (emailErr) {
      console.error("Failed to send OTP email:", emailErr.message);
    }

    res.json({
      success: true,
      message: "OTP generated successfully",
      otp: otpValue, // Shown in UI for demo/simulation
    });
  } catch (error) {
    console.error("OTP Generate Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/otp/verify
export const verifyOtp = async (req, res) => {
  try {
    const { bookId, otp } = req.body;
    
    const otpDoc = await OTP.findOne({ bookId, receiver: req.user.id, otp });

    if (!otpDoc) return res.status(400).json({ success: false, message: "Invalid OTP" });

    // Mark as verified
    otpDoc.verified = true;
    await otpDoc.save();

    // Update Book
    const book = await Book.findById(bookId);
    if (book) {
      const statusMap = { borrow: "borrowed", rent: "rented", buy: "sold" };
      book.status = statusMap[otpDoc.type] || "borrowed";
      book.borrower = req.user.id;
      
      // Set dueDate if it's a borrow (e.g., 14 days)
      if (otpDoc.type === "borrow") {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        book.dueDate = date;
      }
      
      await book.save();
    }

    res.json({ success: true, message: `OTP Verified! Book ${book.status}.`, book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
