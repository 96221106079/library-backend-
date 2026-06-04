import mongoose from 'mongoose';
import Book from '../models/Book.js';
import LibraryBook from '../models/LibraryBook.js';
import 'dotenv/config';

const sanitize = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/hybrid-library');
    console.log('✅ Connected to MongoDB');

    // 1. Sanitize COMMUNITY BOOKS
    const communityBooks = await Book.find({});
    console.log(`🔍 Checking ${communityBooks.length} community books...`);

    let communityFixed = 0;
    for (const book of communityBooks) {
      let changed = false;

      // Ensure ownerType exists
      if (!book.ownerType) {
        book.ownerType = 'user';
        changed = true;
      }

      // Ensure ownerTypeModel exists
      if (!book.ownerTypeModel) {
        book.ownerTypeModel = book.ownerType === 'library' ? 'Library' : 'User';
        changed = true;
      }

      // Migrate legacy 'owner' to 'ownerId'
      if (book.get('owner') && !book.ownerId) {
        book.ownerId = book.get('owner');
        changed = true;
      }

      if (changed) {
        await book.save();
        communityFixed++;
      }
    }
    console.log(`✨ Fixed ${communityFixed} community books.`);

    // 2. Sanitize LIBRARY BOOKS
    const libraryBooks = await LibraryBook.find({});
    console.log(`🔍 Checking ${libraryBooks.length} library books...`);

    let libraryFixed = 0;
    for (const book of libraryBooks) {
      let changed = false;

      // Library books must have libraryId
      if (!book.libraryId) {
        console.warn(`⚠️ Warning: LibraryBook "${book.title}" has no libraryId!`);
      }

      if (changed) {
        await book.save();
        libraryFixed++;
      }
    }
    console.log(`✨ Checked ${libraryBooks.length} library books.`);

    console.log('\n✅ Data Sanitization Complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Sanitization Failed:', err);
    process.exit(1);
  }
};

sanitize();
