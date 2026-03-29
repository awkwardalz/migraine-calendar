import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import headacheRoutes from './routes/headaches.js';
import preventiveRoutes from './routes/preventive.js';
import statsRoutes from './routes/stats.js';
import periodRoutes from './routes/period.js';
import weatherRoutes from './routes/weather.js';

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? [process.env.CLIENT_ORIGIN]
  : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/headaches', headacheRoutes);
app.use('/api/preventive', preventiveRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/period', periodRoutes);
app.use('/api/weather', weatherRoutes);

export default app;
