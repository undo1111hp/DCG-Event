# DCG Event — Project Specification

> **Purpose:** This document is the single source of truth for the DCG Event Management System. Any new AI session should read this file first to understand the full project context.

---

## 1. Project Overview

**DCG Event** is a full-stack event management platform with a retro 8-bit arcade UI theme. It supports event browsing, user registration, role-based access control, ticketing, mock payments, and reviews.

**Status:** Production-ready for local/memory mode. MongoDB Atlas integration is complete and validated.

---

## 2. Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | React 18, React Router 6, Vite 5, Framer Motion  |
| Backend    | Node.js, Express 4, ES Modules (`"type": "module"`) |
| Auth       | JWT (jsonwebtoken), bcryptjs                      |
| Database   | In-memory (default) **or** MongoDB Atlas (Mongoose 8) |
| Styling    | Custom CSS with 8-bit retro/arcade theme          |
| Dev tools  | Nodemon (backend), Vite dev server (frontend)     |

---

## 3. Architecture

```
┌──────────────┐     HTTP/JSON     ┌──────────────┐     Mongoose      ┌──────────────┐
│   Frontend   │ ◄──────────────► │   Backend    │ ◄──────────────► │   MongoDB    │
│  React+Vite  │   localhost:5173  │  Express API │   localhost:5000  │    Atlas     │
└──────────────┘                   └──────────────┘                   └──────────────┘
```

### Backend Layers (top → bottom)

```
Routes → Middleware → Services → Repositories → Data Store (Memory or Mongo)
```

- **Routes** — Define HTTP endpoints, wire middleware, delegate to services
- **Middleware** — Auth guards, validation, error handling
- **Services** — Business logic (auth, events, commerce, metadata, reviews)
- **Repositories** — Data access abstraction with two implementations:
  - `*.repository.memory.js` — In-memory arrays (for local dev)
  - `*.repository.mongo.js` — Mongoose models (for Atlas)
- **Repository factory** (`repositories/index.js`) — Selects implementation based on `STORAGE_MODE` env var

### Frontend Layers

```
Pages → Context (AuthContext) → Services (api.js) → Backend API
```

- **Pages** — Full-page components for each route
- **Components** — Reusable UI (Layout, ProtectedRoute, Toast, TetrisBackground, etc.)
- **AuthContext** — React context for auth state, login/logout/register
- **api.js** — Centralized fetch wrapper with JWT token injection

---

## 4. Data Models (Mongoose Schemas)

All collections use **numeric `_id`** fields (not ObjectId). Collection names are **capitalized singular** (e.g., `Event`, `User`).

### User
| Field       | Type   | Notes                                      |
| ----------- | ------ | ------------------------------------------ |
| `_id`       | Number | Numeric ID                                 |
| `name`      | String | Required                                   |
| `email`     | String | Required, unique                           |
| `password`  | String | bcrypt hash (or legacy plaintext for Atlas)|
| `phone`     | String | Optional                                   |
| `role`      | String | `admin` \| `organizer` \| `user`           |
| `created_at`| String | ISO date string                            |

### Event
| Field          | Type     | Notes                           |
| -------------- | -------- | ------------------------------- |
| `_id`          | Number   | Numeric ID                      |
| `title`        | String   | Required                        |
| `description`  | String   | Optional                        |
| `start_time`   | String   | ISO datetime                    |
| `end_time`     | String   | ISO datetime                    |
| `rating_avg`   | Number   | Computed from reviews           |
| `rating_count` | Number   | Computed from reviews           |
| `categoryIds`  | Mixed[]  | References to Category          |
| `venueIds`     | Mixed[]  | References to Venue             |


### Category
| Field  | Type   | Notes       |
| ------ | ------ | ----------- |
| `_id`  | Number | Numeric ID  |
| `name` | String | Required, unique |

### Venue
| Field      | Type   | Notes             |
| ---------- | ------ | ----------------- |
| `_id`      | Number | Numeric ID        |
| `name`     | String | Required          |
| `address`  | String | Optional          |
| `city`     | String | Required          |
| `capacity` | Number | Required, min: 1  |

