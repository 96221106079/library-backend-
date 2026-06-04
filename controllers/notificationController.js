import Notification from "../models/Notification.js";

export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(20);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });
    
    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({ userId, isRead: false });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const testEmail = async (req, res) => {
  try {
    const { to } = req.query;
    if (!to) {
      return res.status(400).json({ success: false, message: "Query parameter 'to' is required. Example: /test-email?to=user@example.com" });
    }

    // Dynamic import to avoid circular dependencies if any
    const { sendEmail } = await import("../utils/sendEmail.js");
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 5px;">
        <h2 style="color: #4A90E2;">📧 Test Email Delivered Successfully!</h2>
        <p>If you are reading this, your Nodemailer SMTP configuration is working perfectly.</p>
        <p>Timestamp: ${new Date().toLocaleString()}</p>
        <hr />
        <p style="font-size: 0.8em; color: #777;">Smart Hybrid Library System</p>
      </div>
    `;

    const success = await sendEmail(to, "✅ SMTP Configuration Test", htmlContent);
    
    if (success) {
      res.json({ success: true, message: `Test email successfully sent to ${to}` });
    } else {
      res.status(500).json({ success: false, message: "Failed to send email. Check server logs for details." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
