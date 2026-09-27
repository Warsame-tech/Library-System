const request = require('supertest');
const { app, pool } = require('./helpers');

afterAll(async () => {
  await pool.end();
});

describe('Protected routes require authentication', () => {
  const cases = [
    ['get', '/api/books'],
    ['get', '/api/arts'],
    ['get', '/api/authors'],
    ['get', '/api/publishers'],
    ['get', '/api/dashboard/stats'],
  ];

  test.each(cases)('%s %s rejects requests with no token', async (method, url) => {
    const res = await request(app)[method](url);
    expect(res.status).toBe(401);
  });

  test.each(cases)('%s %s rejects requests with an invalid token', async (method, url) => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});
