#!/usr/bin/env node

// This script runs all the gemini test files to generate comprehensive coverage

const { execSync } = require('child_process');
const path = require('path');

// Configuration
const testFiles = [
  'gemini-coverage-fixed.test.js',
  'gemini-full.test.js',
  'direct-gemini.test.js',
  'combined-gemini.test.js',
  'gemini-coverage-test.js'
];

// Run the tests
console.log('Running all gemini tests for maximum coverage...');

try {
  const command = `npx c8 --include=src/utils/gemini.js --all=true mocha ${testFiles.join(' ')}`;
  execSync(command, { 
    cwd: path.join(__dirname),
    stdio: 'inherit' 
  });
  
  console.log('All tests completed successfully!');
} catch (error) {
  console.error('Failed to run tests:', error.message);
  process.exit(1);
}