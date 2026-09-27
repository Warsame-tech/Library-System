const request = require('supertest');
const { app, pool, resetLoginState } = require('./helpers');

const USERNAME = process.env.DEFAULT_ADMIN_USERNAME;
const PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD;

afterEach(async () => {
  await resetLoginState();
});

afterAll(async () => {
  await pool.end();
});

describe('POST /api/auth/login', () => {
  test('rejects missing username/password with a validation error', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBeTruthy();
  });

  test('rejects an unknown username with a generic message (no user enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'no_such_user', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('اسم المستخدم أو كلمة المرور غير صحيحة');
  });

  test('rejects a wrong password with the same generic message', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: USERNAME, password: 'wrongpass' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('اسم المستخدم أو كلمة المرور غير صحيحة');
  });

  test('logs in successfully with correct credentials and returns a JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: USERNAME, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.username).toBe(USERNAME);
  });

  test('locks the account after LOGIN_MAX_ATTEMPTS failed attempts', async () => {
    const maxAttempts = Number(process.env.LOGIN_MAX_ATTEMPTS);
    for (let i = 0; i < maxAttempts; i++) {
      await request(app).post('/api/auth/login').send({ username: USERNAME, password: 'wrongpass' });
    }
    // even the correct password must now be rejected while locked
    const res = await request(app).post('/api/auth/login').send({ username: USERNAME, password: PASSWORD });
    expect(res.status).toBe(423);
    expect(res.body.message).toMatch(/مقفل/);
  });
});

describe('GET /api/auth/me', () => {
  test('rejects a request with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects a garbage/invalid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('returns the current user for a valid token', async () => {
    const login = await request(app).post('/api/auth/login').send({ username: USERNAME, password: PASSWORD });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(USERNAME);
  });
});
