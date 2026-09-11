
import app from './app';
import { initDatabase } from './db';
import { startBackgroundTimers } from './timers';

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await initDatabase();
  } catch (err: any) {
    console.error('[Server] Database sync error:', err.message);
  }
  startBackgroundTimers();
});
