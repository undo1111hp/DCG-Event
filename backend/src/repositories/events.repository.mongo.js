import { EventModel } from '../models/Event.js';
import { RegistrationModel } from '../models/Registration.js';
import { VenueModel } from '../models/Venue.js';
import { CategoryModel } from '../models/Category.js';

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function dateOnly(value) {
  if (value == null) return null;
  const s = String(value);
  if (s.includes('T')) return s.split('T')[0];
  if (s.includes(' ')) return s.split(' ')[0];
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
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

async function resolveCategories(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }

  const allCategoryIds = [...new Set(events.flatMap((event) => (event.category_ids || []).map(toNumericId)))];
  if (allCategoryIds.length === 0) {
    return events.map((event) => ({ ...event, categories: [] }));
  }

  const categories = await CategoryModel.find({ _id: { $in: allCategoryIds } }).lean().exec();
  const categoryMap = new Map(categories.map((cat) => [cat._id, { id: String(cat._id), name: cat.name }]));

  return events.map((event) => {
    const catIds = (event.category_ids || []).map(toNumericId);
    const catObjs = catIds.map((catId) => categoryMap.get(catId)).filter(Boolean);
    return { ...event, categories: catObjs };
  });
}

function mapEvent(doc) {
  const organizerSource = doc.organizer_id ?? doc.organizer_ids;

  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    location: doc.location,
    date: doc.date || doc.start_time || '',
    start_time: dateOnly(doc.start_time || doc.date),
    end_time: dateOnly(doc.end_time),
    organizer_id: toIdString(doc.organizer_id ?? organizerSource),
    organizer_ids: doc.organizer_ids ?? organizerSource ?? null,
    rating_avg: doc.rating_avg ?? 0,
    rating_count: doc.rating_count ?? 0,
    category_ids: (doc.category_ids || []).map((id) => String(id)),
    venue_ids: (doc.venue_ids || []).map((id) => String(id)),
    created_at: formatDate(doc.created_at),
    updated_at: formatDate(doc.updated_at)
  };
}

function mapRegistration(doc) {
  return {
    id: String(doc._id),
    event_id: String(doc.event_id),
    user_id: String(doc.user_id),
    status: doc.status || 'registered',
    registration_date: formatDate(doc.created_at),
    created_at: formatDate(doc.created_at)
  };
}

async function hydrateEventLocations(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }

  const missingLocationEvents = events.filter(
    (event) => !String(event.location || '').trim() && Array.isArray(event.venue_ids) && event.venue_ids.length > 0
  );

  if (missingLocationEvents.length === 0) {
    return events;
  }

  const uniqueVenueIds = [
    ...new Set(missingLocationEvents.flatMap((event) => event.venue_ids.map((venueId) => Number(venueId))))
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

    const venueNames = (event.venue_ids || [])
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
    const hasPagination = options.page !== undefined || options.limit !== undefined;
    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Number(options.limit || 0));
    const organizerId = options.organizer_id;
    const categoryId = options.category_id;
    const numericOrganizerId = organizerId !== undefined ? toNumericId(organizerId) : null;
    const numericCategoryId = categoryId !== undefined ? toNumericId(categoryId) : null;

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

    if (organizerId) {
      clauses.push({
        $or: [
          { organizer_id: numericOrganizerId },
          { organizer_ids: numericOrganizerId },
          { organizer_ids: { $in: [numericOrganizerId] } }
        ]
      });
    }

    let filter = clauses.length > 0 ? { $and: clauses } : {};

    if (numericCategoryId) {
      filter = {
        ...filter,
        category_ids: numericCategoryId
      };
    }

    if (!hasPagination) {
      const docs = await EventModel.find(filter).sort({ _id: 1 }).lean().exec();
      const mapped = docs.map(mapEvent);
      const hydrated = await hydrateEventLocations(mapped);
      return await resolveCategories(hydrated);
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

    const mapped = docs.map(mapEvent);
    const hydrated = await hydrateEventLocations(mapped);
    const categorized = await resolveCategories(hydrated);

    return {
      items: categorized,
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
      start_time: dateOnly(payload.start_time || payload.date || null),
      end_time: dateOnly(payload.end_time || null),
      organizer_id: toNumericId(payload.organizer_id),
      category_ids: Array.isArray(payload.category_ids) ? payload.category_ids.map(toNumericId) : [],
      venue_ids: Array.isArray(payload.venue_ids) ? payload.venue_ids.map(toNumericId) : [],
      rating_avg: payload.rating_avg ?? 0,
      rating_count: payload.rating_count ?? 0
    });
    return mapEvent(created);
  },

  async getEventById(id) {
    const doc = await EventModel.findById(toNumericId(id)).lean().exec();
    if (!doc) {
      return null;
    }

    const mapped = mapEvent(doc);
    const [hydrated] = await hydrateEventLocations([mapped]);
    const [categorized] = await resolveCategories([hydrated]);
    return categorized || null;
  },

  async updateEvent(id, updates) {
    const doc = await EventModel.findByIdAndUpdate(toNumericId(id), {
      ...updates,
      start_time: updates.start_time != null ? dateOnly(updates.start_time) : undefined,
      end_time: updates.end_time != null ? dateOnly(updates.end_time) : undefined,
      organizer_id: updates.organizer_id != null ? toNumericId(updates.organizer_id) : undefined,
      category_ids: Array.isArray(updates.category_ids) ? updates.category_ids.map(toNumericId) : undefined,
      venue_ids: Array.isArray(updates.venue_ids) ? updates.venue_ids.map(toNumericId) : undefined
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

    await RegistrationModel.deleteMany({ event_id: toNumericId(id) }).exec();
    return true;
  },

  async registerForEvent(eventId, userId) {
    const doc = await RegistrationModel.findOneAndUpdate(
      { event_id: toNumericId(eventId), user_id: toNumericId(userId) },
      {
        _id: await nextNumericId(RegistrationModel),
        event_id: toNumericId(eventId),
        user_id: toNumericId(userId),
        created_at: formatDate(new Date())
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
      .lean()
      .exec();

    return mapRegistration(doc);
  },

  async listRegistrationsForEvent(eventId) {
    const docs = await RegistrationModel.find({ event_id: toNumericId(eventId) }).lean().exec();
    return docs.map(mapRegistration);
  },

  async listRegistrationsForUser(userId) {
    const docs = await RegistrationModel.find({ user_id: toNumericId(userId) }).lean().exec();
    return docs.map(mapRegistration);
  },

  async linkCategoryToEvent(eventId, categoryId) {
    const numericEventId = toNumericId(eventId);
    const numericCategoryId = toNumericId(categoryId);

    await EventModel.findByIdAndUpdate(
      numericEventId,
      { $addToSet: { category_ids: numericCategoryId } }
    ).exec();

    return { event_id: String(numericEventId), category_id: String(numericCategoryId) };
  },

  async unlinkCategoryFromEvent(eventId, categoryId) {
    const numericEventId = toNumericId(eventId);
    const numericCategoryId = toNumericId(categoryId);

    const doc = await EventModel.findByIdAndUpdate(
      numericEventId,
      { $pull: { category_ids: numericCategoryId } },
      { new: true }
    ).exec();

    return Boolean(doc);
  },

  async unlinkAllCategoriesFromEvent(eventId) {
    await EventModel.findByIdAndUpdate(
      toNumericId(eventId),
      { $set: { category_ids: [] } }
    ).exec();
  },

  async migrateCategoriesToJunctionTable() {
    // No-op: categories are embedded in the Event document
    return 0;
  }
};
