const request = require('supertest');
const app = require('../src/index');

describe('User Profile API', () => {
  it('GET /profile - 인증 필요', async () => {
    const res = await request(app).get('/profile');
    expect(res.statusCode).toBe(401);
  });
}); 