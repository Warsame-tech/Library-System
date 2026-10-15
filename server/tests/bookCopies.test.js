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

const pdf = (text) => Buffer.from(`%PDF-1.4\n${text}\n%%EOF`);
const auth = (req) => req.set('Authorization', `Bearer ${token}`);

// إرسال نموذج الكتاب مع ملفات نسخات اختيارية: copies = { رقم النسخة: محتوى الملف }
function sendBook(method, url, fields, copies = {}) {
  let req = auth(request(app)[method](url));
  for (const [k, v] of Object.entries({ title: 'كتاب', book_type: 'risala', ...fields })) req = req.field(k, v);
  const numbers = Object.keys(copies).map(Number);
  if (numbers.length) req = req.field('copy_numbers', JSON.stringify(numbers));
  for (const n of numbers) req = req.attach('copy_pdfs', copies[n], { filename: `نسخة-${n}.pdf`, contentType: 'application/pdf' });
  return req;
}
const createBook = (fields, copies) => sendBook('post', '/api/books', fields, copies);
const updateBook = (id, fields, copies) => sendBook('put', `/api/books/${id}`, fields, copies);

function uploadCopies(id, copies) {
  let req = auth(request(app).post(`/api/books/${id}/copy-pdfs`)).field('copy_numbers', JSON.stringify(Object.keys(copies).map(Number)));
  for (const [n, buf] of Object.entries(copies)) req = req.attach('copy_pdfs', buf, { filename: `نسخة-${n}.pdf`, contentType: 'application/pdf' });
  return req;
}

const binaryParser = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};
const download = (bookId, pdfId) =>
  auth(request(app).get(`/api/books/${bookId}/pdfs/${pdfId}/download`)).buffer(true).parse(binaryParser);

const copyNumbers = (book) => book.pdfs.map((p) => p.copy_number);
async function storedBook(id) {
  const [[row]] = await pool.query('SELECT has_copies, copy_count FROM books WHERE id = ?', [id]);
  return row;
}

describe('له النسخات / عدد النسخات', () => {
  test('a book with copies saves without any PDF', async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '5' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ has_copies: true, copy_count: 5, pdfs: [] });
    expect(await storedBook(res.body.data.id)).toEqual({ has_copies: 1, copy_count: 5 });
  });

  test('عدد النسخات is optional when له النسخات is checked', async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '' });
    expect(res.status).toBe(201);
    expect(await storedBook(res.body.data.id)).toEqual({ has_copies: 1, copy_count: null });
  });

  test('without له النسخات the copy count is ignored and stored as NULL', async () => {
    const res = await createBook({ has_copies: 'false', copy_count: '4' });
    expect(res.status).toBe(201);
    expect(await storedBook(res.body.data.id)).toEqual({ has_copies: 0, copy_count: null });
  });

  test('books created without the field default to no copies', async () => {
    const res = await createBook({});
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ has_copies: false, copy_count: null });
  });

  test.each([['0'], ['abc'], ['3a'], ['ثلاثة'], ['-1'], ['101'], ['2.5'], ['1e2']])('rejects an invalid copy count (%j)', async (count) => {
    const res = await createBook({ has_copies: 'true', copy_count: count });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/عدد النسخات/);
  });

  test('accepts Arabic-Indic digits for the copy count', async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '١٢' });
    expect(res.status).toBe(201);
    expect(res.body.data.copy_count).toBe(12);
  });
});

