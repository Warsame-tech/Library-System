module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/loadEnv.js'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  forceExit: true,
  verbose: true,
};
