import Order from "../models/Order.js";
import LibraryBook from "../models/LibraryBook.js";

// POST /api/orders - Create a new order (rent or buy)
export const createOrder = async (req, res) => {
    try {
        const { bookId, type } = req.body;
        const userId = req.user.id;

        const book = await LibraryBook.findById(bookId);
        if (!book) return res.status(404).json({ success: false, message: "Library book not found." });

        if (book.availableCopies <= 0) {
            return res.status(400).json({ success: false, message: "Out of stock." });
        }

        const dueDate = type === "rent" ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) : null;

        const order = await Order.create({
            userId,
            bookId,
            libraryId: book.libraryId,
            type,
            dueDate,
            status: "pending"
        });

        // Update available copies
        book.availableCopies -= 1;
        if (book.availableCopies === 0) book.isAvailable = false;
        await book.save();

        res.status(201).json({ success: true, message: "Order placed successfully.", order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/orders/:id/return - Handle return + fine calculation
export const returnOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate("bookId");

        if (!order) return res.status(404).json({ success: false, message: "Order not found." });
        if (order.status === "returned") return res.status(400).json({ success: false, message: "Already returned." });

        const now = new Date();
        let fine = 0;

        if (order.type === "rent" && order.dueDate && now > order.dueDate) {
            const diffTime = Math.abs(now - order.dueDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fine = diffDays * 10;
        }

        order.status = "returned";
        order.returnedAt = now;
        order.fineAmount = fine;
        await order.save();

        // Increment available copies
        const book = await LibraryBook.findById(order.bookId);
        if (book) {
            book.availableCopies += 1;
            book.isAvailable = true;
            await book.save();
        }

        res.json({
            success: true,
            message: "Book returned successfully.",
            fineCalculated: fine,
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
