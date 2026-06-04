// ============================================
// libraryController.js - Library APIs
// ============================================
import Library from "../models/Library.js";
import LibraryBook from "../models/LibraryBook.js";
import Order from "../models/Order.js";
import { haversineDistance, formatDistance } from "../utils/haversine.js";

// ── Sample book catalogue for auto-seeding ────────────────────────────────────
const SAMPLE_BOOKS = [
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Fiction" },
  { title: "1984", author: "George Orwell", category: "Dystopia" },
  { title: "Brave New World", author: "Aldous Huxley", category: "Dystopia" },
  { title: "The Alchemist", author: "Paulo Coelho", category: "Self-Help" },
  { title: "Sapiens", author: "Yuval Noah Harari", category: "History" },
  { title: "Atomic Habits", author: "James Clear", category: "Self-Help" },
  { title: "The Power of Now", author: "Eckhart Tolle", category: "Spirituality" },
  { title: "Deep Work", author: "Cal Newport", category: "Productivity" },
  { title: "Thinking, Fast and Slow", author: "Daniel Kahneman", category: "Psychology" },
  { title: "The Lean Startup", author: "Eric Ries", category: "Business" },
  { title: "Zero to One", author: "Peter Thiel", category: "Business" },
  { title: "Clean Code", author: "Robert C. Martin", category: "Technology" },
  { title: "The Pragmatic Programmer", author: "Andrew Hunt", category: "Technology" },
  { title: "Dune", author: "Frank Herbert", category: "Sci-Fi" },
  { title: "Foundation", author: "Isaac Asimov", category: "Sci-Fi" },
  { title: "The Hitchhiker's Guide", author: "Douglas Adams", category: "Sci-Fi" },
  { title: "Pride and Prejudice", author: "Jane Austen", category: "Classic" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", category: "Classic" },
  { title: "The Art of War", author: "Sun Tzu", category: "Philosophy" },
];

// Global cache for OSM lookups (Valid for 5 Minutes)
const osmCache = new Map();
const CACHE_TTL = 300 * 1000;

// ─────────────────────────────────────────────
// GET /api/libraries?lat=...&lng=...
// Returns flat array: { name, lat, lng, distance, sourceType, ... }
// ─────────────────────────────────────────────
export const getLibraries = async (req, res) => {
  try {
    const { lat, lng, radius = 20 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng are required." });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxDistKm = parseFloat(radius) || 20;
    const radiusMeters = maxDistKm * 1000;

    console.log(`[getLibraries] Request for lat:${userLat}, lng:${userLng}, maxDist:${maxDistKm}km`);

    // 1. Fetch from Database
    let dbLibraries = [];
    try {
      dbLibraries = await Library.find({
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: [userLng, userLat] },
            $maxDistance: radiusMeters,
          },
        },
      });
    } catch (err) {
      console.log("[getLibraries] DB query failed.", err.message);
    }

    let formattedDbLibs = dbLibraries.map(lib => ({
      _id: lib._id.toString(),
      name: lib.name,
      lat: lib.location?.coordinates?.[1],
      lng: lib.location?.coordinates?.[0],
      address: lib.address || "Library Address",
      image: lib.image || "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=500&q=60",
      sourceType: "db"
    }));

    // 2. Fetch from External (OSM) if needed
    // Using a ~500m grid for caching to avoid repeated API calls
    const gridKey = `${(userLat).toFixed(3)}_${(userLng).toFixed(3)}`;

    let externalLibs = [];
    const cached = osmCache.get(gridKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[getLibraries] Serving OSM from cache for grid ${gridKey}`);
      externalLibs = cached.data;
    } else {
      console.log(`[getLibraries] Fetching external OSM data...`);
      try {
        const axios = (await import('axios')).default;
        const config = {
          headers: { 'User-Agent': 'HybridSmartLibrary/1.1' },
          timeout: 10000
        };

        // Use Overpass for speed and geometry
        const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node(around:${radiusMeters},${userLat},${userLng})[amenity=library];out;`;
        const osmRes = await axios.get(overpassUrl, config);

        if (osmRes.data && osmRes.data.elements) {
          externalLibs = osmRes.data.elements.map(el => ({
            _id: `osm_${el.id}`,
            name: el.tags?.name || "Community Library",
            lat: el.lat,
            lng: el.lon,
            address: el.tags?.["addr:street"] || "Public Area",
            image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=500&q=60",
            sourceType: "osm"
          }));
          osmCache.set(gridKey, { timestamp: Date.now(), data: externalLibs });
        }
      } catch (err) {
        console.warn("[getLibraries] OSM secondary fetch failed:", err.message);
        // Fallback to closest available cache if current grid fails
        if (cached) externalLibs = cached.data;
      }
    }

    // 3. Merge, Calculate Distance (Haversine), and Sort
    const allLibs = [...formattedDbLibs, ...externalLibs];

    const result = allLibs.map(lib => {
      const dist = haversineDistance(userLat, userLng, lib.lat, lib.lng);
      return {
        ...lib,
        distance: dist,
        distanceLabel: formatDistance(dist)
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json(result.slice(0, 40));
  } catch (error) {
    console.error("[getLibraries] Fatal Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



// ─────────────────────────────────────────────
// GET /api/libraries/nearby
// Find libraries within a radius
// ─────────────────────────────────────────────
export const getNearbyLibraries = async (req, res) => {
  try {
    const { lat, lng, radius = 20 } = req.query; // Larger default radius for institutions

    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: "lat and lng are required." });
    }

    const uLat = parseFloat(lat);
    const uLng = parseFloat(lng);
    const radiusMeters = (parseFloat(radius) || 5) * 1000;

    const libraries = await Library.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [uLng, uLat]
          },
          $maxDistance: radiusMeters
        }
      }
    });

    const nearby = libraries.map(lib => {
      const bLng = lib.location.coordinates[0];
      const bLat = lib.location.coordinates[1];
      const distKm = haversineDistance(uLat, uLng, bLat, bLng);
      return {
        ...lib.toObject(),
        distanceKm: distKm,
        distanceLabel: formatDistance(distKm),
      };
    });

    res.json({ success: true, count: nearby.length, libraries: nearby });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/libraries/:id/books
