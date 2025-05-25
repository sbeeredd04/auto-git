#!/usr/bin/env node

// Test the new input sanitization algorithm
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return input;
  
  let result = '';
  let i = 0;
  
  while (i < input.length) {
    const currentChar = input[i];
    result += currentChar;
    
    // For spaces, don't remove duplicates (preserve spacing)
    if (currentChar === ' ') {
      i += 1;
      continue;
    }
    
    // Skip consecutive duplicates of the current character
    while (i + 1 < input.length && input[i + 1] === currentChar) {
      i += 1; // Skip the duplicate
    }
    
    i += 1; // Move to next different character
  }
  
  return result.trim();
}

// Test cases
const testCases = [
  { input: 'ppuullll', expected: 'pul' },
  { input: 'ggiitt', expected: 'git' },
  { input: 'ssttaattuuss', expected: 'status' },
  { input: 'git pull', expected: 'git pul' },
  { input: 'hheelllloo', expected: 'helo' },
  { input: 'aaabbbbcccc', expected: 'abc' },
  { input: 'normal', expected: 'normal' },
  { input: '', expected: '' },
  { input: 'a', expected: 'a' },
  { input: 'aa', expected: 'a' },
  { input: 'aaa', expected: 'a' },
  { input: 'aaaa', expected: 'a' },
  { input: 'git  status', expected: 'git  status' }, // preserve spaces
  { input: 'ppuullll  --hhaarrdd', expected: 'pul  -hard' }
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