describe('وصف النسخ (copy_description)', () => {
  async function storedDescription(id) {
    const [[row]] = await pool.query('SELECT copy_description FROM books WHERE id = ?', [id]);
    return row.copy_description;
  }

  test.each([['النسخة الأصلية'], ['Student Copy'], ['Volume A'], ['Nuqulka Macallinka'], ['نسخة 2 - Teacher\'s copy ✓']])(
    'stores any language and mixed text (%j) and keeps it on edit',
    async (text) => {
      const res = await createBook({ has_copies: 'true', copy_count: '2', copy_description: text });
      expect(res.status).toBe(201);
      expect(res.body.data.copy_description).toBe(text);

      const id = res.body.data.id;
      const updated = await updateBook(id, { title: 'عنوان آخر', has_copies: 'true', copy_count: '2', copy_description: text });
      expect(updated.status).toBe(200);
      expect(await storedDescription(id)).toBe(text);
    }
  );

  test('is optional, also without a copy count', async () => {
    const empty = await createBook({ has_copies: 'true', copy_count: '2', copy_description: '' });
    expect(empty.status).toBe(201);
    expect(await storedDescription(empty.body.data.id)).toBeNull();

    const noCount = await createBook({ has_copies: 'true', copy_description: 'نسخ الطلاب' });
    expect(noCount.status).toBe(201);
    expect(noCount.body.data).toMatchObject({ copy_count: null, copy_description: 'نسخ الطلاب' });
  });

  test('is cleared when له النسخات is unchecked', async () => {
    const created = await createBook({ has_copies: 'true', copy_count: '2', copy_description: 'Student Copy' });
    const res = await updateBook(created.body.data.id, { has_copies: 'false', copy_description: 'Student Copy' });
    expect(res.status).toBe(200);
    expect(await storedDescription(created.body.data.id)).toBeNull();
  });

  test('rejects a description longer than 500 characters', async () => {
    const res = await createBook({ has_copies: 'true', copy_description: 'a'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/وصف النسخ/);
  });
});

describe('copy PDF uploads on create', () => {
  test('uploads only some of the copies and leaves the rest empty', async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '5' }, { 2: pdf('two'), 4: pdf('four') });
    expect(res.status).toBe(201);
    expect(copyNumbers(res.body.data)).toEqual([2, 4]);

    const four = res.body.data.pdfs.find((p) => p.copy_number === 4);
    const file = await download(res.body.data.id, four.id);
    expect(Buffer.compare(file.body, pdf('four'))).toBe(0);
  });

  test.each([
    ['a copy number above عدد النسخات', { 6: pdf('x') }, /رقم النسخة 6/],
    ['copy number 0', { 0: pdf('x') }, /رقم النسخة 0/],
  ])('rejects %s and saves nothing', async (_, copies, message) => {
    const res = await createBook({ has_copies: 'true', copy_count: '5' }, copies);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(message);
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM books');
    expect(c).toBe(0);
  });

  test('rejects two files for the same copy', async () => {
    const res = await auth(request(app).post('/api/books'))
      .field('title', 'كتاب')
      .field('book_type', 'risala')
      .field('has_copies', 'true')
      .field('copy_count', '3')
      .field('copy_numbers', '[1,1]')
      .attach('copy_pdfs', pdf('a'), { filename: 'a.pdf', contentType: 'application/pdf' })
      .attach('copy_pdfs', pdf('b'), { filename: 'b.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
  });

  test('rejects copy files when له النسخات is not checked', async () => {
    const res = await createBook({ copy_count: '3' }, { 1: pdf('x') });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/له النسخات/);
  });

  test('rejects a copy file that is not really a PDF', async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '2' }, { 1: Buffer.from('not a pdf') });
    expect(res.status).toBe(400);
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM books');
    expect(c).toBe(0);
  });
});

