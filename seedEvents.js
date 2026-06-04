// ============================================
// seedEvents.js - Database Seeder for Events
// ============================================
import mongoose from "mongoose";
import "dotenv/config";
import Event from "./models/Event.js";
import User from "./models/User.js";
import Library from "./models/Library.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/libraryDB";

const seed = async () => {
  try {
    console.log("Connecting to MongoDB for seeding events...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected successfully!");

    // 1. Clean up existing events to avoid duplicates
    await Event.deleteMany({});
    console.log("Cleared existing events.");

    // 2. Find a librarian or admin to act as organizer
    let organizer = await User.findOne({ role: { $in: ["librarian", "admin"] } });
    if (!organizer) {
      organizer = await User.findOne({});
    }
    
    // If no user exists at all, create a mock one
    if (!organizer) {
      organizer = await User.create({
        name: "Librarian Spark",
        username: "spark_librarian",
        email: "librarian@hybrid.com",
        password: "hashedpassword123",
        role: "librarian",
      });
      console.log("Created mock librarian user:", organizer._id);
    } else {
      console.log("Using existing user as organizer:", organizer.username, organizer._id);
    }

    // 3. Find a library to act as organizer hub
    let library = await Library.findOne({});
    if (!library) {
      library = await Library.create({
        name: "Central Smart Library",
        email: "central@hybrid.com",
        location: {
          type: "Point",
          coordinates: [77.2167, 28.6289], // Connaught Place, Delhi coordinates
        },
        address: "E-Block, Connaught Place, New Delhi",
        image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=600",
        librarianId: organizer._id,
      });
      console.log("Created mock library:", library.name, library._id);
    } else {
      console.log("Using existing library:", library.name, library._id);
    }

    // Set coordinates of the library for coordinates fallback
    const libLng = library.location.coordinates[0];
    const libLat = library.location.coordinates[1];

    // 4. Build 5 premium, realistic events with FUTURE dates for active countdowns
    const mockEvents = [
      {
        title: "📚 Ultimate Speed Reading Championship 2026",
        description: "Are you the fastest reader in the district? Join the Annual Speed Reading Competition! Participants will be tested on reading speed, comprehension, and vocabulary retrieval. Exciting cash prizes and premium book sets for the top three champions! Bring your library pass for entry.",
        category: "Reading competition",
        banner: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?q=80&w=800",
        dateTime: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000), // 2.5 days in future
        venue: "Main Reading Hall A",
        location: {
          type: "Point",
          coordinates: [libLng + 0.005, libLat + 0.003], // Close by
        },
        libraryId: library._id,
        libraryName: library.name,
        organizerId: organizer._id,
        maxAttendees: 50,
        attendees: [],
      },
      {
        title: "🛠️ Creative Writing & Self-Publishing Workshop",
        description: "Unleash your inner novelist! Led by award-winning author Rebecca Stone, this hands-on workshop walks you through character arcs, plot building, pacing, and modern digital self-publishing channels (KDP, IngramSpark). Every attendee gets a free writing journal.",
        category: "Workshop",
        banner: "https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=800",
        dateTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days in future
        venue: "Seminar Room 102",
        location: {
          type: "Point",
          coordinates: [libLng - 0.008, libLat - 0.004], // Close by
        },
        libraryId: library._id,
        libraryName: library.name,
        organizerId: organizer._id,
        maxAttendees: 30,
        attendees: [],
      },
      {
        title: "🏫 The Future of Artificial Intelligence & Literacy Panel",
        description: "Join academic leaders, tech ethicists, and authors for a highly engaging seminar on how generative AI models are shaping reading habits, educational curriculums, and literature. Q&A session will follow the main panel discussion. High tea will be served.",
        category: "Seminar",
        banner: "https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=800",
        dateTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days in future
        venue: "Grand Library Amphitheatre",
        location: {
          type: "Point",
          coordinates: [libLng + 0.012, libLat - 0.007], // Close by
        },
        libraryId: library._id,
        libraryName: library.name,
        organizerId: organizer._id,
        maxAttendees: 150,
        attendees: [],
      },
      {
        title: "🎪 Monsoon Book Fair & Collector's Exhibition",
        description: "Browse thousands of books spanning rare collector editions, classic literature, sci-fi thrillers, and kids comics. Enjoy discounts of up to 40% on bulk purchases. Features interactive book signing booths with local writers, food trucks, and live soft acoustic music.",
        category: "Book fair",
        banner: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?q=80&w=800",
        dateTime: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days in future
        venue: "Central Lawn & Exhibition Grounds",
        location: {
          type: "Point",
          coordinates: [libLng - 0.002, libLat + 0.009], // Close by
        },
        libraryId: library._id,
        libraryName: library.name,
        organizerId: organizer._id,
        maxAttendees: 500,
        attendees: [],
      },
      {
        title: "💻 Code & Brew: Library Hackathon & Coding Night",
        description: "Build open-source tools for community literacy! Team up or work solo to build web apps, extensions, or bots that make reading more interactive and accessible. High-speed Wi-Fi, unlimited craft coffee, and snacks are fully sponsored. Winners take home mechanical keyboards and smart tech awards!",
        category: "Coding event",
        banner: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800",
        dateTime: new Date(Date.now() + 8.5 * 24 * 60 * 60 * 1000), // 8.5 days in future
        venue: "Tech Innovation Hub (Floor 2)",
        location: {
          type: "Point",
          coordinates: [libLng + 0.001, libLat + 0.001], // Extremely close
        },
        libraryId: library._id,
        libraryName: library.name,
        organizerId: organizer._id,
        maxAttendees: 60,
        attendees: [],
      },
    ];

    const seeded = await Event.insertMany(mockEvents);
    console.log(`Successfully seeded ${seeded.length} premium events in MongoDB!`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  } catch (err) {
    console.error("Error seeding events:", err);
    process.exit(1);
  }
};

seed();
