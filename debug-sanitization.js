#!/usr/bin/env node

// Debug version of the sanitization algorithm
function sanitizeInputDebug(input) {
  if (!input || typeof input !== 'string') return input;
  
  let result = '';
  let i = 0;
  
  console.log(`\nDebugging: "${input}"`);
  
  while (i < input.length) {
    const currentChar = input[i];
    const nextChar = i + 1 < input.length ? input[i + 1] : null;
    
    console.log(`i=${i}, char='${currentChar}', next='${nextChar}', result so far='${result}'`);
    
    result += currentChar;
    
    // Skip exactly one duplicate if it exists (but not for spaces)
    if (i + 1 < input.length && input[i + 1] === currentChar && currentChar !== ' ') {
      console.log(`  -> Found duplicate '${currentChar}', skipping next`);
      i += 2; // Skip the current char and its duplicate
    } else {
      console.log(`  -> No duplicate or space, moving to next`);
      i += 1; // Move to next character
    }
  }
  
  console.log(`Final result: "${result}"`);
  return result.trim();
}

// Test the problematic cases
console.log('=== Testing problematic cases ===');
sanitizeInputDebug('git pull');
sanitizeInputDebug('aaabbbbcccc'); 