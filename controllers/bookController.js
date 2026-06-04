// ============================================
// bookController.js - Hybrid Marketplace Search
// ============================================
import Book from "../models/Book.js";
import User from "../models/User.js";
import Library from "../models/Library.js";

// Helper: Haversine formula for distance in km
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return NaN;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km) => (km < 1 ? "Under 1km" : `${km.toFixed(1)}km away`);

// ─────────────────────────────────────────────
// POST /api/books
// Add a new book (type determined by user role)
// ─────────────────────────────────────────────
export const addBook = async (req, res) => {
  try {
    console.log("=== ADD BOOK - Request Body ===", JSON.stringify(req.body, null, 2));
    const { 
      title, 
      author, 
      category, 
      buyPrice, 
      rentPrice, 
      rentDuration, 
      availabilityType,
      availableForBuy,
      availableForRent,
      image, 
      location, 
      lat, 
      lng 
    } = req.body;

    if (!title || !author || !category) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const isLibrarian = req.user.role === "librarian";

    const parsedLat =
      location?.lat !== undefined ? Number(location.lat) : lat !== undefined ? Number(lat) : NaN;
    const parsedLng =
      location?.lng !== undefined ? Number(location.lng) : lng !== undefined ? Number(lng) : NaN;

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
      return res.status(400).json({
        success: false,
        message: "Location (lat and lng) is required.",
      });
    }

    const normalizedLocation = {
      lat: parsedLat,
      lng: parsedLng,
    };

    // Derive availability booleans from availabilityType (preferred) or direct booleans (fallback)
    const resolvedAvailableForBuy = availabilityType
      ? (availabilityType === "both" || availabilityType === "buy")
      : (availableForBuy === true || availableForBuy === 'true');
    const resolvedAvailableForRent = availabilityType
      ? (availabilityType === "both" || availabilityType === "rent")
      : (availableForRent === true || availableForRent === 'true');

    // Parse prices — only convert to Number if a real value was provided, never default to 0
    const parsedBuyPrice = (buyPrice !== undefined && buyPrice !== null && buyPrice !== "") ? Number(buyPrice) : null;
    const parsedRentPrice = (rentPrice !== undefined && rentPrice !== null && rentPrice !== "") ? Number(rentPrice) : null;
    const parsedRentDuration = (rentDuration !== undefined && rentDuration !== null && rentDuration !== "") ? Number(rentDuration) : 7;

    console.log("=== ADD BOOK - Parsed Prices ===", { parsedBuyPrice, parsedRentPrice, parsedRentDuration, resolvedAvailableForBuy, resolvedAvailableForRent });

    const newBook = new Book({
      title,
      author,
      category,
      availabilityType: availabilityType || (resolvedAvailableForBuy && resolvedAvailableForRent ? "both" : resolvedAvailableForBuy ? "buy" : "rent"),
      buyPrice: parsedBuyPrice,
      rentPrice: parsedRentPrice,
      rentDuration: parsedRentDuration,
      availableForBuy: resolvedAvailableForBuy,
      availableForRent: resolvedAvailableForRent,
      ownerType: isLibrarian ? "library" : "user",
      ownerTypeModel: isLibrarian ? "Library" : "User",
      location: normalizedLocation,
      image: image || "https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=400",
      owner: req.user.id,
    });

    console.log("=== ADD BOOK - Before Save ===", {
      title: newBook.title,
      buyPrice: newBook.buyPrice,
      rentPrice: newBook.rentPrice,
      rentDuration: newBook.rentDuration,
      availabilityType: newBook.availabilityType,
      availableForBuy: newBook.availableForBuy,
      availableForRent: newBook.availableForRent,
    });
    await newBook.save();
    console.log("=== ADD BOOK - Saved Book ===", JSON.stringify(newBook, null, 2));
    res.status(201).json({ success: true, message: "Book listed successfully!", book: newBook });
  } catch (error) {
    console.error("Error in addBook:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/books
// Get all books
// ─────────────────────────────────────────────
export const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().populate("owner", "username location").sort({ createdAt: -1 });
    console.log("=== API Response ===", books.length, "books", books.length > 0 ? { title: books[0].title, buyPrice: books[0].buyPrice, rentPrice: books[0].rentPrice, availableForBuy: books[0].availableForBuy, availableForRent: books[0].availableForRent, availabilityType: books[0].availabilityType } : "(empty)");
    res.json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// Helper Engine: Fetch Nearby by Type (Resilient)
// ─────────────────────────────────────────────
const fetchNearbyByType = async (type, lat, lng, radiusKm) => {
  try {
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const radius = parseFloat(radiusKm) || 100;

    if (isNaN(userLat) || isNaN(userLng)) {
      throw new Error(`Invalid search coordinates: lat=${lat}, lng=${lng}`);
    }

    const query = { status: "available", ownerType: type };
    // Only populate if they exist to avoid cast errors
    const books = await Book.find(query)
      .populate({ path: "owner", select: "username firstName lastName location" })
      .populate({ path: "libraryId", select: "name location" });

    const results = [];
    for (const book of books) {
      let bLat, bLng;

      // Extract coordinates with extreme safety
      if (book.location && book.location.lat != null && book.location.lng != null) {
        bLat = parseFloat(book.location.lat);
        bLng = parseFloat(book.location.lng);
      } else if (type === "library" && book.libraryId && book.libraryId.location && book.libraryId.location.lat != null) {
        bLat = parseFloat(book.libraryId.location.lat);
        bLng = parseFloat(book.libraryId.location.lng);
      } else if (type === "user" && book.owner && book.owner.location && book.owner.location.lat != null) {
        bLat = parseFloat(book.owner.location.lat);
        bLng = parseFloat(book.owner.location.lng);
      }

      if (isNaN(bLat) || isNaN(bLng)) continue;

      try {
        const distKm = haversineDistance(userLat, userLng, bLat, bLng);
        if (isNaN(distKm)) continue;

        if (distKm <= radius) {
          const bookObj = book.toObject ? book.toObject() : book;
          results.push({
            ...bookObj,
            distanceKm: distKm,
            distanceLabel: formatDistance(distKm),
          });
        }
      } catch (mathErr) {
        continue;
      }
    }
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  } catch (error) {
    console.error(`[fetchNearbyByType] CRITICAL:`, error.message);
    throw new Error(`Data Search Error: ${error.message}`);
  }
};

// ─────────────────────────────────────────────
// Nearby APIs
// ─────────────────────────────────────────────
export const getNearbyUserBooks = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: "lat/lng required." });

    const books = await fetchNearbyByType("user", lat, lng, radius);
    res.json({ success: true, count: books.length, books });
  } catch (error) {
    console.error("getNearbyUserBooks 500:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error in User Search" });
  }
};

