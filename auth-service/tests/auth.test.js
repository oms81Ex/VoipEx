const request = require('supertest');
const app = require('../src/index');

describe('Auth API', () => {
  it('POST /auth/login - 필수값 누락', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect([400, 422]).toContain(res.statusCode); // validation 실패시 400 또는 422
  });
}); 