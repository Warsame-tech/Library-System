require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.test'), override: true });
const { dropTestDb } = require('./initTestDb');

module.exports = async function globalTeardown() {
  await dropTestDb();
};
