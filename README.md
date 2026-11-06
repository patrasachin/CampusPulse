# CampusPulse

A campus event management website. Students discover events, register for a spot and track what they've joined. Organizers publish and remove events.

**Stack:** HTML/CSS/JavaScript · Node.js + Express · JWT + bcrypt · MongoDB + Mongoose

## Quick start

1. Install [Node.js 18+](https://nodejs.org) and MongoDB (local, or a free [Atlas](https://www.mongodb.com/atlas) cluster).
2. Install dependencies:
   ```bash
   npm install
   ```
3. Check `.env` (already provided, copied from `.env.example`). Set `MONGODB_URI` if you use Atlas, and change `JWT_SECRET` to a long random string.
4. Start the app:
   ```bash
   npm start
   ```
5. Open http://localhost:3000

On first start with an empty database, sample events and demo accounts are created automatically. To reset them any time: `npm run seed`.

## Demo accounts

| Role      | Email                        | Password       |
|-----------|------------------------------|----------------|
| Organizer | organizer@campuspulse.com    | Organizer@123  |
| Student   | student@campuspulse.com      | Student@123    |

New sign-ups are always students. Organizer accounts come from the seed script.

## Features

- Browse events, filter by category, search by name / category / venue
- See date, time, venue and spots left
- Sign up / sign in (JWT, bcrypt-hashed passwords)
- Register for or cancel an event; atomic capacity check prevents overbooking
- "My Events" page for registered events
- Organizers: publish new events and remove their own

## API

| Method | Endpoint                        | Auth       | Purpose                    |
|--------|---------------------------------|------------|----------------------------|
| POST   | /api/auth/register              | -          | Create student account     |
| POST   | /api/auth/login                 | -          | Sign in, returns JWT       |
| GET    | /api/auth/me                    | user       | Current user               |
| GET    | /api/events?category=&q=        | optional   | List / filter / search     |
| GET    | /api/events/mine/registered     | user       | Events I joined            |
| GET    | /api/events/mine/organized      | organizer  | Events I manage            |
| POST   | /api/events                     | organizer  | Create event               |
| DELETE | /api/events/:id                 | organizer  | Remove own event           |
| POST   | /api/events/:id/register        | user       | Register                   |
| DELETE | /api/events/:id/register        | user       | Cancel registration        |

## Structure

```
server.js        app entry
seed.js          sample events + accounts
models/          User, Event (Mongoose)
middleware/      JWT auth + role guard
routes/          auth, events
public/          frontend (index.html, css/, js/)
```
