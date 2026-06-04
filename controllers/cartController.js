
import Cart from "../models/Cart.js";
import Book from "../models/Book.js";
import Order from "../models/Order.js";

// GET /api/cart
export const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id }).populate("items.bookId");

    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }

    // Filter out items where the book was deleted, then build safe items array
    const items = cart.items
      .filter(item => item.bookId && item.bookId._id)
      .map(item => {
        const book = item.bookId;
        const displayPrice = item.price || book.buyPrice || 0;
        return {
          bookId: book._id,
          title: book.title,
          author: book.author,
          image: book.image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400",
          price: displayPrice,
          quantity: item.quantity || 1,
          addedAt: item.addedAt,
        };
      });

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    res.json({
      success: true,
      items,
      totalPrice,
      itemCount: items.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/cart/add
export const addToCart = async (req, res) => {
  try {
    const { bookId, quantity = 1 } = req.body;

    if (!bookId) {
      return res.status(400).json({ success: false, message: "bookId is required" });
    }

    // Verify book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: "Book not found" });
    }

    const priceToUse = book.buyPrice;

    if (!priceToUse || priceToUse === 0) {
      return res.status(400).json({ success: false, message: "This book is not for sale" });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      cart = await Cart.create({ userId: req.user.id, items: [] });
    }

    // Check if item already exists
    const existingItem = cart.items.find(item => item.bookId.toString() === bookId);

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        bookId,
        quantity,
        price: priceToUse,
      });
    }

    cart.updatedAt = new Date();
    await cart.save();

    res.json({
      success: true,
      message: "Added to cart",
      itemCount: cart.items.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/cart/:bookId
export const removeFromCart = async (req, res) => {
  try {
    const { bookId } = req.params;

    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(item => item.bookId.toString() !== bookId);
    cart.updatedAt = new Date();
    await cart.save();

    res.json({
      success: true,
      message: "Item removed",
      itemCount: cart.items.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/cart
export const clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { items: [], updatedAt: new Date() }
    );

    res.json({ success: true, message: "Cart cleared" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/cart/checkout
export const checkout = async (req, res) => {
  try {
    const { items = [] } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

    // Create order for each item
    const orders = await Promise.all(
      items.map(item =>
        Order.create({
          userId: req.user.id,
          bookId: item.bookId,
          quantity: item.quantity || 1,
          totalPrice: item.price * (item.quantity || 1),
          type: "buy",
          status: "confirmed",
        })
      )
    );

    // Clear cart
    await Cart.findOneAndUpdate(
      { userId: req.user.id },
      { items: [], updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: "Checkout successful!",
      orders: orders.map(o => ({ orderId: o._id })),
      totalPrice,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
