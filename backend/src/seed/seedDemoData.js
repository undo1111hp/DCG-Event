import bcrypt from 'bcryptjs';

const ADMIN_ACCOUNT = {
  name: 'Pixel Admin',
  email: 'admin@dcg-event.local',
  password: 'Admin12345!'
};

const CUSTOMER_ACCOUNT = {
  name: 'Demo Customer',
  email: 'customer@dcg-event.local',
  password: 'Customer12345!'
};

const ORGANIZER_ACCOUNT = {
  name: 'Demo Organizer',
  email: 'organizer@dcg-event.local',
  password: 'Organizer12345!'
};

const DEMO_EVENTS = [
  {
    title: 'Block Drop Championship',
    description: 'Stack and clear lines in our retro speed challenge.',
    location: 'Arcade Hall A',
    date: '2026-05-11 19:30'
  },
  {
    title: 'Neon Grid Night',
    description: 'Community mixer with pixel art booths and synth tunes.',
    location: 'Downtown Retro Arena',
    date: '2026-05-18 18:00'
  },
  {
    title: '8-Bit Builders Meetup',
    description: 'Show-and-tell for indie creators building game-inspired tools.',
    location: 'Lab 7, Innovation Hub',
    date: '2026-06-02 17:45'
  }
];

const DEMO_CATEGORIES = ['Music', 'Sports', 'Workshop'];

const DEMO_VENUES = [
  { name: 'Arcade Hall A', address: '12 Pixel St', city: 'Hanoi', capacity: 400 },
  { name: 'Downtown Retro Arena', address: '88 Neon Ave', city: 'HCMC', capacity: 850 },
  { name: 'Innovation Hub Lab 7', address: '21 Circuit Rd', city: 'Da Nang', capacity: 250 }
];

export async function seedDemoData(authRepository, eventsRepository, domainRepository) {
  let admin = await authRepository.findUserByEmail(ADMIN_ACCOUNT.email);

  if (!admin) {
    const password_hash = await bcrypt.hash(ADMIN_ACCOUNT.password, 10);
    admin = await authRepository.createUser({
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      password_hash,
      role: 'admin'
    });
  }

  let customer = await authRepository.findUserByEmail(CUSTOMER_ACCOUNT.email);
  if (!customer) {
    const password_hash = await bcrypt.hash(CUSTOMER_ACCOUNT.password, 10);
    customer = await authRepository.createUser({
      name: CUSTOMER_ACCOUNT.name,
      email: CUSTOMER_ACCOUNT.email,
      password_hash,
      role: 'user'
    });
  }

  let organizer = await authRepository.findUserByEmail(ORGANIZER_ACCOUNT.email);
  if (!organizer) {
    const password_hash = await bcrypt.hash(ORGANIZER_ACCOUNT.password, 10);
    organizer = await authRepository.createUser({
      name: ORGANIZER_ACCOUNT.name,
      email: ORGANIZER_ACCOUNT.email,
      password_hash,
      role: 'organizer'
    });
  }

  let categories = await domainRepository.listCategories();
  if (categories.length === 0) {
    for (const name of DEMO_CATEGORIES) {
      await domainRepository.createCategory({ name });
    }
    categories = await domainRepository.listCategories();
  }

  let venues = await domainRepository.listVenues();
  if (venues.length === 0) {
    for (const venue of DEMO_VENUES) {
      await domainRepository.createVenue(venue);
    }
    venues = await domainRepository.listVenues();
  }

  const existing = await eventsRepository.listEvents();
  if (existing.length === 0) {
    for (const event of DEMO_EVENTS) {
      await eventsRepository.createEvent({
        ...event,
        organizer_id: organizer.id,
        category_ids: categories.slice(0, 2).map((c) => c.id),
        venue_ids: venues.slice(0, 1).map((v) => v.id)
      });
    }
  }

  const demoEvents = await eventsRepository.listEvents();
  for (const event of demoEvents) {
    const tickets = await domainRepository.listTicketsByEvent(event.id);
    if (tickets.length === 0) {
      await domainRepository.createTicket({
        event_id: event.id,
        type: 'Standard',
        price: 199000,
        quantity_available: 120
      });

      await domainRepository.createTicket({
        event_id: event.id,
        type: 'VIP',
        price: 499000,
        quantity_available: 40
      });
    }
  }

  const seededRegistrations = await eventsRepository.listRegistrationsForUser(customer.id);
  if (seededRegistrations.length === 0) {
    for (const event of demoEvents.slice(0, 2)) {
      await eventsRepository.registerForEvent(event.id, customer.id);
    }
  }

  const existingOrders = await domainRepository.listOrdersByUser(customer.id);
  if (existingOrders.length === 0 && demoEvents.length > 0) {
    const firstEvent = demoEvents[0];
    const tickets = await domainRepository.listTicketsByEvent(firstEvent.id);
    const selected = tickets[0];
    if (selected && selected.quantity_available > 0) {
      await domainRepository.updateTicket(selected.id, {
        quantity_available: selected.quantity_available - 1
      });

      const now = new Date().toISOString();
      const order = await domainRepository.createOrder({
        user_id: customer.id,
        event_id: firstEvent.id,
        ticket_id: selected.id,
        quantity: 1,
        total_amount: selected.price,
        status: 'paid',
        registration_date: now
      });

      await domainRepository.createPayment({
        order_id: order.id,
        amount: selected.price,
        payment_method: 'mock-gateway',
        payment_status: 'paid',
        payment_date: now
      });
    }
  }

  if (demoEvents.length > 0) {
    await domainRepository.createOrUpdateReview({
      user_id: customer.id,
      event_id: demoEvents[0].id,
      rating: 5,
      comment: 'Awesome event and smooth ticket booking.'
    });
  }

  return {
    admin_email: ADMIN_ACCOUNT.email,
    admin_password: ADMIN_ACCOUNT.password,
    customer_email: CUSTOMER_ACCOUNT.email,
    customer_password: CUSTOMER_ACCOUNT.password,
    organizer_email: ORGANIZER_ACCOUNT.email,
    organizer_password: ORGANIZER_ACCOUNT.password,
    demo_event_count: DEMO_EVENTS.length
  };
}
