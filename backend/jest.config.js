module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  testEnvironment: 'node',
  setupFiles: ['dotenv/config'],
  testTimeout: 30000,
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
};
