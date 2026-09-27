const request = require('supertest');
const { app, pool, loginAsTestAdmin } = require('./helpers');

let token;

beforeAll(async () => {
  token = await loginAsTestAdmin();
});

afterEach(async () => {
  await pool.query('DELETE FROM books');
});

afterAll(async () => {
  await pool.end();
});

describe('PDF upload security', () => {
  test('rejects a non-PDF mimetype', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'كتاب اختبار')
      .attach('pdfs', Buffer.from('just plain text'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('rejects a file with a spoofed PDF mimetype but invalid content (magic-byte check)', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'كتاب اختبار')
      .attach('pdfs', Buffer.from('this is not really a pdf'), { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);

    // ensure no orphan book row was left behind after the rejected upload
    const [rows] = await pool.query('SELECT COUNT(*) AS c FROM books');
    expect(rows[0].c).toBe(0);
  });

  test('accepts a file with a valid PDF signature', async () => {
    const validPdf = Buffer.from('%PDF-1.4\n%%EOF');
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'كتاب صالح')
      .attach('pdfs', validPdf, { filename: 'real.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.data.pdfs).toHaveLength(1);
  });

  test('stores the uploaded file under a randomized name, not the original filename', async () => {
    const validPdf = Buffer.from('%PDF-1.4\n%%EOF');
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'كتاب آخر')
      .attach('pdfs', validPdf, { filename: '../../evil.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    const stored = res.body.data.pdfs[0].file_name;
    expect(stored).not.toContain('..');
    expect(stored).toMatch(/^\d+-[0-9a-f]{32}\.pdf$/);
  });
});