describe('uploading copy PDFs later', () => {
  let bookId;
  beforeEach(async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '3' });
    bookId = res.body.data.id;
  });

  test('one file at a time, then several at once, without re-sending the book data', async () => {
    const one = await uploadCopies(bookId, { 2: pdf('two') });
    expect(one.status).toBe(200);
    expect(copyNumbers(one.body.data)).toEqual([2]);

    const many = await uploadCopies(bookId, { 1: pdf('one'), 3: pdf('three') });
    expect(many.status).toBe(200);
    expect(copyNumbers(many.body.data)).toEqual([1, 2, 3]);
    expect(many.body.data.title).toBe('كتاب');
  });

  test('uploading to a filled copy replaces only that file', async () => {
    const first = await uploadCopies(bookId, { 1: pdf('old'), 2: pdf('keep') });
    const oldId = first.body.data.pdfs.find((p) => p.copy_number === 1).id;

    const res = await uploadCopies(bookId, { 1: pdf('new') });
    expect(res.status).toBe(200);
    expect(copyNumbers(res.body.data)).toEqual([1, 2]);

    const replacement = res.body.data.pdfs.find((p) => p.copy_number === 1);
    expect(Buffer.compare((await download(bookId, replacement.id)).body, pdf('new'))).toBe(0);
    const kept = res.body.data.pdfs.find((p) => p.copy_number === 2);
    expect(Buffer.compare((await download(bookId, kept.id)).body, pdf('keep'))).toBe(0);

    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM book_pdf_chunks WHERE pdf_id = ?', [oldId]);
    expect(c).toBe(0);
  });

  test('editing the book keeps existing copy files and fills only the chosen empty ones', async () => {
    await uploadCopies(bookId, { 1: pdf('one') });
    const res = await updateBook(bookId, { title: 'عنوان جديد', has_copies: 'true', copy_count: '3' }, { 3: pdf('three') });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('عنوان جديد');
    expect(copyNumbers(res.body.data)).toEqual([1, 3]);
  });

  test('the copy count can be increased to add more upload slots', async () => {
    await uploadCopies(bookId, { 3: pdf('three') });
    const res = await updateBook(bookId, { has_copies: 'true', copy_count: '6' }, { 6: pdf('six') });
    expect(res.status).toBe(200);
    expect(res.body.data.copy_count).toBe(6);
    expect(copyNumbers(res.body.data)).toEqual([3, 6]);
  });

  test('rejects a copy number outside the saved count', async () => {
    const res = await uploadCopies(bookId, { 4: pdf('four') });
    expect(res.status).toBe(400);
  });

  test('rejects an upload with no file', async () => {
    const res = await auth(request(app).post(`/api/books/${bookId}/copy-pdfs`)).field('copy_numbers', '[]');
    expect(res.status).toBe(400);
  });

  test('rejects a non-PDF mimetype and a spoofed PDF', async () => {
    const wrongType = await auth(request(app).post(`/api/books/${bookId}/copy-pdfs`))
      .field('copy_numbers', '[1]')
      .attach('copy_pdfs', Buffer.from('text'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(wrongType.status).toBe(400);

    const spoofed = await uploadCopies(bookId, { 1: Buffer.from('not a pdf') });
    expect(spoofed.status).toBe(400);
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM book_pdfs WHERE book_id = ?', [bookId]);
    expect(c).toBe(0);
  });

  test('rejects copy uploads for a book without copies, and for a missing book', async () => {
    const plain = await createBook({});
    expect((await uploadCopies(plain.body.data.id, { 1: pdf('x') })).status).toBe(400);
    expect((await uploadCopies(999999, { 1: pdf('x') })).status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await request(app).post(`/api/books/${bookId}/copy-pdfs`);
    expect(res.status).toBe(401);
  });
});

describe('existing copy files are never removed by accident', () => {
  let bookId;
  beforeEach(async () => {
    const res = await createBook({ has_copies: 'true', copy_count: '4' }, { 3: pdf('three') });
    bookId = res.body.data.id;
  });

  test('cannot lower the copy count below a copy that has a file', async () => {
    const res = await updateBook(bookId, { has_copies: 'true', copy_count: '2' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/3/);
    expect(await storedBook(bookId)).toEqual({ has_copies: 1, copy_count: 4 });
  });

  test('cannot clear the copy count or uncheck له النسخات while copy files exist', async () => {
    expect((await updateBook(bookId, { has_copies: 'true', copy_count: '' })).status).toBe(400);
    const res = await updateBook(bookId, { has_copies: 'false' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/له النسخات/);
    const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM book_pdfs WHERE book_id = ?', [bookId]);
    expect(c).toBe(1);
  });

  test('after deleting the copy file the count can be lowered and the option unchecked', async () => {
    const book = await auth(request(app).get(`/api/books/${bookId}`));
    const del = await auth(request(app).delete(`/api/books/${bookId}/pdfs/${book.body.pdfs[0].id}`));
    expect(del.status).toBe(200);

    expect((await updateBook(bookId, { has_copies: 'true', copy_count: '2' })).status).toBe(200);
    expect((await updateBook(bookId, { has_copies: 'false' })).status).toBe(200);
    expect(await storedBook(bookId)).toEqual({ has_copies: 0, copy_count: null });
  });

  test('regular PDFs are unaffected by the copy settings', async () => {
    const plain = await auth(request(app).post('/api/books'))
      .field('title', 'كتاب')
      .field('book_type', 'risala')
      .attach('pdfs', pdf('general'), { filename: 'g.pdf', contentType: 'application/pdf' });
    const id = plain.body.data.id;
    const res = await updateBook(id, { has_copies: 'true', copy_count: '2' }, { 1: pdf('copy') });
    expect(res.status).toBe(200);
    expect(copyNumbers(res.body.data)).toEqual([1, null]);
    expect((await updateBook(id, { has_copies: 'false' })).status).toBe(400);
  });
});

describe('database upgrade for existing installations', () => {
  test('runMigrations adds the copy columns when they are missing, keeping existing data', async () => {
    const created = await auth(request(app).post('/api/books'))
      .field('title', 'كتاب قديم')
      .field('book_type', 'risala')
      .attach('pdfs', pdf('old'), { filename: 'old.pdf', contentType: 'application/pdf' });
    const id = created.body.data.id;

    await pool.query('ALTER TABLE books DROP COLUMN copy_description, DROP COLUMN copy_count, DROP COLUMN has_copies');
    await pool.query('ALTER TABLE book_pdfs ADD KEY tmp_book (book_id)');
    await pool.query('ALTER TABLE book_pdfs DROP INDEX uq_pdf_copy, DROP COLUMN copy_number');
    await runMigrations(pool);
    await pool.query('ALTER TABLE book_pdfs DROP INDEX tmp_book');

    const [bookCols] = await pool.query("SHOW COLUMNS FROM books WHERE Field IN ('has_copies', 'copy_count', 'copy_description')");
    expect(bookCols).toHaveLength(3);
    const [pdfCols] = await pool.query("SHOW COLUMNS FROM book_pdfs LIKE 'copy_number'");
    expect(pdfCols).toHaveLength(1);

    const res = await auth(request(app).get(`/api/books/${id}`));
    expect(res.body).toMatchObject({ title: 'كتاب قديم', has_copies: false, copy_count: null, copy_description: null });
    expect(copyNumbers(res.body)).toEqual([null]);

    await expect(runMigrations(pool)).resolves.toBeUndefined();
  });
});
