const request = require('supertest');
const app = require('../src/index');

describe('Media API', () => {
  it('POST /media/stream - 인증 필요', async () => {
    const res = await request(app).post('/media/stream').send({});
    expect(res.statusCode).toBe(401);
  });
}); 