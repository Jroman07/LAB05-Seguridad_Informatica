module.exports = {
  testEnvironment:'node',
  testMatch:['**/test/test.js','**/tests/unit/**/*.test.js','**/tests/integration/**/*.test.js'],
  testPathIgnorePatterns:['/node_modules/','/tests/e2e/'],
  testTimeout:10000
};
