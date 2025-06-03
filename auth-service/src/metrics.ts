import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

// Create a new registry
const register = new Registry();

// Enable the collection of default metrics
collectDefaultMetrics({ register });

// Custom metrics
export const authRequestDurationMicroseconds = new Histogram({
  name: 'auth_request_duration_seconds',
  help: 'Duration of authentication requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const authRequestTotal = new Counter({
  name: 'auth_requests_total',
  help: 'Total number of authentication requests',
  labelNames: ['method', 'route', 'code'],
  registers: [register],
});

export const loginAttempts = new Counter({
  name: 'login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'],
  registers: [register],
});

// Metrics endpoint
export const getMetrics = async () => {
  return register.metrics();
}; 