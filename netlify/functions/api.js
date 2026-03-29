import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import serverless from 'serverless-http';
import app from '../../server/app.js';
import { initDB } from '../../server/db.js';

// Load .env when running locally via `netlify dev`
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let dbInitialized = false;

const wrapped = serverless(app);

export const handler = async (event, context) => {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
  return wrapped(event, context);
};
