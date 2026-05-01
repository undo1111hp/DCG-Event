import { CategoryModel } from '../models/Category.js';
import { VenueModel } from '../models/Venue.js';
import { TicketModel } from '../models/Ticket.js';
import { OrderModel } from '../models/Order.js';
import { PaymentModel } from '../models/Payment.js';
import { ReviewModel } from '../models/Review.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

async function nextNumericId(model) {
  const [result] = await model.aggregate([{ $group: { _id: null, maxId: { $max: '$_id' } } }]);
  return Number((result?.maxId || 0) + 1);
}

function toNumericId(id) {
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : id;
}

function mapCategory(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

function mapVenue(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    address: doc.address,
    city: doc.city,
    capacity: doc.capacity,
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

function mapTicket(doc) {
  return {
    id: String(doc._id),
    eventId: String(doc.eventId),
    type: doc.type,
    price: doc.price,
    quantityAvailable: doc.quantityAvailable ?? doc.quantity_available ?? 0,
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

function mapOrder(doc) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    eventId: String(doc.eventId),
    ticketId: doc.ticketId != null ? String(doc.ticketId) : null,
    quantity: doc.quantity,
    totalAmount: doc.totalAmount,
    status: doc.status,
    registrationDate: formatDate(doc.registrationDate || doc.registration_date),
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

function mapPayment(doc) {
  return {
    id: String(doc._id),
    registrationId: doc.registrationId != null ? String(doc.registrationId) : null,
    orderId: String(doc.orderId),
    amount: doc.amount,
    paymentMethod: doc.paymentMethod || doc.payment_method || 'mock-gateway',
    paymentStatus: doc.paymentStatus || doc.payment_status || 'paid',
    paymentDate: formatDate(doc.paymentDate || doc.payment_date),
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

function mapReview(doc) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    eventId: String(doc.eventId),
    rating: doc.rating,
    comment: doc.comment,
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

export const domainRepositoryMongo = {
  async listCategories() {
    const docs = await CategoryModel.find({}).sort({ _id: 1 }).lean().exec();
    return docs.map(mapCategory);
  },

  async createCategory(payload) {
    const existing = await CategoryModel.findOne({ name: payload.name }).exec();
    if (existing) {
      return mapCategory(existing);
    }

    const created = await CategoryModel.create({
      _id: await nextNumericId(CategoryModel),
      name: payload.name
    });
    return mapCategory(created);
  },

  async getCategoryById(id) {
    const doc = await CategoryModel.findById(toNumericId(id)).lean().exec();
    return doc ? mapCategory(doc) : null;
  },

  async listVenues() {
    const docs = await VenueModel.find({}).sort({ _id: 1 }).lean().exec();
    return docs.map(mapVenue);
  },

  async createVenue(payload) {
    const created = await VenueModel.create({
      _id: await nextNumericId(VenueModel),
      name: payload.name,
      address: payload.address || '',
      city: payload.city,
      capacity: payload.capacity
    });
    return mapVenue(created);
  },

  async updateVenue(id, updates) {
    const doc = await VenueModel.findByIdAndUpdate(
      toNumericId(id),
      {
        ...updates,
        capacity: updates.capacity !== undefined ? Number(updates.capacity) : undefined
      },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();

    return doc ? mapVenue(doc) : null;
  },

  async getVenueById(id) {
    const doc = await VenueModel.findById(toNumericId(id)).lean().exec();
    return doc ? mapVenue(doc) : null;
  },

  async listTicketsByEvent(eventId) {
    const docs = await TicketModel.find({ eventId: toNumericId(eventId) }).lean().exec();
    return docs.map(mapTicket);
  },

  async createTicket(payload) {
    const created = await TicketModel.create({
      _id: await nextNumericId(TicketModel),
      eventId: toNumericId(payload.eventId),
      type: payload.type,
      price: payload.price,
      quantityAvailable: payload.quantityAvailable,
      quantity_available: payload.quantityAvailable
    });
    return mapTicket(created);
  },

  async updateTicket(id, updates) {
    const doc = await TicketModel.findByIdAndUpdate(
      toNumericId(id),
      {
        ...updates,
        quantity_available:
          updates.quantityAvailable !== undefined ? updates.quantityAvailable : updates.quantity_available
      },
      { new: true, runValidators: true }
    )
      .lean()
      .exec();
    return doc ? mapTicket(doc) : null;
  },

  async getTicketById(id) {
    const doc = await TicketModel.findById(toNumericId(id)).lean().exec();
    return doc ? mapTicket(doc) : null;
  },

  async deleteTicket(id) {
    const deleted = await TicketModel.findByIdAndDelete(toNumericId(id)).exec();
    return Boolean(deleted);
  },

  async createOrder(payload) {
    const created = await OrderModel.create({
      _id: await nextNumericId(OrderModel),
      userId: toNumericId(payload.userId),
      eventId: toNumericId(payload.eventId),
      ticketId: payload.ticketId != null ? toNumericId(payload.ticketId) : null,
      quantity: payload.quantity,
      totalAmount: payload.totalAmount,
      status: payload.status || 'paid',
      registration_date: payload.registrationDate || null
    });
    return mapOrder(created);
  },

  async listOrdersByUser(userId) {
    const docs = await OrderModel.find({ userId: toNumericId(userId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapOrder);
  },

  async listOrdersByEvent(eventId) {
    const docs = await OrderModel.find({ eventId: toNumericId(eventId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapOrder);
  },

  async createPayment(payload) {
    const created = await PaymentModel.create({
      _id: await nextNumericId(PaymentModel),
      registrationId: payload.registrationId != null ? toNumericId(payload.registrationId) : null,
      orderId: toNumericId(payload.orderId),
      amount: payload.amount,
      payment_method: payload.paymentMethod || 'mock-gateway',
      payment_status: payload.paymentStatus || 'paid',
      payment_date: payload.paymentDate || null
    });
    return mapPayment(created);
  },

  async updateOrder(id, updates) {
    const doc = await OrderModel.findByIdAndUpdate(
      toNumericId(id),
      { ...updates },
      { new: true, runValidators: true }
    ).lean().exec();
    return doc ? mapOrder(doc) : null;
  },

  async getOrderById(id) {
    const doc = await OrderModel.findById(toNumericId(id)).lean().exec();
    return doc ? mapOrder(doc) : null;
  },

  async listPaymentsByOrder(orderId) {
    const docs = await PaymentModel.find({ orderId: toNumericId(orderId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapPayment);
  },

  async createOrUpdateReview(payload) {
    const doc = await ReviewModel.findOneAndUpdate(
      { userId: toNumericId(payload.userId), eventId: toNumericId(payload.eventId) },
      {
        userId: toNumericId(payload.userId),
        eventId: toNumericId(payload.eventId),
        rating: payload.rating,
        comment: payload.comment || ''
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    return mapReview(doc);
  },

  async listReviewsByEvent(eventId) {
    const docs = await ReviewModel.find({ eventId: toNumericId(eventId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapReview);
  }
};
