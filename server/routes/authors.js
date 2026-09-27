// تسجيل المؤلفين
const createEntityRouter = require('./entityFactory');

module.exports = createEntityRouter({
  table: 'authors',
  entityLabel: 'المؤلف',
  dependents: { countQuery: 'SELECT COUNT(*) AS c FROM book_authors WHERE author_id = ?' },
});
