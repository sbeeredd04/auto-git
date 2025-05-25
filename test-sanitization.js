#!/usr/bin/env node

// Test the new input sanitization algorithm
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;
  
  let result = '';
  let i = 0;
  
  while (i < input.length) {
    const currentChar = input[i];
    result += currentChar;
    
    // Skip all consecutive duplicates of the current character (but not spaces)
    if (currentChar !== ' ') {
      while (i + 1 < input.length && input[i + 1] === currentChar) {
        i++; // Skip the duplicate
      }
    }
    
    i++; // Move to next different character
  }
  
  return result.trim();
}

// Test cases
const testCases = [
  { input: 'ppuullll', expected: 'pull' },
  { input: 'ggiitt', expected: 'git' },
  { input: 'ssttaattuuss', expected: 'status' },
  { input: 'git pull', expected: 'git pull' },
  { input: 'hheelllloo', expected: 'hello' },
  { input: 'aaabbbbcccc', expected: 'abc' },
  { input: 'normal', expected: 'normal' },
  { input: '', expected: '' },
  { input: 'a', expected: 'a' },
  { input: 'aa', expected: 'a' },
  { input: 'aaa', expected: 'a' },
  { input: 'aaaa', expected: 'a' },
  { input: 'tt', expected: 't' },
  { input: 'tttt', expected: 't' },
  { input: 'git  status', expected: 'git  status' } // preserve multiple spaces
];

console.log('Testing Input Sanitization Algorithm\n');

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }, index) => {
  const result = sanitizeInput(input);
  const success = result === expected;
  
  console.log(`Test ${index + 1}: "${input}" → "${result}" ${success ? '✅' : '❌'}`);
  if (!success) {
    console.log(`  Expected: "${expected}"`);
    failed++;
  } else {
    passed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
} 