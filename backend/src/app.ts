import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();
app.use(cors());

// Middleware to capture raw body for webhook verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);

export default app;
