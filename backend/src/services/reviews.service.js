import { ApiError } from '../utils/apiError.js';

export function createReviewsService(eventsRepository, domainRepository) {
  async function addReview(userId, eventId, payload) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    const rating = Number(payload.rating);
    if (Number.isNaN(rating) || rating < 1 || rating > 5) {
      throw new ApiError(400, 'rating must be from 1 to 5');
    }

    return domainRepository.createOrUpdateReview({
      user_id: userId,
      event_id: eventId,
      rating,
      comment: payload.comment || ''
    });
  }

  async function listReviewsByEvent(eventId) {
    const event = await eventsRepository.getEventById(eventId);
    if (!event) {
      throw new ApiError(404, 'Event not found');
    }

    return domainRepository.listReviewsByEvent(eventId);
  }

  return {
    addReview,
    listReviewsByEvent
  };
}
