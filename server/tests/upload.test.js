const request = require('supertest');
const { app, pool, loginAsTestAdmin } = require('./helpers');
const { CHUNK_SIZE } = require('../utils/pdfStorage');

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

describe('PDF storage in the database', () => {
  // ملف PDF أكبر من جزء واحد للتأكد من التقسيم وإعادة التجميع بالترتيب الصحيح
  function makePdf(size) {
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) buf[i] = (i * 31 + 7) % 256;
    Buffer.from('%PDF-1.4\n').copy(buf, 0);
    return buf;
  }

  async function uploadBook(pdf, title) {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', title)
      .attach('pdfs', pdf, { filename: 'كتاب.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    return { bookId: res.body.data.id, pdfId: res.body.data.pdfs[0].id };
  }

  const binaryParser = (res, cb) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => cb(null, Buffer.concat(chunks)));
  };

  test.each([
    ['small file (single chunk)', 20 * 1024],
    ['large file (multiple chunks)', 1.5 * 1024 * 1024],
  ])('downloads exactly the uploaded bytes — %s', async (_, size) => {
    const pdf = makePdf(size);
    const { bookId, pdfId } = await uploadBook(pdf, 'كتاب مخزّن');

    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM book_pdf_chunks WHERE pdf_id = ?', [pdfId]);
    expect(count).toBe(Math.ceil(size / CHUNK_SIZE));

    const res = await request(app)
      .get(`/api/books/${bookId}/pdfs/${pdfId}/download`)
      .set('Authorization', `Bearer ${token}`)
      .buffer(true)
      .parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
    expect(Buffer.compare(res.body, pdf)).toBe(0);
  });

  test('view route serves the file inline', async () => {
    const pdf = makePdf(4096);
    const { bookId, pdfId } = await uploadBook(pdf, 'كتاب للعرض');
    const res = await request(app)
      .get(`/api/books/${bookId}/pdfs/${pdfId}/view?token=${token}`)
      .buffer(true)
      .parse(binaryParser);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^inline;/);
    expect(Buffer.compare(res.body, pdf)).toBe(0);
  });

  test('deleting a book removes its stored PDF chunks', async () => {
    const { bookId, pdfId } = await uploadBook(makePdf(4096), 'كتاب للحذف');
    const del = await request(app).delete(`/api/books/${bookId}`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM book_pdf_chunks WHERE pdf_id = ?', [pdfId]);
    expect(count).toBe(0);
  });
});
