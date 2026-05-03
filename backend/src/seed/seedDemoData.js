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
    const passwordHash = await bcrypt.hash(ADMIN_ACCOUNT.password, 10);
    admin = await authRepository.createUser({
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      passwordHash,
      role: 'admin'
    });
  }

  let customer = await authRepository.findUserByEmail(CUSTOMER_ACCOUNT.email);
  if (!customer) {
    const passwordHash = await bcrypt.hash(CUSTOMER_ACCOUNT.password, 10);
    customer = await authRepository.createUser({
      name: CUSTOMER_ACCOUNT.name,
      email: CUSTOMER_ACCOUNT.email,
      passwordHash,
      role: 'user'
    });
  }

  let organizer = await authRepository.findUserByEmail(ORGANIZER_ACCOUNT.email);
  if (!organizer) {
    const passwordHash = await bcrypt.hash(ORGANIZER_ACCOUNT.password, 10);
    organizer = await authRepository.createUser({
      name: ORGANIZER_ACCOUNT.name,
      email: ORGANIZER_ACCOUNT.email,
      passwordHash,
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
        organizerId: organizer.id,
        categoryIds: categories.slice(0, 2).map((c) => c.id),
        venueIds: venues.slice(0, 1).map((v) => v.id)
      });
    }
  }

  const demoEvents = await eventsRepository.listEvents();
  for (const event of demoEvents) {
    const tickets = await domainRepository.listTicketsByEvent(event.id);
    if (tickets.length === 0) {
      await domainRepository.createTicket({
        eventId: event.id,
        type: 'Standard',
        price: 199000,
        quantityAvailable: 120
      });

      await domainRepository.createTicket({
        eventId: event.id,
        type: 'VIP',
        price: 499000,
        quantityAvailable: 40
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
    if (selected && selected.quantityAvailable > 0) {
      await domainRepository.updateTicket(selected.id, {
        quantityAvailable: selected.quantityAvailable - 1
      });

      const now = new Date().toISOString();
      const order = await domainRepository.createOrder({
        userId: customer.id,
        eventId: firstEvent.id,
        ticketId: selected.id,
        quantity: 1,
        totalAmount: selected.price,
        status: 'paid',
        registrationDate: now
      });

      await domainRepository.createPayment({
        orderId: order.id,
        amount: selected.price,
        paymentMethod: 'mock-gateway',
        paymentStatus: 'paid',
        paymentDate: now
      });
    }
  }

  if (demoEvents.length > 0) {
    await domainRepository.createOrUpdateReview({
      userId: customer.id,
      eventId: demoEvents[0].id,
      rating: 5,
      comment: 'Awesome event and smooth ticket booking.'
    });
  }

  return {
    adminEmail: ADMIN_ACCOUNT.email,
    adminPassword: ADMIN_ACCOUNT.password,
    customerEmail: CUSTOMER_ACCOUNT.email,
    customerPassword: CUSTOMER_ACCOUNT.password,
    organizerEmail: ORGANIZER_ACCOUNT.email,
    organizerPassword: ORGANIZER_ACCOUNT.password,
    demoEventCount: DEMO_EVENTS.length
  };
}
