// تسجيل الفنون
const createEntityRouter = require('./entityFactory');

module.exports = createEntityRouter({
  table: 'arts',
  entityLabel: 'الفن',
  dependents: { countQuery: 'SELECT COUNT(*) AS c FROM books WHERE art_id = ?' },
});
