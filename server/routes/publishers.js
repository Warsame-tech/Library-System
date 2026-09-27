// تسجيل دور النشر
const createEntityRouter = require('./entityFactory');

module.exports = createEntityRouter({
  table: 'publishers',
  entityLabel: 'دار النشر',
  dependents: { countQuery: 'SELECT COUNT(*) AS c FROM books WHERE publisher_id = ?' },
});