export const getNearbyLibraryBooks = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: "lat/lng required." });

    const books = await fetchNearbyByType("library", lat, lng, radius);
    res.json({ success: true, count: books.length, books });
  } catch (error) {
    console.error("getNearbyLibraryBooks 500:", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error in Library Search" });
  }
};

export const getNearbyBooks = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const books = await Book.find({ status: "available" }).populate("owner libraryId");
    const nearby = [];
    for (const book of books) {
      let bLat = book.location?.lat || book.owner?.location?.lat || book.libraryId?.location?.lat;
      let bLng = book.location?.lng || book.owner?.location?.lng || book.libraryId?.location?.lng;
      if (bLat && bLng) {
        const d = haversineDistance(userLat, userLng, bLat, bLng);
        nearby.push({ ...book.toObject(), distanceKm: d, distanceLabel: formatDistance(d) });
      }
    }
    res.json({ success: true, books: nearby.sort((a, b) => a.distanceKm - b.distanceKm) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// CRUD Basics
// ─────────────────────────────────────────────
export const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate("owner libraryId");
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    res.json({ success: true, book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/books/:id
// Update book details (owner/librarian only)
// ─────────────────────────────────────────────
export const updateBook = async (req, res) => {
  try {
    console.log("=== UPDATE BOOK - Request Body ===", JSON.stringify(req.body, null, 2));
    const { 
      title, 
      author, 
      category, 
      buyPrice, 
      rentPrice, 
      rentDuration, 
      availabilityType,
      availableForBuy,
      availableForRent,
      status, 
      image 
    } = req.body;
    const book = await Book.findById(req.params.id);

    if (!book) return res.status(404).json({ success: false, message: "Book not found." });

    // Check ownership
    if (book.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized update." });
    }

    if (title) book.title = title;
    if (author) book.author = author;
    if (category) book.category = category;

    // Handle price updates — never default to 0
    if (buyPrice !== undefined) {
      book.buyPrice = (buyPrice !== null && buyPrice !== "") ? Number(buyPrice) : null;
    }
    if (rentPrice !== undefined) {
      book.rentPrice = (rentPrice !== null && rentPrice !== "") ? Number(rentPrice) : null;
    }
    if (rentDuration !== undefined) {
      book.rentDuration = (rentDuration !== null && rentDuration !== "") ? Number(rentDuration) : 7;
    }

    // Handle availability — prefer availabilityType, fallback to direct booleans
    if (availabilityType) {
      book.availabilityType = availabilityType;
      book.availableForBuy = availabilityType === "both" || availabilityType === "buy";
      book.availableForRent = availabilityType === "both" || availabilityType === "rent";
    } else {
      if (availableForBuy !== undefined) book.availableForBuy = availableForBuy;
      if (availableForRent !== undefined) book.availableForRent = availableForRent;
    }

    if (status) book.status = status;
    if (image) book.image = image;

    await book.save();
    console.log("=== UPDATE BOOK - Saved ===", { buyPrice: book.buyPrice, rentPrice: book.rentPrice, availableForBuy: book.availableForBuy, availableForRent: book.availableForRent });
    res.json({ success: true, message: "Book updated successfully!", book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book || book.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Unauthorized delete." });
    }
    await book.deleteOne();
    res.json({ success: true, message: "Book removed." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyBooks = async (req, res) => {
  try {
    const books = await Book.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyActivity = async (req, res) => {
  try {
    const books = await Book.find({ borrower: req.user.id })
      .populate("owner", "username firstName lastName location")
      .sort({ updatedAt: -1 });
    res.json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// Transaction Actions (Borrow / Rent)
// ─────────────────────────────────────────────
export const borrowBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    
    if (book.status === "borrowed") {
      return res.status(400).json({ success: false, message: "Book already borrowed" });
    }
    if (book.status === "rented") {
      return res.status(400).json({ success: false, message: "Book currently rented" });
    }
    if (book.status !== "available") {
      return res.status(400).json({ success: false, message: `Book is currently ${book.status}` });
    }
    
    book.status = "borrowed";
    book.borrower = req.user.id;
    await book.save();
    
    res.json({ success: true, message: "Book borrowed successfully", book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rentBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    
    if (book.status === "borrowed") {
      return res.status(400).json({ success: false, message: "Book already borrowed" });
    }
    if (book.status === "rented") {
      return res.status(400).json({ success: false, message: "Book currently rented" });
    }
    if (book.status !== "available") {
      return res.status(400).json({ success: false, message: `Book is currently ${book.status}` });
    }
    
    book.status = "rented";
    book.borrower = req.user.id;
    await book.save();
    
    res.json({ success: true, message: "Book rented successfully", book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const returnBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });

    book.status = "available";
    book.borrower = null;
    book.dueDate = null;
    await book.save();

    res.json({ success: true, message: "Book returned successfully", book });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// Ratings, Reviews, Comments
// ─────────────────────────────────────────────
export const addRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    
    const existingRatingIndex = book.ratings.findIndex(r => r.user.toString() === req.user.id);
    if (existingRatingIndex >= 0) {
      book.ratings[existingRatingIndex].rating = rating;
    } else {
      book.ratings.push({ user: req.user.id, rating });
    }
    
    book.averageRating = book.ratings.reduce((acc, curr) => acc + curr.rating, 0) / book.ratings.length;
    await book.save();
    
    res.json({ success: true, message: "Rating added", averageRating: book.averageRating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addReview = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "Review text is required" });
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    
    book.reviews.push({ user: req.user.id, text });
    await book.save();
    
    res.json({ success: true, message: "Review added", reviews: book.reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Comment message is required" });
    
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    
    book.comments.push({ user: req.user.id, message });
    await book.save();
    
    res.json({ success: true, message: "Comment added", comments: book.comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
