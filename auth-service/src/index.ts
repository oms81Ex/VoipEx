import express from 'express';
import {
  authRequestDurationMicroseconds,
  authRequestTotal,
  loginAttempts,
  getMetrics,
} from './metrics';

const app = express();
app.use(express.json());

// Middleware to record metrics
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    authRequestDurationMicroseconds
      .labels(req.method, req.path, res.statusCode.toString())
      .observe(duration / 1000);
    authRequestTotal
      .labels(req.method, req.path, res.statusCode.toString())
      .inc();
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', 'text/plain');
  const metrics = await getMetrics();
  res.send(metrics);
});

// Auth routes
app.post('/login', (req, res) => {
  // Login logic here
  loginAttempts.labels('success').inc();
  res.json({ token: 'dummy-token' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
}); 