### EventCategory (Junction Table)
| Field        | Type   | Notes                |
| ------------ | ------ | -------------------- |
| `_id`        | Number | Numeric ID           |
| `eventId`    | Number | FK → Event           |
| `categoryId` | Number | FK → Category        |
| *index*      |        | Unique (eventId, categoryId) |

### Ticket
| Field              | Type   | Notes                        |
| ------------------ | ------ | ---------------------------- |
| `_id`              | Number | Numeric ID                   |
| `eventId`          | Number | FK → Event                   |
| `type`             | String | e.g., "VIP", "General"       |
| `price`            | Number | Required, min: 0             |
| `quantityAvailable`| Number | Required, min: 0             |
| `quantity_available`| Number | Legacy Atlas field           |
| *index*            |        | Unique (eventId, type)       |

### Order
| Field              | Type   | Notes                                          |
| ------------------ | ------ | ---------------------------------------------- |
| `_id`              | Number | Numeric ID                                     |
| `userId`           | Mixed  | FK → User                                      |
| `eventId`          | Mixed  | FK → Event                                     |
| `ticketId`         | Mixed  | FK → Ticket                                    |
| `quantity`         | Number | Required, min: 1                               |
| `totalAmount`      | Number | Computed                                       |
| `status`           | String | `pending` \| `paid` \| `confirmed` \| `failed` \| `cancelled` |
| `registrationDate` | String | camelCase field                                |
| `registration_date`| String | snake_case Atlas field                         |

### Payment
| Field           | Type   | Notes                                             |
| --------------- | ------ | ------------------------------------------------- |
| `_id`           | Number | Numeric ID                                        |
| `orderId`       | Mixed  | FK → Order                                        |
| `registrationId`| Mixed  | Optional FK → Registration                        |
| `amount`        | Number | Required, min: 0                                  |
| `paymentMethod` | String | Default: `mock-gateway`                           |
| `payment_method`| String | snake_case Atlas field                            |
| `paymentStatus` | String | `pending` \| `paid` \| `success` \| `failed` \| `refunded` |
| `payment_status`| String | snake_case Atlas field                            |
| `paymentDate`   | String | camelCase field                                   |
| `payment_date`  | String | snake_case Atlas field                            |

### Registration
| Field     | Type   | Notes                              |
| --------- | ------ | ---------------------------------- |
| `_id`     | Number | Numeric ID                         |
| `eventId` | Mixed  | FK → Event                         |
| `userId`  | Mixed  | FK → User                          |
| *index*   |        | Unique (eventId, userId)           |

### Review
| Field     | Type   | Notes                    |
| --------- | ------ | ------------------------ |
| `_id`     | Number | Numeric ID               |
| `userId`  | Mixed  | FK → User                |
| `eventId` | Mixed  | FK → Event               |
| `rating`  | Number | 1–5, required            |
| `comment` | String | Optional                 |
| *index*   |        | Unique (userId, eventId) |

---

## 5. API Endpoints

### Auth (`/api/auth`)
| Method | Path                | Auth     | Description                    |
| ------ | ------------------- | -------- | ------------------------------ |
| POST   | `/register`         | Public   | Register new user (role=user)  |
| POST   | `/login`            | Public   | Login, returns JWT             |
| GET    | `/me`               | Bearer   | Get current user profile       |
| PUT    | `/me`               | Bearer   | Update profile (name, email)   |
| PUT    | `/me/password`      | Bearer   | Change password                |
| GET    | `/me/registrations` | Bearer   | List user's event registrations|

