import { EventModel } from '../models/Event.js';
import { RegistrationModel } from '../models/Registration.js';
import { VenueModel } from '../models/Venue.js';

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

function toIdString(value) {
  return value == null ? null : String(value);
}

function mapEvent(doc) {
  const organizerSource = doc.organizerId ?? doc.organizerIds ?? doc.createdBy;
  const approvalStatus = doc.approvalStatus || 'approved';

  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    location: doc.location,
    date: doc.date || doc.start_time || doc.startTime || '',
    startTime: formatDate(doc.start_time || doc.startTime),
    endTime: formatDate(doc.end_time || doc.endTime),
    createdBy: toIdString(doc.createdBy ?? organizerSource),
    organizerId: toIdString(doc.organizerId ?? organizerSource),
    organizerIds: doc.organizerIds ?? organizerSource ?? null,
    approvalStatus,
    approvedBy: toIdString(doc.approvedBy),
    approvedAt: formatDate(doc.approvedAt),
    ratingAvg: doc.rating_avg ?? doc.ratingAvg ?? 0,
    ratingCount: doc.rating_count ?? doc.ratingCount ?? 0,
    categoryIds: (doc.categoryIds || []).map((id) => String(id)),
    venueIds: (doc.venueIds || []).map((id) => String(id)),
    createdAt: formatDate(doc.createdAt || doc.created_at),
    updatedAt: formatDate(doc.updatedAt || doc.updated_at)
  };
}

function mapRegistration(doc) {
  return {
    id: String(doc._id),
    eventId: String(doc.eventId),
    userId: String(doc.userId),
    status: doc.status || 'registered',
    registrationDate: formatDate(doc.registrationDate || doc.createdAt || doc.created_at),
    createdAt: formatDate(doc.createdAt || doc.created_at)
  };
}

async function hydrateEventLocations(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }

  const missingLocationEvents = events.filter(
    (event) => !String(event.location || '').trim() && Array.isArray(event.venueIds) && event.venueIds.length > 0
  );

  if (missingLocationEvents.length === 0) {
    return events;
  }

  const uniqueVenueIds = [
    ...new Set(missingLocationEvents.flatMap((event) => event.venueIds.map((venueId) => Number(venueId))))
  ].filter((venueId) => Number.isFinite(venueId));

  if (uniqueVenueIds.length === 0) {
    return events;
  }

  const venues = await VenueModel.find({ _id: { $in: uniqueVenueIds } }, { _id: 1, name: 1 })
    .lean()
    .exec();
  const venueNameById = new Map(venues.map((venue) => [String(venue._id), venue.name]));

  return events.map((event) => {
    if (String(event.location || '').trim()) {
      return event;
    }

    const venueNames = (event.venueIds || [])
      .map((venueId) => venueNameById.get(String(venueId)))
      .filter(Boolean);

    if (venueNames.length === 0) {
      return event;
    }

    return {
      ...event,
      location: venueNames.join(', ')
    };
  });
}

