/**
 * Migration script: Convert all camelCase fields to snake_case in MongoDB.
 * Run with: node src/migrate_snake_case.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'EventManagement';

if (!MONGO_URI) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const FIELD_RENAMES = {
  Event: [
    ['categoryIds', 'category_ids'],
    ['venueIds', 'venue_ids'],
    ['organizerId', 'organizer_id'],
    ['organizerIds', 'organizer_ids'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
    ['startTime', 'start_time'],
    ['endTime', 'end_time'],
    ['ratingAvg', 'rating_avg'],
    ['ratingCount', 'rating_count'],
  ],
  Ticket: [
    ['eventId', 'event_id'],
    ['quantityAvailable', 'quantity_available'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  Order: [
    ['userId', 'user_id'],
    ['eventId', 'event_id'],
    ['ticketId', 'ticket_id'],
    ['totalAmount', 'total_amount'],
    ['registrationDate', 'registration_date'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  Payment: [
    ['orderId', 'order_id'],
    ['registrationId', 'registration_id'],
    ['paymentMethod', 'payment_method'],
    ['paymentStatus', 'payment_status'],
    ['paymentDate', 'payment_date'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  Registration: [
    ['eventId', 'event_id'],
    ['userId', 'user_id'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  Review: [
    ['userId', 'user_id'],
    ['eventId', 'event_id'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
  User: [
    ['passwordHash', 'password_hash'],
    ['createdAt', 'created_at'],
    ['updatedAt', 'updated_at'],
  ],
};

// Indexes that reference camelCase fields and need to be recreated with snake_case
const INDEX_MIGRATIONS = {
  Ticket: [
    { old: { eventId: 1, type: 1 }, new: { event_id: 1, type: 1 }, options: { unique: true } },
  ],
  Registration: [
    { old: { eventId: 1, userId: 1 }, new: { event_id: 1, user_id: 1 }, options: { unique: true } },
  ],
  Review: [
    { old: { userId: 1, eventId: 1 }, new: { user_id: 1, event_id: 1 }, options: { unique: true } },
  ],
};

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
  console.log('Connected.\n');

  const db = mongoose.connection.db;

  // Step 1: Drop old camelCase indexes
  for (const [collectionName, indexes] of Object.entries(INDEX_MIGRATIONS)) {
    const col = db.collection(collectionName);
    const existingIndexes = await col.indexes();
    for (const idx of indexes) {
      // Build the index name MongoDB would have auto-generated
      const idxName = Object.entries(idx.old).map(([k, v]) => `${k}_${v}`).join('_');
      const found = existingIndexes.find((i) => i.name === idxName);
      if (found) {
        console.log(`[${collectionName}] Dropping old index: ${idxName}`);
        await col.dropIndex(idxName);
      }
    }
  }
  console.log('');

  // Step 2: Rename fields in all collections
  for (const [collectionName, renames] of Object.entries(FIELD_RENAMES)) {
    const col = db.collection(collectionName);
    const count = await col.countDocuments();
    console.log(`[${collectionName}] ${count} documents found.`);

    if (count === 0) {
      console.log(`  Skipping (empty).\n`);
      continue;
    }

    // Build a single $rename update
    const renameObj = {};
    for (const [oldName, newName] of renames) {
      const hasOld = await col.countDocuments({ [oldName]: { $exists: true } });
      if (hasOld > 0) {
        renameObj[oldName] = newName;
      }
    }

    if (Object.keys(renameObj).length === 0) {
      console.log(`  All fields already snake_case. Skipping.\n`);
      continue;
    }

    console.log(`  Renaming: ${JSON.stringify(renameObj)}`);
    const result = await col.updateMany({}, { $rename: renameObj });
    console.log(`  Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}\n`);
  }

  // Step 3: Clean up duplicates before creating unique indexes
  const uniqueConstraints = {
    Review: { user_id: 1, event_id: 1 },
    Registration: { event_id: 1, user_id: 1 },
    Ticket: { event_id: 1, type: 1 },
  };

  for (const [collectionName, keyFields] of Object.entries(uniqueConstraints)) {
    const col = db.collection(collectionName);
    const keyNames = Object.keys(keyFields);

    // Find duplicates using aggregation
    const groupStage = { _id: {}, ids: { $push: '$_id' }, count: { $sum: 1 } };
    for (const k of keyNames) {
      groupStage._id[k] = `$${k}`;
    }
    const duplicates = await col.aggregate([
      { $group: groupStage },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicates.length === 0) {
      console.log(`[${collectionName}] No duplicates found.`);
      continue;
    }

    console.log(`[${collectionName}] Found ${duplicates.length} duplicate groups. Keeping first, removing rest...`);
    let removedCount = 0;
    for (const dup of duplicates) {
      const idsToRemove = dup.ids.slice(1); // Keep the first, remove the rest
      const result = await col.deleteMany({ _id: { $in: idsToRemove } });
      removedCount += result.deletedCount;
    }
    console.log(`  Removed ${removedCount} duplicate documents.\n`);
  }

  // Step 4: Recreate indexes with snake_case field names
  for (const [collectionName, indexes] of Object.entries(INDEX_MIGRATIONS)) {
    const col = db.collection(collectionName);
    for (const idx of indexes) {
      console.log(`[${collectionName}] Creating new index: ${JSON.stringify(idx.new)}`);
      try {
        await col.createIndex(idx.new, idx.options);
        console.log(`  Index created successfully.`);
      } catch (err) {
        console.log(`  Index creation failed (may already exist): ${err.message}`);
      }
    }
  }

  console.log('\nMigration complete.');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
