# Migraine Diary

A personal migraine headache tracking web app with calendar visualization, statistical insights, and medication logging.

## Features

- **Calendar View** (public): Color-coded calendar showing migraine days (by intensity) and preventive medication days
- **Headache Recording** (login required): Log pain location, area, intensity, time, duration, medications taken, symptoms, and triggers
- **Preventive Medication Log** (login required): Track injections (Aimovig, Ajovy, Emgality) and oral preventives (Nurtec, etc.)
- **Statistics Dashboard** (public): Monthly frequency, intensity trends, day-of-week patterns, symptom/trigger analysis
- **Edit & Revise**: All entries can be edited or deleted after submission
- **Migraine-Free Streak**: Track consecutive days without a migraine

## Quick Start

### 1. Configure credentials

Edit `.env` in the project root:

```
APP_USERNAME=admin
APP_PASSWORD=changeme
JWT_SECRET=replace-with-a-long-random-secret-string
PORT=3001
```

### 2. Install dependencies

```bash
npm run setup
npm install
```

### 3. Run in development

```bash
npm run dev
```

This starts both the API server (port 3001) and the React dev server (port 5173).

Open **http://localhost:5173** in your browser.

### 4. Build for production

```bash
npm run build
npm start
```

The built app runs on **http://localhost:3001**.

## Tech Stack

- **Frontend**: React 18, React Calendar, Chart.js, React Router
- **Backend**: Express.js, better-sqlite3
- **Auth**: JWT tokens with credentials from `.env`
- **Database**: SQLite (stored in `data/migraine.db`, auto-created)
