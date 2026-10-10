# Peer Tutoring and Study Group Finder System

This workspace contains a starter full-stack implementation for the proposed UNZA peer tutoring and study group platform.

## Stack

- Web app: React + Vite
- Mobile app: Expo + React Native
- API: Node.js + Express
- Data layer: PostgreSQL-ready schema plus mock data for local development

## Project structure

- `apps/web` – React web client
- `apps/mobile` – Expo mobile client
- `apps/server` – Express REST API and sample data
- `apps/server/sql/schema.sql` – PostgreSQL schema starter

## Quick start

1. Install Node.js (18+ recommended) and npm.
2. Create a PostgreSQL database and update the `DATABASE_URL` in `.env`.
3. From the workspace root run:
   - `npm install`
4. Start the backend:
   - `npm run dev:server`
5. Start the web app:
   - `npm run dev:web`
6. Start the mobile app:
   - `npm run dev:mobile`

## PostgreSQL setup

1. Create a local PostgreSQL database named `peer_tutoring`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your local connection string.
3. When the server starts, it will automatically initialize the schema and seed sample data if the tables are empty.

Example:

```env
PORT=4000
API_BASE_URL=http://localhost:4000/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/peer_tutoring
```

## Local API base

The web and mobile apps expect the API at:

- `http://localhost:4000/api`

## Main features included

- Tutor directory
- Course and department filters
- Study group discovery
- Session booking endpoints
- In-app messaging starter
- Dashboard overview

## Notes

This is a starter implementation designed to help you build the proposed system progressively. It uses mock data in the server so the UI can run immediately without a database connection.
