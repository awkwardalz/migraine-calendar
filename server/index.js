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

app.use(cors());
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
