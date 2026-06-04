import Book from "../models/Book.js";
import Request from "../models/Request.js";
import Rental from "../models/Rental.js";
import Transaction from "../models/Transaction.js";

export const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const totalBooks = await Book.countDocuments({ owner: userId });
    const activeRentals = await Request.countDocuments({
      $or: [{ ownerId: userId }, { borrowerId: userId }],
      status: "RENTED",
    });
    const completed = await Request.countDocuments({
      $or: [{ ownerId: userId }, { borrowerId: userId }],
      status: "COMPLETED",
    });

    //  Pending requests
    const pending = await Request.countDocuments({
      $or: [{ ownerId: userId }, { borrowerId: userId }],
      status: { $in: ["REQUESTED", "ACCEPTED", "OTP_VERIFIED"] },
    });

    // Total fines
    const requestsWithFines = await Request.find({
      $or: [{ ownerId: userId }, { borrowerId: userId }],
      fine: { $gt: 0 },
    });
    const totalFine = requestsWithFines.reduce((sum, r) => sum + (r.fine || 0), 0);

    // 6. DASHBOARD ALERTS (Due Tomorrow or Overdue)
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
    const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

    const alerts = [];

    // Fetch from all 3 models
    const [reqAlerts, rentAlerts, txnAlerts] = await Promise.all([
      Request.find({ borrowerId: userId, status: "RENTED", dueDate: { $lte: endOfTomorrow } }).populate('bookId'),
      Rental.find({ renterId: userId, status: "RENTED", dueDate: { $lte: endOfTomorrow } }).populate('bookId'),
      Transaction.find({ requesterId: userId, status: "delivered", type: "rent", dueDate: { $lte: endOfTomorrow } }).populate('bookId'),
    ]);

    const allPotentialAlerts = [...reqAlerts, ...rentAlerts, ...txnAlerts];

    allPotentialAlerts.forEach(item => {
      const dueDate = new Date(item.dueDate);
      const isOverdue = dueDate < startOfToday;
      const isDueTomorrow = dueDate >= startOfTomorrow && dueDate <= endOfTomorrow;

      if (isOverdue) {
        alerts.push({
          id: item._id,
          type: "critical",
          message: `Overdue: "${item.bookId?.title || 'Book'}" was due on ${dueDate.toLocaleDateString()}.`,
          bookTitle: item.bookId?.title,
          dueDate: item.dueDate
        });
      } else if (isDueTomorrow) {
        alerts.push({
          id: item._id,
          type: "warning",
          message: `Due Tomorrow: "${item.bookId?.title || 'Book'}" is due soon.`,
          bookTitle: item.bookId?.title,
          dueDate: item.dueDate
        });
      }
    });

    res.json({
      success: true,
      totalBooks,
      activeRentals,
      completed,
      pending,
      totalFine,
      alerts
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