### Events (`/api/events`)
| Method | Path                         | Auth           | Description                        |
| ------ | ---------------------------- | -------------- | ---------------------------------- |
| GET    | `/`                          | Optional       | List events (public, with search)  |
| GET    | `/manage`                    | Organizer/Admin| List organizer's events            |
| POST   | `/`                          | Organizer/Admin| Create event                       |
| GET    | `/:eventId`                  | Optional       | Get event detail                   |
| GET    | `/:eventId/stats`            | Organizer/Admin| Get event statistics               |
| PUT    | `/:eventId`                  | Organizer/Admin| Update event                       |
| DELETE | `/:eventId`                  | Organizer/Admin| Delete event                       |
| POST   | `/:eventId/categories/:catId`| Organizer/Admin| Link category to event             |
| DELETE | `/:eventId/categories/:catId`| Organizer/Admin| Unlink category from event         |
| POST   | `/:eventId/register`         | Bearer         | Register for event                 |
| GET    | `/:eventId/registrations`    | Organizer/Admin| List registrations for event       |

### Commerce (`/api/commerce`)
| Method | Path                              | Auth           | Description              |
| ------ | --------------------------------- | -------------- | ------------------------ |
| POST   | `/events/:eventId/tickets`        | Organizer/Admin| Create ticket type       |
| GET    | `/events/:eventId/tickets`        | Public         | List tickets for event   |
| PUT    | `/events/:eventId/tickets/:id`    | Organizer/Admin| Update ticket type       |
| DELETE | `/events/:eventId/tickets/:id`    | Organizer/Admin| Delete ticket type       |
| POST   | `/events/:eventId/orders`         | Bearer         | Create order + payment   |
| GET    | `/my-orders`                      | Bearer         | List user's orders       |
| GET    | `/events/:eventId/orders`         | Organizer/Admin| List orders for event    |
| GET    | `/orders/:orderId/payments`       | Bearer         | List payments for order  |
| PUT    | `/orders/:orderId/pay`            | Bearer         | Pay an order             |
| PUT    | `/orders/:orderId/cancel`         | Bearer         | Cancel an order          |

### Metadata (`/api/meta`)
| Method | Path            | Auth           | Description           |
| ------ | --------------- | -------------- | --------------------- |
| GET    | `/categories`   | Public         | List all categories   |
| POST   | `/categories`   | Organizer/Admin| Create category       |
| GET    | `/venues`       | Public         | List all venues       |
| POST   | `/venues`       | Admin          | Create venue          |
| PUT    | `/venues/:id`   | Admin          | Update venue          |

### Reviews (`/api`)
| Method | Path                    | Auth   | Description            |
| ------ | ----------------------- | ------ | ---------------------- |
| GET    | `/events/:eventId/reviews` | Public | List reviews for event |
| POST   | `/events/:eventId/reviews` | Bearer | Add review             |

### Admin (`/api/admin`)
| Method | Path                | Auth  | Description            |
| ------ | ------------------- | ----- | ---------------------- |
| GET    | `/users`            | Admin | List all users         |
| PUT    | `/users/:userId/role`| Admin | Update user's role     |

### Health
| Method | Path        | Auth   | Description     |
| ------ | ----------- | ------ | --------------- |
| GET    | `/api/health`| Public | Health check    |

---

## 6. Frontend Routes

| Path                     | Component         | Access           |
| ------------------------ | ----------------- | ---------------- |
| `/`                      | `EventsPage`      | Public           |
| `/events/:eventId`       | `EventDetailPage` | Public           |
| `/login`                 | `LoginPage`       | Public           |
| `/register`              | `RegisterPage`    | Public (user only)|
| `/dashboard`             | `DashboardPage`   | Authenticated    |
| `/my-tickets`            | `MyTicketsPage`   | Authenticated    |
| `/account`               | `AccountPage`     | Authenticated    |
| `/admin`                 | `AdminPage`       | Admin only       |
| `/events/stats`          | `EventStatsPage`  | Organizer/Admin  |
| `/events/new`            | `EventFormPage`   | Organizer/Admin  |
| `/events/:eventId/edit`  | `EventFormPage`   | Organizer/Admin  |

---

## 7. Role-Based Access Control

