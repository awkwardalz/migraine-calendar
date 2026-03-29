# Migraine Diary

A personal migraine headache tracking web app with calendar visualization, statistical insights, and medication logging.

**Live site:** [migraine-calendar on Netlify](https://migraine-calendar.netlify.app/)

## Features

- **Calendar View**: Color-coded calendar showing migraine days (by intensity), preventive medication days, and weather
- **Headache Recording**: Log pain location, area, intensity, time, duration, medications taken, symptoms, and triggers
- **Preventive Medication Log**: Track injections (Ajovy, Aimovig, Emgality) and oral preventives
- **Period Tracking**: Log menstrual cycle start dates and length
- **Statistics Dashboard**: Monthly frequency, intensity trends, day-of-week patterns, symptom/trigger analysis
- **Weather Overlay**: Automatic weather data (temperature, pressure, precipitation) for Hong Kong via Open-Meteo
- **Guest Access**: Share a read-only view with a guest login — no data entry permitted
- **Edit & Delete**: All entries can be edited or deleted after submission

## Access Levels

| | Guest | Admin |
|---|---|---|
| View dashboard & calendar | ✅ | ✅ |
| View history | ✅ | ✅ |
| Add / edit / delete entries | ❌ | ✅ |
| Fetch weather data | ❌ | ✅ |

Guest credentials default to `guest` / `guest` (configurable via `GUEST_USERNAME` / `GUEST_PASSWORD` env vars).

## Tech Stack

- **Frontend**: React 18, Vite, react-calendar, React Router — hosted on **Netlify**
- **Backend**: Express.js wrapped with `serverless-http` — deployed as **Netlify Functions**
- **Database**: [Turso](https://turso.tech) (libSQL cloud) via `@libsql/client/http`
- **Auth**: JWT (7-day tokens), credentials stored in environment variables
- **Weather**: [Open-Meteo](https://open-meteo.com) API (hourly surface pressure, daily temp/precipitation)

## Local Development

### 1. Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech) account and database

### 2. Create a Turso database

```bash
turso db create migraine-calendar
turso db show migraine-calendar   # copy the URL
turso db tokens create migraine-calendar  # copy the token
```

### 3. Configure environment

Create `.env` in the project root:

```env
APP_USERNAME=alice
APP_PASSWORD=your-password
JWT_SECRET=a-long-random-secret
PORT=3001

TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Optional — override guest credentials
# GUEST_USERNAME=guest
# GUEST_PASSWORD=guest
```

### 4. Install and run

```bash
npm install
cd client && npm install && cd ..
npm run dev
```

This starts the API server on port 3001 and the React dev server on port 5173.
Open **http://localhost:5173**.

## Deployment (Netlify + Turso)

### 1. Push to GitHub

```bash
git remote add origin https://github.com/your-user/migraine-calendar.git
git push -u origin main
```

### 2. Connect to Netlify

- New site → Import from GitHub → select this repo
- Build settings are read from `netlify.toml` automatically:
  - Build command: `npm install && npm run build`
  - Publish directory: `client/dist`
  - Functions directory: `netlify/functions`

### 3. Set environment variables

In **Site configuration → Environment variables**, add:

| Variable | Description |
|---|---|
| `APP_USERNAME` | Admin login username |
| `APP_PASSWORD` | Admin login password |
| `JWT_SECRET` | Long random string |
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Token from `turso db tokens create` |
| `GUEST_USERNAME` | *(optional)* Guest username (default: `guest`) |
| `GUEST_PASSWORD` | *(optional)* Guest password (default: `guest`) |

### 4. Deploy

Trigger a deploy from Netlify dashboard, or just push a commit — Netlify auto-deploys on every push to `main`.

## Project Structure

```
migraine-calendar/
├── client/               # React + Vite frontend
│   └── src/
│       ├── components/   # Dashboard, History, Forms, Header, Login
│       ├── context/      # AuthContext (JWT + role)
│       └── api.js        # API client
├── server/               # Express backend
│   ├── routes/           # headaches, preventive, period, stats, weather, auth
│   ├── middleware/       # authenticateToken, requireAdmin
│   ├── utils/            # weather fetch + cache logic
│   ├── db.js             # Turso client + schema init
│   └── app.js            # Express app (no listen)
├── netlify/
│   └── functions/
│       └── api.js        # Serverless entry point
├── netlify.toml          # Build + routing config
└── .env                  # Local secrets (not committed)
```
