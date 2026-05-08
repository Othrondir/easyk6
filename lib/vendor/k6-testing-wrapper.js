// ES6 wrapper for k6-testing CommonJS module
// This allows Vite to import the CommonJS module
const testing = require('./k6-testing.js');

// Re-export the expect function
export const expect = testing.expect;

// Export default as well for compatibility
export default testing;
