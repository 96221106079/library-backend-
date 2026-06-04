import cron from "node-cron";
import Request from "../models/Request.js";
import Rental from "../models/Rental.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendEmail } from "./sendEmail.js";
import { getReminderTemplate, getFineTemplate } from "./emailTemplates.js";

const setupCronJobs = () => {
  // Run daily at midnight: 0 0 * * *
  cron.schedule("0 0 * * *", async () => {
    console.log("🕒 Running Daily Rental Check (Fines & Reminders)...");
    try {
      const today = new Date();
      const startOfToday = new Date(today.setHours(0, 0, 0, 0));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
      const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

      // Unified check for different models
      const checkDueSoon = async (Model, dateField, statusField, statusValue, userField) => {
        const items = await Model.find({
          [statusField]: statusValue,
          [dateField]: { $gte: startOfTomorrow, $lte: endOfTomorrow }
        }).populate('bookId');
        for (const item of items) {
          await Notification.create({
            userId: item[userField],
            message: `⏰ Book "${item.bookId?.title || 'Borrowed Book'}" is due tomorrow. Please return it to avoid fines.`,
            type: "REMINDER"
          });

          // Send Reminder Email
          try {
            const user = await User.findById(item[userField]);
            if (user && user.email) {
              const userName = user.name || user.username;
              const bookTitle = item.bookId?.title || 'Borrowed Book';
              const dueDate = new Date(item[dateField]).toLocaleDateString();
              const emailContent = getReminderTemplate(userName, bookTitle, dueDate);
              await sendEmail(user.email, "Return Reminder", emailContent);
            }
          } catch (e) {
            console.error("Reminder Email Error:", e.message);
          }
        }
        return items.length;
      };

      const checkOverdue = async (Model, dateField, statusField, statusValue, userField, fineField) => {
        const items = await Model.find({
          [statusField]: statusValue,
          [dateField]: { $lt: startOfToday }
        }).populate('bookId');

        for (const item of items) {
          const lateDays = Math.floor((new Date() - new Date(item[dateField])) / (1000 * 60 * 60 * 24));
          if (lateDays > 0) {
            const fineAmount = lateDays * 10;
            item[fineField] = fineAmount;
            await item.save();

            await Notification.create({
              userId: item[userField],
              message: `⚠️ Late! Fine ₹${fineAmount} for book "${item.bookId?.title || 'Borrowed Book'}" (${lateDays} days overdue).`,
              type: "FINE"
            });

            // Send Fine Email
            try {
              const user = await User.findById(item[userField]);
              if (user && user.email) {
                const userName = user.name || user.username;
                const bookTitle = item.bookId?.title || 'Borrowed Book';
                const emailContent = getFineTemplate(userName, bookTitle, fineAmount);
                await sendEmail(user.email, "Late Return Fine", emailContent);
              }
            } catch (e) {
              console.error("Fine Email Error:", e.message);
            }
          }
        }
        return items.length;
      };

      // 1. Request Model (Unified Lifecycle)
      const r1 = await checkDueSoon(Request, "dueDate", "status", "RENTED", "borrowerId");
      const r2 = await checkOverdue(Request, "dueDate", "status", "RENTED", "borrowerId", "fine");

      // 2. Rental Model (Dedicated Rentals)
      const n1 = await checkDueSoon(Rental, "dueDate", "status", "RENTED", "renterId");
      const n2 = await checkOverdue(Rental, "dueDate", "status", "RENTED", "renterId", "fine");

      // 3. Transaction Model (P2P Handover)
      const t1 = await checkDueSoon(Transaction, "dueDate", "status", "delivered", "requesterId");
      const t2 = await checkOverdue(Transaction, "dueDate", "status", "delivered", "requesterId", "fineAmount");

      console.log(`✅ Daily check complete. Reminders sent: ${r1 + n1 + t1}, Fines updated: ${r2 + n2 + t2}`);
    } catch (err) {
      console.error("❌ Cron Job Error:", err.message);
    }
  });
};

export default setupCronJobs;
