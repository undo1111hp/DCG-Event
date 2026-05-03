import { CategoryModel } from '../models/Category.js';
import { VenueModel } from '../models/Venue.js';
import { TicketModel } from '../models/Ticket.js';
import { OrderModel } from '../models/Order.js';
import { PaymentModel } from '../models/Payment.js';
import { ReviewModel } from '../models/Review.js';
import { EventModel } from '../models/Event.js';

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
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
  };
}

function mapVenue(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    address: doc.address,
    city: doc.city,
    capacity: doc.capacity,
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
  };
}

function mapTicket(doc) {
  return {
    id: String(doc._id),
    event_id: String(doc.event_id),
    type: doc.type,
    price: doc.price,
    quantity_available: doc.quantity_available ?? 0,
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
  };
}

function mapOrder(doc) {
  return {
    id: String(doc._id),
    user_id: String(doc.user_id),
    event_id: String(doc.event_id),
    ticket_id: doc.ticket_id != null ? String(doc.ticket_id) : null,
    quantity: doc.quantity,
    total_amount: doc.total_amount,
    status: doc.status,
    registration_date: formatDate(doc.registration_date),
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
  };
}

function mapPayment(doc) {
  return {
    id: String(doc._id),
    registration_id: doc.registration_id != null ? String(doc.registration_id) : null,
    order_id: String(doc.order_id),
    amount: doc.amount,
    payment_method: doc.payment_method || 'mock-gateway',
    payment_status: doc.payment_status || 'paid',
    payment_date: formatDate(doc.payment_date),
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
  };
}

function mapReview(doc) {
  return {
    id: String(doc._id),
    user_id: String(doc.user_id),
    event_id: String(doc.event_id),
    rating: doc.rating,
    comment: doc.comment,
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
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
    const docs = await TicketModel.find({ event_id: toNumericId(eventId) }).lean().exec();
    return docs.map(mapTicket);
  },

  async createTicket(payload) {
    const created = await TicketModel.create({
      _id: await nextNumericId(TicketModel),
      event_id: toNumericId(payload.event_id),
      type: payload.type,
      price: payload.price,
      quantity_available: payload.quantity_available
    });
    return mapTicket(created);
  },

  async updateTicket(id, updates) {
    const doc = await TicketModel.findByIdAndUpdate(
      toNumericId(id),
      { ...updates },
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
      user_id: toNumericId(payload.user_id),
      event_id: toNumericId(payload.event_id),
      ticket_id: payload.ticket_id != null ? toNumericId(payload.ticket_id) : null,
      quantity: payload.quantity,
      total_amount: payload.total_amount,
      status: payload.status || 'paid',
      registration_date: payload.registration_date || null
    });
    return mapOrder(created);
  },

  async listOrdersByUser(userId) {
    const docs = await OrderModel.find({ user_id: toNumericId(userId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapOrder);
  },

  async listOrdersByEvent(eventId) {
    const docs = await OrderModel.find({ event_id: toNumericId(eventId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapOrder);
  },

  async createPayment(payload) {
    const created = await PaymentModel.create({
      _id: await nextNumericId(PaymentModel),
      registration_id: payload.registration_id != null ? toNumericId(payload.registration_id) : null,
      order_id: toNumericId(payload.order_id),
      amount: payload.amount,
      payment_method: payload.payment_method || 'mock-gateway',
      payment_status: payload.payment_status || 'paid',
      payment_date: payload.payment_date || null
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
    const docs = await PaymentModel.find({ order_id: toNumericId(orderId) }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapPayment);
  },

  async createOrUpdateReview(payload) {
    const filter = { user_id: toNumericId(payload.user_id), event_id: toNumericId(payload.event_id) };

    const existing = await ReviewModel.findOne(filter).lean().exec();

    const doc = await ReviewModel.findOneAndUpdate(
      filter,
      {
        $set: {
          rating: payload.rating,
          comment: payload.comment || ''
        },
        ...(existing
          ? {}
          : {
              $setOnInsert: {
                _id: await nextNumericId(ReviewModel),
                user_id: toNumericId(payload.user_id),
                event_id: toNumericId(payload.event_id)
              }
            })
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    // Recalculate rating_avg and rating_count on the Event document
    // event_id in Review is Mixed type — may be stored as string or number,
    // so query for both to handle any mismatch.
    const eventIdNumeric = toNumericId(payload.event_id);
    const eventIdString = String(payload.event_id);
    const allReviews = await ReviewModel.find({
      $or: [{ event_id: eventIdNumeric }, { event_id: eventIdString }]
    }).lean().exec();
    const rating_count = allReviews.length;
    const rating_avg = rating_count > 0
      ? Number((allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / rating_count).toFixed(2))
      : 0;
    await EventModel.updateOne(
      { _id: eventIdNumeric },
      { $set: { rating_avg, rating_count } }
    ).exec();

    return mapReview(doc);
  },

  async listReviewsByEvent(eventId) {
    const numericId = toNumericId(eventId);
    const stringId = String(eventId);
    const docs = await ReviewModel.find({
      $or: [{ event_id: numericId }, { event_id: stringId }]
    }).sort({ _id: -1 }).lean().exec();
    return docs.map(mapReview);
  }
};
