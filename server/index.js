import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import headacheRoutes from './routes/headaches.js';
import preventiveRoutes from './routes/preventive.js';
import statsRoutes from './routes/stats.js';
import periodRoutes from './routes/period.js';
import weatherRoutes from './routes/weather.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from the Netlify frontend (set CLIENT_ORIGIN in production env vars)
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? [process.env.CLIENT_ORIGIN]
  : true; // allow all in dev
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

initDB();

app.use('/api/auth', authRoutes);
app.use('/api/headaches', headacheRoutes);
app.use('/api/preventive', preventiveRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/period', periodRoutes);
app.use('/api/weather', weatherRoutes);

// Serve built client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