// Returns (or auto-seeds) 20 books for a library
// ─────────────────────────────────────────────
export const getLibraryBooks = async (req, res) => {
  try {
    const { id } = req.params;
    let books = await LibraryBook.find({ libraryId: id }).limit(20);

    // Auto-seed 20 sample books if library has none
    if (books.length === 0) {
      console.log(`[getLibraryBooks] No books found for library ${id}. Auto-seeding 20 sample books...`);
      const seeded = SAMPLE_BOOKS.map((b) => ({
        ...b,
        libraryId: id,
        totalCopies: Math.floor(Math.random() * 4) + 2,   // 2-5 copies
        availableCopies: Math.floor(Math.random() * 3) + 1, // 1-3 available
        rentPrice: Math.floor(Math.random() * 30) + 10,    // ₹10-40/day
        buyPrice: Math.floor(Math.random() * 300) + 100, // ₹100-400
        isAvailable: true,
        image: `https://covers.openlibrary.org/b/isbn/${Math.floor(Math.random() * 9000000000) + 1000000000}-M.jpg`,
      }));
      books = await LibraryBook.insertMany(seeded);
      console.log(`[getLibraryBooks] Seeded ${books.length} books.`);
    }

    res.json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/libraries/orders
// Place a borrow/rent order → generate OTP
// Body: { bookId, libraryId, type, userLat, userLng }
// ─────────────────────────────────────────────
export const createLibraryOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookId, type, userLat, userLng } = req.body;

    if (!bookId || !type) {
      return res.status(400).json({ success: false, message: "bookId and type are required." });
    }

    const book = await LibraryBook.findById(bookId);
    if (!book) return res.status(404).json({ success: false, message: "Book not found." });
    
    // STEP 4: Debug Log
    console.log("LIBRARY BOOK DATA:", book);

    if (book.availableCopies <= 0) return res.status(400).json({ success: false, message: "No copies available." });

    // STEP 2: Determine owner (Library ID)
    const libraryId = book.libraryId;
    console.log("RESOLVED LIBRARY ID:", libraryId);

    if (!libraryId && !book.libraryName) {
       return res.status(400).json({ success: false, message: "Item has no identified library owner." });
    }

    // Resolve library object if DB-backed
    let library = null;
    if (libraryId) {
      try { library = await Library.findById(libraryId); } catch (_) { }
    }

    // Calculate distance if coordinates provided
    let distanceKm = null;
    if (userLat && userLng && library?.location?.coordinates?.length === 2) {
      const libLat = library.location.coordinates[1];
      const libLng = library.location.coordinates[0];
      distanceKm = Math.round(haversineDistance(parseFloat(userLat), parseFloat(userLng), libLat, libLng) * 100) / 100;
    }

    const dueDate = type === 'rent' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null;


    const isDbLibrary = !!library;

    // Create order
    const order = await Order.create({
      userId,
      bookId,
      libraryId: isDbLibrary ? libraryId : null,
      libraryName: isDbLibrary ? library.name : libraryId,
      type: type,
      status: "REQUESTED",
      dueDate,
    });

    console.log(`[createLibraryOrder] Order ${order._id} created for user ${userId}. Status: REQUESTED`);

    res.status(201).json({
      success: true,
      message: "Borrow request submitted to library staff.",
      orderId: order._id,
      distanceKm,
      book: { title: book.title, author: book.author },
      dueDate,
    });
  } catch (error) {
    console.error("[createLibraryOrder] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/libraries/orders/:id/verify
// Verify OTP and mark order as issued
// Body: { otp }
// ─────────────────────────────────────────────
export const verifyLibraryOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ success: false, message: "OTP is required." });

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ success: false, message: "Order not found." });
    if (order.status !== 'REQUESTED' && order.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}.` });
    }

    // Retrieve stored OTP (stored as flexible field)
    const storedOtp = order.get('otp');
    if (!storedOtp || storedOtp !== otp.trim()) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // Mark as DELIVERED and reduce book copies
    order.status = 'DELIVERED';
    order.issuedAt = new Date();
    await order.save();

    const book = await LibraryBook.findById(order.bookId);
    if (book) {
      book.availableCopies = Math.max(0, book.availableCopies - 1);
      if (book.availableCopies === 0) book.isAvailable = false;
      await book.save();
    }

    console.log(`[verifyLibraryOtp] Order ${id} verified and issued.`);
    res.json({
      success: true,
      message: "OTP verified! Book has been issued to you.",
      order,
    });
  } catch (error) {
    console.error("[verifyLibraryOtp] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/libraries/books-by-name?name=...
// Lookup (or auto-seed) books by library NAME string
// This is the critical endpoint for OSM libraries
// ─────────────────────────────────────────────
export const getBooksByLibraryName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: "name query param is required." });

    let books = await LibraryBook.find({ libraryName: name }).limit(20);

    // Auto-seed 20 sample books if none exist for this library name
    if (books.length === 0) {
      console.log(`[getBooksByLibraryName] No books for "${name}". Auto-seeding 20...`);
      const seeded = SAMPLE_BOOKS.map((b) => ({
        ...b,
        libraryName: name,
        totalCopies: Math.floor(Math.random() * 4) + 2,
        availableCopies: Math.floor(Math.random() * 3) + 1,
        rentPrice: Math.floor(Math.random() * 30) + 10,
        buyPrice: Math.floor(Math.random() * 300) + 100,
        isAvailable: true,
        status: "available",
        image: `https://covers.openlibrary.org/b/isbn/${Math.floor(Math.random() * 9000000000) + 1000000000}-M.jpg`,
      }));
      books = await LibraryBook.insertMany(seeded);
      console.log(`[getBooksByLibraryName] Seeded ${books.length} books for "${name}".`);
    }

    res.json({ success: true, count: books.length, books });
  } catch (error) {
    console.error("[getBooksByLibraryName] Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/libraries (Admin/Seed)
// Create a new library (Internal/Seed use)
// ─────────────────────────────────────────────
export const createLibrary = async (req, res) => {
  try {
    const lib = await Library.create(req.body);
    res.status(201).json({ success: true, library: lib });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/libraries/my-orders
// ─────────────────────────────────────────────
export const getMyLibraryOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id })
      .populate('bookId', 'title author image')
      // libraryId might be null if it's an OSM library (external)
      .populate('libraryId', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// EOF
