import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { metricsMiddleware, httpRequestDurationMicroseconds, httpRequestTotal } from './metrics';

const app = express();

// Apply metrics middleware
app.use(metricsMiddleware as unknown as express.RequestHandler);

// Middleware to record metrics
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.path, res.statusCode.toString())
      .observe(duration / 1000);
    httpRequestTotal
      .labels(req.method, req.path, res.statusCode.toString())
      .inc();
  });
  next();
});

const services = {
  '/api/auth': { target: 'http://auth-service:3001', rewrite: { '^/api/auth': '/auth' } },
  '/api/users': { target: 'http://user-service:3002', rewrite: { '^/api/users': '/users' } },
  '/api/calls': { target: 'http://call-service:3003', rewrite: { '^/api/calls': '/calls' } }
} as const;

(Object.keys(services) as Array<keyof typeof services>).forEach(path => {
  app.use(path, createProxyMiddleware({
    target: services[path].target,
    changeOrigin: true,
    pathRewrite: services[path].rewrite
  }));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
}); 