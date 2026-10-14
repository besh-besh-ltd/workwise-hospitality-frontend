const nextJest = require('next/jest')
 
/** @type {import('jest').Config} */
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})
 
// Add any custom config to be passed to Jest
const config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  // Build output (.next/standalone carries a copy of package.json) would collide
  // in jest-haste-map; it never contains tests we want to run.
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Mirror the `@/*` path alias from jsconfig.json so jest.mock() and
  // imports can use the same shorthand the app uses.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}
 
// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config)