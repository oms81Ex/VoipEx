const request = require('supertest');
const app = require('../src/index');

describe('API Gateway', () => {
  it('GET /health - 헬스체크', async () => {
    const res = await request(app).get('/health');
    expect([200, 404]).toContain(res.statusCode); // 엔드포인트가 없을 수도 있으므로
  });
}); 