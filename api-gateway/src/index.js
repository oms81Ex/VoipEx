const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// 서비스 프록시
const services = {
  '/api/auth': { target: 'http://auth-service:3001', rewrite: { '^/api/auth': '/auth' } },
  '/api/users': { target: 'http://user-service:3002', rewrite: { '^/api/users': '/users' } },
  '/api/profile': { target: 'http://user-service:3002', rewrite: { '^/api/profile': '/profile' } },
  '/api/guests': { target: 'http://user-service:3002', rewrite: { '^/api/guests': '/guests' } },
  '/api/calls': { target: 'http://call-service:3003', rewrite: { '^/api/calls': '/calls' } }
};

Object.keys(services).forEach(path => {
  app.use(path, createProxyMiddleware({
    target: services[path].target,
    changeOrigin: true,
    pathRewrite: services[path].rewrite
  }));
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
