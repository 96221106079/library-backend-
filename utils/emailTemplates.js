const BASE_STYLE = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
`;

const HEADER_STYLE = `
  background-color: #4A90E2;
  color: white;
  padding: 20px;
  text-align: center;
  border-radius: 8px 8px 0 0;
`;

const BUTTON_STYLE = `
  display: inline-block;
  padding: 12px 24px;
  background-color: #4A90E2;
  color: white;
  text-decoration: none;
  border-radius: 5px;
  font-weight: bold;
  margin-top: 20px;
`;

const layout = (title, content) => `
  <div style="${BASE_STYLE}">
    <div style="${HEADER_STYLE}">
      <h1 style="margin:0;">📚 Hybrid Library</h1>
    </div>
    <div style="padding: 20px;">
      <h2>${title}</h2>
      ${content}
      <p style="margin-top: 30px; font-size: 0.9em; color: #777;">
        Best Regards,<br>The Library Team
      </p>
    </div>
    <div style="text-align: center; font-size: 0.8em; color: #999; margin-top: 20px;">
      &copy; ${new Date().getFullYear()} Smart Hybrid Library System. All rights reserved.
    </div>
  </div>
`;

export const getBorrowRequestTemplate = (ownerName, requesterName, bookName) => layout(
  'New Borrow Request',
  `
    <p>Hi <strong>${ownerName}</strong>,</p>
    <p><strong>${requesterName}</strong> has requested to borrow your book: <em>"${bookName}"</em>.</p>
    <p>Please log in to the app to accept or reject this request.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard" style="${BUTTON_STYLE}">Review Request</a>
  `
);

export const getRequestAcceptedTemplate = (userName, bookName) => layout(
  '✅ Request Approved',
  `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>Good news! Your request for <em>"${bookName}"</em> has been accepted.</p>
    <p>An OTP has been generated for your pickup verification.</p>
    <a href="${process.env.FRONTEND_URL}/my-requests" style="${BUTTON_STYLE}">View Details</a>
  `
);

export const getOTPTemplate = (userName, otp) => layout(
  '🔐 Pickup OTP',
  `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>Your verification code for picking up the book is:</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; color: #4A90E2;">
      ${otp}
    </div>
    <p>Please present this code to the book owner or librarian.</p>
  `
);

export const getReminderTemplate = (userName, bookName, dueDate) => layout(
  '⏰ Return Reminder',
  `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>This is a friendly reminder that the book <em>"${bookName}"</em> is due tomorrow (<strong>${dueDate}</strong>).</p>
    <p>Please return it on time to avoid late fees.</p>
  `
);

export const getFineTemplate = (userName, bookName, amount) => layout(
  '⚠️ Late Return Fine',
  `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>The book <em>"${bookName}"</em> is overdue. A fine of <strong>₹${amount}</strong> has been added to your account.</p>
    <p>Please return the book as soon as possible to prevent further charges.</p>
    <a href="${process.env.FRONTEND_URL}/fines" style="${BUTTON_STYLE}">Pay Fine</a>
  `
);

export const getEventRegistrationTemplate = (userName, eventName, eventDate) => layout(
  '🎉 Event Registration Successful',
  `
    <p>Hi <strong>${userName}</strong>,</p>
    <p>You have successfully registered for the event: <strong>${eventName}</strong>.</p>
    <p><strong>Date:</strong> ${eventDate}</p>
    <p>We look forward to seeing you there!</p>
  `
);

export const getRentalReceiptTemplate = (userName, bookName) => layout(
  '📄 Rental Receipt',
  `<p>Hi ${userName}, please find your rental receipt attached for the book "${bookName}".</p>`
);