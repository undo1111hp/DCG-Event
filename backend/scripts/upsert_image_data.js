import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { connectMongoIfEnabled } from '../src/config/db.js';
import { UserModel } from '../src/models/User.js';
import { CategoryModel } from '../src/models/Category.js';
import { VenueModel } from '../src/models/Venue.js';
import { EventModel } from '../src/models/Event.js';
import { TicketModel } from '../src/models/Ticket.js';
import { OrderModel } from '../src/models/Order.js';
import { PaymentModel } from '../src/models/Payment.js';
import { ReviewModel } from '../src/models/Review.js';

dotenv.config();

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..', '..');
const dataDir = path.join(projectRoot, 'image', 'data');

const collectionSpecs = [
  {
    file: 'users.json',
    model: UserModel,
    label: 'User'
  },
  {
    file: 'categories.json',
    model: CategoryModel,
    label: 'Category'
  },
  {
    file: 'venues.json',
    model: VenueModel,
    label: 'Venue'
  },
  {
    file: 'events.json',
    model: EventModel,
    label: 'Event'
  },
  {
    file: 'tickets.json',
    model: TicketModel,
    label: 'Ticket'
  },
  {
    file: 'orders.json',
    model: OrderModel,
    label: 'Order'
  },
  {
    file: 'payments.json',
    model: PaymentModel,
    label: 'Payment'
  },
  {
    file: 'reviews.json',
    model: ReviewModel,
    label: 'Review'
  }
];

function readFixture(fileName) {
  const filePath = path.join(dataDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing fixture file: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Fixture file must contain an array: ${filePath}`);
  }

  return parsed;
}

async function upsertCollection(model, docs) {
  if (docs.length === 0) {
    return 0;
  }

  const operations = docs.map((doc) => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true
    }
  }));

  const result = await model.bulkWrite(operations, { ordered: false });
  return docs.length;
}

async function main() {
  await connectMongoIfEnabled();

  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection is not ready. Set STORAGE_MODE=mongo and MONGODB_URI in backend/.env.');
  }

  console.log(`Upserting fixtures from ${dataDir}`);

  for (const spec of collectionSpecs) {
    const docs = readFixture(spec.file);
    const count = await upsertCollection(spec.model, docs);
    console.log(`${spec.label}: processed ${count} fixture records from ${spec.file}`);
  }

  await mongoose.disconnect();
  console.log('Fixture upsert complete.');
}

main().catch(async (err) => {
  console.error('Fixture upsert failed:', err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});