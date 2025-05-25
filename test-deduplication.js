#!/usr/bin/env node

import { removeDuplicateChars } from './lib/utils.js';

// Test cases for duplicate character removal
const testCases = [
  { input: 'hello', expected: 'helo' },
  { input: 'heelllloo', expected: 'helo' },
  { input: 'git status', expected: 'git status' },
  { input: 'ggiitt  ssttaattuuss', expected: 'git status' },
  { input: 'aaabbbccc', expected: 'abc' },
  { input: 'a', expected: 'a' },
  { input: '', expected: '' },
  { input: 'abc', expected: 'abc' },
  { input: 'aabbcc  ddee', expected: 'abc de' },
  { input: 'commit --amend', expected: 'comit -amend' },
  { input: 'ccoommmmiitt  ----aammeenndd', expected: 'comit -amend' }
];

console.log('Testing duplicate character removal function...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = removeDuplicateChars(testCase.input);
  const success = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Input:    "${testCase.input}"`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got:      "${result}"`);
  console.log('');
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
} 