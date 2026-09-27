const request = require('supertest');
const app = require('../server');
const pool = require('../config/db');

async function loginAsTestAdmin() {
  const res = await request(app).post('/api/auth/login').send({
    username: process.env.DEFAULT_ADMIN_USERNAME,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
  });
  return res.body.token;
}

async function resetLoginState() {
  await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = ?', [
    process.env.DEFAULT_ADMIN_USERNAME,
  ]);
}

module.exports = { app, pool, loginAsTestAdmin, resetLoginState };
