import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB_NAME });
const db = mongoose.connection.db;

for (const name of ['Event', 'Ticket', 'Order', 'Payment', 'Registration', 'Review', 'User', 'Category', 'Venue']) {
  const r = await db.collection(name).updateMany({}, { $unset: { __v: '' } });
  console.log(`${name}: cleaned ${r.modifiedCount} docs`);
}

await mongoose.disconnect();
console.log('Done');
