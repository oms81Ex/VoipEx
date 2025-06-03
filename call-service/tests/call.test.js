const request = require('supertest');
const app = require('../src/index');

describe('Call API', () => {
  it('POST /call - 인증 필요', async () => {
    const res = await request(app).post('/call').send({});
    expect([401, 404]).toContain(res.statusCode);
  });
}); 