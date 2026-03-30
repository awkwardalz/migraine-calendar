# Migraine Diary

A personal migraine headache tracking web app with calendar visualization, statistical insights, medication logging, and printable doctor's reports.

**Live site:** [migraine-calendar on Netlify](https://migraine-calendar.netlify.app/)

## Features

### 📅 Calendar Dashboard
- Color-coded monthly calendar — migraine days are highlighted by intensity (mild / moderate / severe), preventive injection days are marked, and period start days are indicated
- Click any day to see a detailed breakdown of entries logged for that date
- At-a-glance legend for intensity and event types

### 🤯 Headache / Migraine Logging
- Record pain **location** (Left, Right, Both, Forehead, Back of head, etc.) and **area** (Behind eye, Temple, Jaw/neck, etc.)
- Rate **intensity** from 1–10 with a slider
- Log **time of day** (Morning, Afternoon, Evening, Night)
- Track **duration** in hours
- Multi-select **symptoms** (Nausea, Vomiting, Aura, Photophobia, Phonophobia, etc.)
- Multi-select **triggers** (Stress, Sleep, Hormonal, Weather, Food, Exercise, etc.)
- Multi-select **acute medications** taken (Rizatriptan, Sumatriptan, Ibuprofen, etc.)
- Add free-text **notes**
- All entries are editable and deletable

### 💊 Preventive Medication Log
- Track preventive medications by type: **injectable** (Ajovy, Aimovig, Emgality) or **oral** (Topiramate, Amitriptyline, etc.)
- Record injection/dose date and optional notes

### 🩸 Period Tracking
- Log menstrual cycle start dates and cycle length
- The Statistics view automatically calculates average cycle length from logged entries

### 📊 Statistics
Charts and breakdowns powered by Chart.js:
- **Monthly migraine frequency** bar chart (last 6 months)
- **Average intensity trend** line chart
- **Day-of-week distribution** bar chart (which days migraines most often occur)
- **Top triggers** — ranked by frequency
- **Top symptoms** — ranked by frequency
- **Top acute medications** — ranked by frequency
- **Preventive medication** summary (total doses per type)
- **Period / cycle** summary (average cycle length, total periods logged)

### 🌤️ Weather Overlay
- Fetches historical weather for Hong Kong automatically via [Open-Meteo](https://open-meteo.com)
- Logs hourly surface pressure, daily temperature, and precipitation
- Weather data is shown on calendar tiles (admin only)

### 📄 Doctor's Report
- Select a custom date range and generate a printable summary
- Includes: migraine days count, average intensity, top triggers, top symptoms, acute/preventive medication usage, full headache entry table, and period records
- "Print / Save as PDF" button — prints cleanly without UI chrome (controls are hidden via print CSS)
- Available to both admin and guest users

### 📝 Entry History
- Chronological list of all headache entries, preventive logs, and period records
- Tap any entry to edit it (admin only)
- Delete individual entries (admin only)

## Access Levels

| | Guest | Admin |
|---|---|---|
| View calendar dashboard | ✅ | ✅ |
| View history | ✅ | ✅ |
| View statistics | ✅ | ✅ |
| Generate doctor's report | ✅ | ✅ |
| Add / edit / delete entries | ❌ | ✅ |
| Fetch weather data | ❌ | ✅ |

Guest credentials are configurable via `GUEST_USERNAME` / `GUEST_PASSWORD` env vars (see below).

## Tech Stack

- **Frontend**: React 18, Vite, react-calendar, React Router — hosted on **Netlify**
- **Backend**: Express.js wrapped with `serverless-http` — deployed as **Netlify Functions**
- **Database**: [Turso](https://turso.tech) (libSQL cloud) via `@libsql/client/http`
- **Auth**: JWT (7-day tokens), credentials stored in environment variables
- **Weather**: [Open-Meteo](https://open-meteo.com) API (hourly surface pressure, daily temp/precipitation)

### Why Turso over Firebase?

This app is query-heavy and relational by nature — the stats dashboard and doctor's report rely on SQL aggregations (`GROUP BY`, `AVG`, date range filters) across multiple related tables (headaches, preventive, period, weather). Turso is a cloud-hosted SQLite database that supports full SQL, making those queries straightforward.

Firebase Realtime Database and Firestore are document/JSON stores with no native SQL aggregations. Replicating the same stats would require either pulling all records to the client and aggregating in JS, or writing separate Cloud Functions for every query — significant added complexity for no real benefit in a single-user diary app that has no need for real-time sync.

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
│       ├── components/   # Dashboard, History, Forms, Header, Login, Report, Stats
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
