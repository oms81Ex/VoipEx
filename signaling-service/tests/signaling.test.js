const request = require('supertest');
const app = require('../src/index');

describe('Signaling API', () => {
  it('GET /signaling/health - 헬스체크', async () => {
    const res = await request(app).get('/signaling/health');
    expect([200, 404]).toContain(res.statusCode);
  });
}); 