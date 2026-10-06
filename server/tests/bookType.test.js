const request = require('supertest');
const { app, pool, loginAsTestAdmin } = require('./helpers');
const { runMigrations } = require('../db/init');

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

function createBook(fields) {
  let req = request(app).post('/api/books').set('Authorization', `Bearer ${token}`);
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  return req;
}

async function storedRow(id) {
  const [[row]] = await pool.query('SELECT book_type, volume_count FROM books WHERE id = ?', [id]);
  return row;
}

describe('نوع الكتب (book_type) validation', () => {
  test('is required', async () => {
    const res = await createBook({ title: 'كتاب' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/نوع الكتب/);
  });

  test('only accepts الرسالة or المجلد', async () => {
    const res = await createBook({ title: 'كتاب', book_type: 'magazine' });
    expect(res.status).toBe(400);
  });
});

describe('عدد المجلدات (volume_count) depends on نوع الكتب', () => {
  test.each([[''], ['0'], ['abc'], ['-2']])('المجلد requires a positive volume count (got %j)', async (volumes) => {
    const res = await createBook({ title: 'كتاب', book_type: 'mujallad', volume_count: volumes });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/عدد المجلدات/);
  });

  test('المجلد stores the volume count', async () => {
    const res = await createBook({ title: 'كتاب مجلد', book_type: 'mujallad', volume_count: '3' });
    expect(res.status).toBe(201);
    expect(res.body.data.book_type).toBe('mujallad');
    expect(res.body.data.volume_count).toBe(3);
    expect(await storedRow(res.body.data.id)).toEqual({ book_type: 'mujallad', volume_count: 3 });
  });

  test('الرسالة ignores any volume count and stores NULL', async () => {
    const res = await createBook({ title: 'رسالة', book_type: 'risala', volume_count: '5' });
    expect(res.status).toBe(201);
    expect(await storedRow(res.body.data.id)).toEqual({ book_type: 'risala', volume_count: null });
  });

  test('changing a book from المجلد to الرسالة clears the old volume count', async () => {
    const created = await createBook({ title: 'كتاب', book_type: 'mujallad', volume_count: '3' });
    const id = created.body.data.id;

    const updated = await request(app)
      .put(`/api/books/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'كتاب')
      .field('book_type', 'risala')
      .field('volume_count', '3');
    expect(updated.status).toBe(200);
    expect(await storedRow(id)).toEqual({ book_type: 'risala', volume_count: null });
  });
});

describe('search and filter by نوع الكتب', () => {
  beforeEach(async () => {
    await createBook({ title: 'رسالة في الفقه', book_type: 'risala' });
    await createBook({ title: 'شرح كبير', book_type: 'mujallad', volume_count: '4' });
  });

  const list = (query) => request(app).get(`/api/books${query}`).set('Authorization', `Bearer ${token}`);

  test('filters with ?book_type=', async () => {
    const r = await list('?book_type=mujallad');
    expect(r.body.data.map((b) => b.title)).toEqual(['شرح كبير']);
    const s = await list('?book_type=risala');
    expect(s.body.data.map((b) => b.title)).toEqual(['رسالة في الفقه']);
  });

  test('searching the type name finds books of that type', async () => {
    const r = await list(`?search=${encodeURIComponent('المجلد')}`);
    expect(r.body.data.map((b) => b.title)).toEqual(['شرح كبير']);
  });

  test('ignores an unknown type filter', async () => {
    const r = await list('?book_type=other');
    expect(r.body.data).toHaveLength(2);
  });
});

describe('database upgrade for existing installations', () => {
  test('runMigrations adds the book_type column when it is missing', async () => {
    await pool.query('ALTER TABLE books DROP INDEX idx_books_type, DROP COLUMN book_type');
    await runMigrations(pool);
    const [cols] = await pool.query("SHOW COLUMNS FROM books LIKE 'book_type'");
    expect(cols).toHaveLength(1);
    expect(cols[0].Type).toBe("enum('risala','mujallad')");

    // running it again is harmless
    await expect(runMigrations(pool)).resolves.toBeUndefined();
  });
});
