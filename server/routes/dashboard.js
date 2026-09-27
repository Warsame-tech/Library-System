// لوحة التحكم - الإحصائيات العامة
const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/stats', async (req, res) => {
  try {
    const [[books]] = await pool.query('SELECT COUNT(*) AS total FROM books');
    const [[authors]] = await pool.query('SELECT COUNT(*) AS total FROM authors');
    const [[publishers]] = await pool.query('SELECT COUNT(*) AS total FROM publishers');
    const [[arts]] = await pool.query('SELECT COUNT(*) AS total FROM arts');
    const [[pdfs]] = await pool.query('SELECT COUNT(*) AS total FROM book_pdfs');
    const [recentBooks] = await pool.query(
      `SELECT b.id, b.title, b.created_at, p.name AS publisher_name, ar.name AS art_name
       FROM books b
       LEFT JOIN publishers p ON p.id = b.publisher_id
       LEFT JOIN arts ar ON ar.id = b.art_id
       ORDER BY b.created_at DESC LIMIT 5`
    );

    res.json({
      total_books: books.total,
      total_authors: authors.total,
      total_publishers: publishers.total,
      total_arts: arts.total,
      total_pdfs: pdfs.total,
      recent_books: recentBooks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الإحصائيات' });
  }
});

module.exports = router;
