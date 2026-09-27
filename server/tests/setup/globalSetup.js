require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.test'), override: true });
const { resetTestDb } = require('./initTestDb');

module.exports = async function globalSetup() {
  await resetTestDb();
};
