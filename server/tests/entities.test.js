const request = require('supertest');
const { app, pool, loginAsTestAdmin } = require('./helpers');

let token;

beforeAll(async () => {
  token = await loginAsTestAdmin();
});

afterEach(async () => {
  await pool.query('DELETE FROM arts');
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/arts?all=true (book form dropdowns)', () => {
  test('returns every record, beyond the normal page-size limit of 100', async () => {
    const names = Array.from({ length: 120 }, (_, i) => [`فن ${String(i + 1).padStart(3, '0')}`]);
    await pool.query('INSERT INTO arts (name) VALUES ?', [names]);

    const res = await request(app).get('/api/arts?all=true').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(120);
    expect(res.body.data[0].name).toBe('فن 001');

    const paged = await request(app).get('/api/arts?limit=1000').set('Authorization', `Bearer ${token}`);
    expect(paged.body.data).toHaveLength(100);
  });

  test('requires login', async () => {
    const res = await request(app).get('/api/arts?all=true');
    expect(res.status).toBe(401);
  });
});
