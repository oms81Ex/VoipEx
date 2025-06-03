import promBundle from 'express-prom-bundle';
import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

// Create a new registry
const register = new Registry();

// Enable the collection of default metrics
collectDefaultMetrics({ register });

// Create the metrics middleware
export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  metricsPath: '/metrics',
});

// Custom metrics
export const httpRequestDurationMicroseconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'code'],
  registers: [register],
}); 