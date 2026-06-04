// Library Transaction functionality removed as per request.
export const requestLibraryRent = (req, res) => res.status(410).json({ success: false, message: "Librarian role has been removed." });
export const getIncomingLibraryTransactions = (req, res) => res.status(410).json({ success: false, message: "Librarian role has been removed." });
export const acceptLibraryTransaction = (req, res) => res.status(410).json({ success: false, message: "Librarian role has been removed." });
export const rejectLibraryTransaction = (req, res) => res.status(410).json({ success: false, message: "Librarian role has been removed." });
export const verifyLibraryOtp = (req, res) => res.status(410).json({ success: false, message: "Librarian role has been removed." });
export const deliverLibraryTransaction = (req, res) => res.status(410).json({ success: false, message: "Librarian role has been removed." });
export const getMyLibraryTransactions = (req, res) => res.status(200).json({ success: true, transactions: [] });

