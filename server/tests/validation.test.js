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

describe('Input validation on entity routes (arts/authors/publishers)', () => {
  test('rejects an empty name', async () => {
    const res = await request(app).post('/api/arts').set('Authorization', `Bearer ${token}`).send({ name: '' });
    expect(res.status).toBe(400);
  });

  test('rejects a name over the max length', async () => {
    const res = await request(app)
      .post('/api/arts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'a'.repeat(200) });
    expect(res.status).toBe(400);
  });

  test('accepts a valid name and creates the record', async () => {
    const res = await request(app).post('/api/arts').set('Authorization', `Bearer ${token}`).send({ name: 'الفقه' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('الفقه');
  });

  test('rejects a duplicate name', async () => {
    await request(app).post('/api/arts').set('Authorization', `Bearer ${token}`).send({ name: 'التفسير' });
    const res = await request(app).post('/api/arts').set('Authorization', `Bearer ${token}`).send({ name: 'التفسير' });
    expect(res.status).toBe(409);
  });
});

describe('Input validation on the book route', () => {
  test('rejects a book with no title', async () => {
    const res = await request(app).post('/api/books').set('Authorization', `Bearer ${token}`).field('title', '');
    expect(res.status).toBe(400);
  });
});
