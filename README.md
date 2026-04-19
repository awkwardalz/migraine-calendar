# Migraine Diary

A personal migraine headache tracking web app with calendar visualization, statistical insights, medication logging, and printable doctor's reports.

**Live site:** [migraine-calendar on Netlify](https://migraine-calendar.netlify.app/)

## Screenshots

### Login
![Login page showing username and password input fields with a Sign In button](https://github.com/user-attachments/assets/ea46963e-a16f-4055-b7fd-934a029d86df)

### Calendar Dashboard
![Calendar dashboard showing color-coded migraine days by intensity, preventive medication markers, weather icons on each tile, and a stats panel with charts on the right](https://github.com/user-attachments/assets/a98917c1-6b8d-4fcd-ae07-05dab195d926)

### Day Detail
![Day detail panel showing a headache entry with intensity badge, location, symptoms and triggers, alongside the day's local weather data and quick-action buttons for logging new entries](https://github.com/user-attachments/assets/976b4d71-b905-4fe4-b1ce-c7d79b45d950)

### Headache Log Form
![Headache logging form with date picker, pain location and area toggles, intensity slider from 1 to 10, time of day selector, medication quantity controls, multi-select symptoms, and multi-select triggers](https://github.com/user-attachments/assets/d23d0aa8-e6b3-45a2-b585-5ae7670af5db)

### Preventive Medication Form
![Preventive medication form showing a grid of injectable and oral medication options, with Ajovy selected, and Type and Dosage fields pre-filled](https://github.com/user-attachments/assets/972d3995-0444-4c72-a65f-ce58d8797792)

### Entry History
![Chronological history list of headache entries showing date, intensity badge, location, duration, medications taken, and symptom tags for each entry](https://github.com/user-attachments/assets/385f574e-568d-4993-b504-7940dc63cd85)

### Doctor's Report
![Doctor's report page with a date range picker and a generated report showing summary statistics, top triggers, top symptoms, preventive medication log, and full headache entry table](https://github.com/user-attachments/assets/01ca69dd-d690-4ee2-808b-8367df863600)

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
- Fetches weather data for Hong Kong via [Open-Meteo](https://open-meteo.com) — up to 90 days back and 14 days ahead in a single button press
- Logs hourly surface pressure, daily temperature, and precipitation
- Weather icons shown on calendar tiles; full details (condition, temp, pressure, pressure delta, rain) visible when clicking a day
- Already-cached historical data is preserved on re-fetch; only uncached past dates and the latest forecast are updated

### 📄 Doctor's Report
- Select a custom date range and generate a printable summary
- **Summary**: migraine days, frequency %, average intensity, preventive doses, period records
- **Top triggers, symptoms, and acute medications** — ranked by occurrence
- **Preventive medication log** and **full headache entry table**
- **Weather Context section** — for each headache incident, shows a ±3 day weather table:
  - Consecutive incidents whose windows overlap are merged into one table (no redundant rows)
  - Headache days are highlighted in red with intensity badge
  - Period days are marked with 🩸 day number if a period was active
  - Large pressure drops (Δ < −8 hPa) are flagged in red
- "Print / Save as PDF" button — prints cleanly without UI chrome
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
- A [Netlify](https://netlify.app) account

### 2. Create a Turso database

```bash
turso db create migraine-calendar
turso db show migraine-calendar   # copy the URL
turso db tokens create migraine-calendar  # copy the token
```

### 3. Configure environment

Create `.env` in the project root:

```env
APP_USERNAME=your-username
APP_PASSWORD=your-password
JWT_SECRET=a-long-random-secret
PORT=3001

TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Weather location (defaults to Hong Kong if omitted)
# WEATHER_LAT=22.3193
# WEATHER_LON=114.1694
# WEATHER_TIMEZONE=Asia/Hong_Kong

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
| `WEATHER_LAT` | *(optional)* Latitude for weather data (default: `22.3193`) |
| `WEATHER_LON` | *(optional)* Longitude for weather data (default: `114.1694`) |
| `WEATHER_TIMEZONE` | *(optional)* Timezone for weather data (default: `Asia/Hong_Kong`) |

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