export const eventsRepositoryMongo = {
  async listEvents(options = {}) {
    const search = String(options.search || '').trim();
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Number(options.limit || 0));
    const approvalStatus = options.approvalStatus;
    const organizerId = options.organizerId;
    const numericOrganizerId = organizerId !== undefined ? toNumericId(organizerId) : null;

    const clauses = [];

    if (search) {
      clauses.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
          { date: { $regex: search, $options: 'i' } },
          { start_time: { $regex: search, $options: 'i' } },
          { end_time: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (approvalStatus === 'approved') {
      clauses.push({ $or: [{ approvalStatus: 'approved' }, { approvalStatus: { $exists: false } }] });
    } else if (approvalStatus) {
      clauses.push({ approvalStatus });
    }

    if (organizerId) {
      clauses.push({
        $or: [
          { organizerId: numericOrganizerId },
          { organizerIds: numericOrganizerId },
          { organizerIds: { $in: [numericOrganizerId] } },
          { createdBy: numericOrganizerId }
        ]
      });
    }

    const filter = clauses.length > 0 ? { $and: clauses } : {};

    if (!options.search && !options.page && !options.limit) {
      const docs = await EventModel.find(filter).sort({ _id: 1 }).lean().exec();
      return hydrateEventLocations(docs.map(mapEvent));
    }

    const totalItems = await EventModel.countDocuments(filter).exec();
    const effectiveLimit = limit || totalItems || 1;
    const totalPages = Math.max(1, Math.ceil(totalItems / effectiveLimit));
    const currentPage = Math.min(page, totalPages);
    const docs = await EventModel.find(filter)
      .sort({ _id: 1 })
      .skip((currentPage - 1) * effectiveLimit)
      .limit(effectiveLimit)
      .lean()
      .exec();

    const items = await hydrateEventLocations(docs.map(mapEvent));

    return {
      items,
      page: currentPage,
      totalPages,
      totalItems,
      limit: effectiveLimit
    };
  },

  async createEvent(payload) {
    const created = await EventModel.create({
      _id: await nextNumericId(EventModel),
      title: payload.title,
      description: payload.description || '',
      location: payload.location || '',
      start_time: payload.startTime || payload.start_time || payload.date || null,
      end_time: payload.endTime || payload.end_time || null,
      organizerId: toNumericId(payload.organizerId || payload.createdBy),
      categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds.map(toNumericId) : [],
      venueIds: Array.isArray(payload.venueIds) ? payload.venueIds.map(toNumericId) : [],
      rating_avg: payload.rating_avg ?? payload.ratingAvg ?? 0,
      rating_count: payload.rating_count ?? payload.ratingCount ?? 0
    });
    return mapEvent(created);
  },

  async getEventById(id) {
    const doc = await EventModel.findById(toNumericId(id)).lean().exec();
    if (!doc) {
      return null;
    }

    const [event] = await hydrateEventLocations([mapEvent(doc)]);
    return event || null;
  },

  async updateEvent(id, updates) {
    const doc = await EventModel.findByIdAndUpdate(toNumericId(id), {
      ...updates,
      start_time: updates.start_time,
      end_time: updates.end_time,
      organizerId: updates.organizerId != null ? toNumericId(updates.organizerId) : undefined,
      categoryIds: Array.isArray(updates.categoryIds) ? updates.categoryIds.map(toNumericId) : undefined,
      venueIds: Array.isArray(updates.venueIds) ? updates.venueIds.map(toNumericId) : undefined,
      rating_avg: updates.rating_avg ?? updates.ratingAvg,
      rating_count: updates.rating_count ?? updates.ratingCount
    }, {
      new: true,
      runValidators: true
    })
      .lean()
      .exec();

    return doc ? mapEvent(doc) : null;
  },

  async deleteEvent(id) {
    const deleted = await EventModel.findByIdAndDelete(toNumericId(id)).exec();
    if (!deleted) {
      return false;
    }

    await RegistrationModel.deleteMany({ eventId: toNumericId(id) }).exec();
    return true;
  },

  async registerForEvent(eventId, userId) {
    const doc = await RegistrationModel.findOneAndUpdate(
      { eventId: toNumericId(eventId), userId: toNumericId(userId) },
      {
        _id: await nextNumericId(RegistrationModel),
        eventId: toNumericId(eventId),
        userId: toNumericId(userId),
        created_at: formatDate(new Date())
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    return mapRegistration(doc);
  },

  async listRegistrationsForEvent(eventId) {
    const docs = await RegistrationModel.find({ eventId: toNumericId(eventId) }).lean().exec();
    return docs.map(mapRegistration);
  },

  async listRegistrationsForUser(userId) {
    const docs = await RegistrationModel.find({ userId: toNumericId(userId) }).lean().exec();
    return docs.map(mapRegistration);
  }
};
