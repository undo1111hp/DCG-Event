# DCG Event Management System

A full-stack event platform with a retro 8-bit UI theme.

- Frontend: React + Vite
- Backend: Node.js + Express + JWT
- Data layer: memory mode (default) and MongoDB Atlas-ready mode

## Table of Contents

- Overview
- Features
- Tech Stack
- Project Structure
- Getting Started
- Environment Variables
- MongoDB Atlas Integration Guide
- API Overview
- Demo Accounts (Local Memory Mode)
- Development Notes

## Overview

This project includes:

- Public event browsing
- User registration/login
- Role-based accounts: attendee, organizer, admin
- Attendee-only public signup flow (role elevation managed by admin)
- User dashboard with activity, badges, and progress meter
- Event management with category and venue support
- Ticket type management, ticket ordering, mock payment recording
- Review and comment system for events
- Account settings for profile and password updates

The app starts in `memory` mode by default for easy local testing, and can be switched to `mongo` mode to use MongoDB Atlas.

## Features

- 8-bit arcade-inspired frontend styling and transitions
- Role-based access (`admin`, `organizer`, `user`)
- Public visibility gating for events (approved events are visible to attendees/public users)
- JWT-based authentication
- Event registration flow
- Event CRUD + search/pagination endpoints
- Category and venue management
- Ticketing + order + payment modules
- Event review module
- Admin user management (list users, update roles)
- Seeded local demo users and demo events

## Tech Stack

- React 18
- Vite 5
- Node.js + Express 4
- Mongoose 8
- JSON Web Token
- bcryptjs

## Project Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   └── db.js
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── seed/
│   │   ├── services/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── styles.css
│   └── package.json
├── AGENT-HANDOFF.md
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Run backend

```bash
cd ../backend
npm run dev
```

### 3. Run frontend

```bash
cd ../frontend
npm run dev
```

App URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

You can also run from repository root:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev -- --host
```

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

```bash
PORT=5000
JWT_SECRET=change_me_to_a_long_random_secret
STORAGE_MODE=memory
MONGODB_URI=
MONGODB_DB_NAME=EventManagement
SEED_DEMO_DATA=false
```

`STORAGE_MODE` supports:

- `memory` (default local mode)
- `mongo` (MongoDB Atlas mode)

## MongoDB Atlas Integration Guide

This project is already wired for Atlas. To connect your own cluster, follow these steps.

### Step 1: Create your Atlas connection string

In Atlas, copy your URI (example):

```text
mongodb+srv://<username>:<password>@<cluster-url>/
```

Ensure your Atlas IP access list and DB user credentials are configured.

### Step 2: Update backend environment file

Edit `backend/.env`:

```bash
STORAGE_MODE=mongo
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/
MONGODB_DB_NAME=EventManagement
JWT_SECRET=your_strong_secret
SEED_DEMO_DATA=false
```

### Step 3: Restart backend

```bash
cd backend
npm run dev
```

On success, backend logs include `MongoDB connected`.

### Step 4: Verify API health

Test:

- `GET /api/health`

### What to edit if you customize Atlas integration

Most users only need `.env` changes. If you want custom behavior, edit these files:

- `backend/src/config/env.js`
  - Add or rename environment variables.
- `backend/src/config/db.js`
  - Customize Mongoose connection options and logging.
- `backend/src/repositories/index.js`
  - Change data-source selection logic.
- `backend/src/models/*.js`
  - Modify schema fields, indexes, validation rules.
- `backend/src/repositories/*mongo.js`
  - Customize query behavior, pagination, filtering.

### Atlas readiness notes

- `memory` mode seed data is local-only.
- In `mongo` mode, seeding is controlled by `SEED_DEMO_DATA` and should stay `false` for live Atlas usage.
- This backend is aligned to EventManagement-style schema: capitalized collection names and numeric IDs.
- Login supports legacy plaintext password records in Atlas and auto-migrates them to bcrypt on successful login.
- New payment and order records are persisted in Atlas snake_case fields (`payment_method`, `payment_status`, `payment_date`, `registration_date`) while API responses remain camelCase for frontend compatibility.
- For production use, rotate secrets and use environment-specific `.env` handling.

## API Overview

### Health

- `GET /api/health`

### Auth

- `POST /api/auth/register`
  - Creates attendee (`user`) account only
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `PUT /api/auth/me/password`
- `GET /api/auth/me/registrations`

### Events

- `GET /api/events`
  - Supports query params: `search`, `page`, `limit`
  - Returns approved events for public/attendee users
- `GET /api/events/manage` (organizer/admin)
- `POST /api/events` (organizer/admin)
- `GET /api/events/:event_id`
- `GET /api/events/:event_id/stats` (organizer/admin for manageable events)
- `PUT /api/events/:event_id` (organizer/admin)
- `DELETE /api/events/:event_id` (organizer/admin)
- `POST /api/events/:event_id/register`
- `GET /api/events/:event_id/registrations` (organizer/admin for manageable events)

### Metadata

- `GET /api/meta/categories`
- `POST /api/meta/categories` (organizer/admin)
- `GET /api/meta/venues`
- `POST /api/meta/venues` (organizer/admin)

### Commerce

- `GET /api/commerce/events/:event_id/tickets`
- `POST /api/commerce/events/:event_id/tickets` (organizer/admin)
- `POST /api/commerce/events/:event_id/orders` (attendee/authenticated)
- `GET /api/commerce/my-orders`
- `GET /api/commerce/events/:event_id/orders` (organizer/admin)
- `GET /api/commerce/orders/:order_id/payments`

### Admin

- `GET /api/admin/users` (admin)
- `PUT /api/admin/users/:user_id/role` (admin)

### Reviews

- `GET /api/events/:event_id/reviews`
- `POST /api/events/:event_id/reviews`

## Demo Accounts (Local Memory Mode)

These are auto-seeded in memory mode for quick testing.

- Admin:
  - Email: `admin@dcg-event.local`
  - Password: `Admin12345!`
- Customer:
  - Email: `customer@dcg-event.local`
  - Password: `Customer12345!`
- Organizer:
  - Email: `organizer@dcg-event.local`
  - Password: `Organizer12345!`

## Development Notes

- Frontend API base URL is configured in `frontend/.env.example`.
- If backend routes or auth payloads change, update `frontend/src/services/api.js`.
- For continuity across sessions, see `AGENT-HANDOFF.md`.