| Capability                  | `user` | `organizer` | `admin` |
| --------------------------- | ------ | ----------- | ------- |
| Browse events               | ✅     | ✅          | ✅      |
| Register for events         | ✅     | ✅          | ✅      |
| Buy tickets                 | ✅     | ✅          | ✅      |
| Write reviews               | ✅     | ✅          | ✅      |
| Create/edit own events      | ❌     | ✅          | ✅      |
| Manage own event tickets    | ❌     | ✅          | ✅      |
| Create categories           | ❌     | ✅          | ✅      |
| Manage all events           | ❌     | ❌          | ✅      |
| Manage users/roles          | ❌     | ❌          | ✅      |
| Create/update venues        | ❌     | ❌          | ✅      |

**Signup is attendee-only by default.** Role upgrades (to organizer/admin) are done via admin role management.

---

## 8. Environment Configuration

### Backend (`.env`)
```env
PORT=5000
JWT_SECRET=change_me_to_a_long_random_secret
STORAGE_MODE=memory          # "memory" or "mongo"
MONGODB_URI=                 # MongoDB Atlas connection string
MONGODB_DB_NAME=EventManagement
SEED_DEMO_DATA=false         # true = seed demo data on startup (memory mode auto-enables)
```

### Frontend (`.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 9. Running the Project

### Start Backend
```bash
cd backend
npm install
npm run dev          # Starts with nodemon on port 5000
```

### Start Frontend
```bash
cd frontend
npm install
npm run dev          # Starts Vite dev server on port 5173
```

### Upsert Image/Seed Data to Atlas
```bash
cd backend
npm run upsert:data  # Reads from image/data/*.json, upserts to MongoDB Atlas
```

---

## 10. Seed Credentials (Memory Mode Only)

| Role      | Email                         | Password          |
| --------- | ----------------------------- | ----------------- |
| Admin     | admin@dcg-event.local         | Admin12345!       |
| Organizer | organizer@dcg-event.local     | Organizer12345!   |
| Customer  | customer@dcg-event.local      | Customer12345!    |

---

## 11. Key Design Patterns & Conventions

1. **Repository Pattern** — All data access goes through repository interfaces. Two implementations exist (memory and mongo). The factory in `repositories/index.js` selects based on `STORAGE_MODE`.

2. **Service Layer** — Business logic lives in services, not routes. Services receive repositories via dependency injection (factory functions).

3. **Factory Functions** — Routes, services, and repositories are all created via factory functions (e.g., `createAuthRouter(authService, requireAuth)`), enabling testability.

4. **Numeric IDs** — All MongoDB documents use numeric `_id` fields, not ObjectId. This aligns with the Atlas `EventManagement` schema.

5. **Dual Field Names** — Some models have both camelCase and snake_case fields (e.g., `paymentMethod`/`payment_method`) for Atlas compatibility. When writing new code, prefer camelCase but be aware of legacy snake_case data.

6. **ES Modules** — The entire project uses `"type": "module"` (import/export syntax, no CommonJS require).

7. **Async Handler** — All route handlers are wrapped with `asyncHandler` for automatic error propagation.

8. **JWT in localStorage** — The frontend stores the JWT token in `localStorage` under key `dcg_token`.

9. **Strict: false** — Mongoose schemas use `{ strict: false }` to allow flexible field handling with Atlas data.

10. **Retro 8-bit Theme** — The frontend uses a custom CSS arcade/retro theme with `TetrisBackground`, scanline overlays, and pixel-style fonts.

---

## 12. File Structure Reference

