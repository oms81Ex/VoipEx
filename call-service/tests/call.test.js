const request = require('supertest');
const app = require('../src/index');

describe('Call API', () => {
  it('POST /call - 인증 필요', async () => {
    const res = await request(app).post('/call').send({});
    expect([401, 404]).toContain(res.statusCode);
  });
});

describe('Guest-to-Guest Call Features', () => {
  const guestA = { id: 'guest_testA', name: 'TestA' };
  const guestB = { id: 'guest_testB', name: 'TestB' };
  const base = '/calls';

  it('POST /calls/guests/online - register guestA', async () => {
    const res = await request(app).post(`${base}/guests/online`).send(guestA);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('POST /calls/guests/online - register guestB', async () => {
    const res = await request(app).post(`${base}/guests/online`).send(guestB);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('GET /calls/guests/online - should list both guests', async () => {
    const res = await request(app).get(`${base}/guests/online`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.guests.map(g => g.id)).toEqual(expect.arrayContaining([guestA.id, guestB.id]));
  });

  it('POST /calls/invite - guestA invites guestB', async () => {
    const invite = { fromId: guestA.id, fromName: guestA.name, toId: guestB.id, type: 'audio' };
    const res = await request(app).post(`${base}/invite`).send(invite);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });

  it('GET /calls/invites/:guestId - guestB should have invite from guestA', async () => {
    const res = await request(app).get(`${base}/invites/${guestB.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.invites.some(i => i.fromId === guestA.id)).toBe(true);
  });

  it('POST /calls/room - create/join room for guestA and guestB', async () => {
    const res = await request(app).post(`${base}/room`).send({ guestA: guestA.id, guestB: guestB.id });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.roomId).toBeDefined();
  });
}); 