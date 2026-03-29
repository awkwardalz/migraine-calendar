import serverless from 'serverless-http';
import app from '../../server/app.js';
import { initDB } from '../../server/db.js';

let dbInitialized = false;

const wrapped = serverless(app);

export const handler = async (event, context) => {
  try {
    if (!dbInitialized) {
      await initDB();
      dbInitialized = true;
    }
    return await wrapped(event, context);
  } catch (err) {
    console.error('[api] handler error:', err);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: err.message, stack: err.stack }),
    };
  }
};