```
DCG-Event/
├── AGENT-HANDOFF.md              # Cross-session continuity log
├── PROJECT-SPEC.md               # This file — full project spec
├── README.md                     # User-facing readme
├── image/                        # Seed data JSON files
│   └── data/
│       ├── categories.json
│       ├── events.json
│       ├── orders.json
│       ├── payments.json
│       ├── reviews.json
│       ├── tickets.json
│       ├── users.json
│       ├── venues.json
│       └── genData.js            # Data generator script
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── scripts/
│   │   └── upsert_image_data.js  # Atlas data upsert script
│   └── src/
│       ├── server.js             # Entry point (bootstrap + listen)
│       ├── app.js                # Express app factory
│       ├── config/
│       │   ├── db.js             # MongoDB connection
│       │   └── env.js            # Environment variable loading
│       ├── middleware/
│       │   ├── auth.js           # JWT auth guards (requireAuth, optionalAuth, requireAdmin, requireOrganizerOrAdmin)
│       │   ├── errorHandler.js   # 404 + global error handler
│       │   ├── validateAccountPayload.js
│       │   └── validateAuthPayload.js
│       ├── models/               # Mongoose schemas (10 models)
│       │   ├── Category.js, Event.js, EventCategory.js
│       │   ├── Order.js, Payment.js, Registration.js
│       │   ├── Review.js, Ticket.js, User.js, Venue.js
│       ├── repositories/         # Data access layer
│       │   ├── index.js          # Factory (memory vs mongo)
│       │   ├── memoryStore.js    # In-memory data store
│       │   ├── auth.repository.memory.js / .mongo.js
│       │   ├── events.repository.memory.js / .mongo.js
│       │   └── domain.repository.memory.js / .mongo.js
│       ├── routes/               # Express route definitions
│       │   ├── auth.routes.js, admin.routes.js
│       │   ├── events.routes.js, commerce.routes.js
│       │   ├── metadata.routes.js, reviews.routes.js
│       ├── services/             # Business logic
│       │   ├── auth.service.js, events.service.js
│       │   ├── commerce.service.js, metadata.service.js
│       │   └── reviews.service.js
│       ├── seed/
│       │   └── seedDemoData.js   # Demo data seeder (memory mode)
│       └── utils/
│           ├── apiError.js       # Custom error class
│           └── asyncHandler.js   # Async route wrapper
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── .env.example
    ├── index.html
    └── src/
        ├── main.jsx              # React entry point
        ├── App.jsx               # Router + route definitions
        ├── styles.css            # Global styles (8-bit theme)
        ├── components/
        │   ├── Layout.jsx        # Shell with nav + TetrisBackground
        │   ├── AdminRoute.jsx    # Admin-only route guard
        │   ├── OrganizerOrAdminRoute.jsx
        │   ├── ProtectedRoute.jsx
        │   ├── TetrisBackground.jsx
        │   ├── Toast.jsx, LoadingSpinner.jsx, PageTransition.jsx
        ├── context/
        │   └── AuthContext.jsx   # Auth state + login/logout/register
        ├── pages/
        │   ├── EventsPage.jsx, EventDetailPage.jsx
        │   ├── EventFormPage.jsx, EventStatsPage.jsx
        │   ├── DashboardPage.jsx, MyTicketsPage.jsx
        │   ├── AccountPage.jsx, AdminPage.jsx
        │   ├── LoginPage.jsx, RegisterPage.jsx
        └── services/
            └── api.js            # Centralized fetch wrapper
```

---

## 13. Known Quirks & Technical Debt

1. **Dual field names** — Payment and Order models have both camelCase and snake_case fields for Atlas compatibility. The `upsert_image_data.js` script handles mapping.
2. **Legacy password migration** — Login supports plaintext Atlas passwords and auto-migrates to bcrypt on successful login.
3. **Mixed ID types** — Some FK fields use `mongoose.Schema.Types.Mixed` to handle both numeric and ObjectId references.
4. **No image upload** — Event images are not yet supported; the `image/` directory contains seed data JSON, not actual images.
5. **Mock payments** — Payment processing is simulated (no real gateway integration).

---

## 14. Session Startup Checklist

When starting a new coding session:

1. ✅ Read this file (`PROJECT-SPEC.md`)
2. ✅ Read `AGENT-HANDOFF.md` for latest status and resume checklist
3. ✅ Check if backend/frontend dependencies are installed (`npm install`)
4. ✅ Determine storage mode needed (memory for quick dev, mongo for Atlas testing)
5. ✅ Start backend: `npm --prefix backend run dev`
6. ✅ Start frontend: `npm --prefix frontend run dev -- --host`
7. ✅ Verify: health check at `http://localhost:5000/api/health`

---

*Last updated: 2026-05-02*
