import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { loadGitignorePatterns } from '../lib/utils.js';

describe('Gitignore Integration', () => {
  const testDir = '/tmp/auto-git-test';
  const gitignorePath = join(testDir, '.gitignore');
  
  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test files
    if (existsSync(gitignorePath)) {
      unlinkSync(gitignorePath);
    }
  });
  
  it('should return empty array when .gitignore does not exist', () => {
    const patterns = loadGitignorePatterns(testDir);
    assert.deepStrictEqual(patterns, []);
  });
  
  it('should parse simple .gitignore patterns', () => {
    const gitignoreContent = `node_modules/
dist/
*.log`;
    writeFileSync(gitignorePath, gitignoreContent);
    
    const patterns = loadGitignorePatterns(testDir);
    
    assert.ok(Array.isArray(patterns), 'Should return an array');
    assert.ok(patterns.length > 0, 'Should have patterns');
    assert.ok(patterns.includes('**/node_modules/'), 'Should include node_modules pattern');
    assert.ok(patterns.includes('**/dist/'), 'Should include dist pattern');
    assert.ok(patterns.includes('**/*.log'), 'Should include log pattern');
  });
  
  it('should ignore empty lines and comments', () => {
    const gitignoreContent = `# This is a comment
node_modules/

# Another comment
dist/
`;
    writeFileSync(gitignorePath, gitignoreContent);
    
    const patterns = loadGitignorePatterns(testDir);
    
    assert.ok(patterns.length === 2, 'Should only include non-comment, non-empty lines');
  });
  
  it('should handle patterns with leading slash', () => {
    const gitignoreContent = `/build
/temp`;
    writeFileSync(gitignorePath, gitignoreContent);
    
    const patterns = loadGitignorePatterns(testDir);
    
    assert.ok(patterns.includes('build'), 'Should remove leading slash');
    assert.ok(patterns.includes('temp'), 'Should remove leading slash');
  });
  
  it('should handle mixed patterns', () => {
    const gitignoreContent = `# Node.js dependencies
node_modules/
/build
*.log
.env
*.tmp`;
    writeFileSync(gitignorePath, gitignoreContent);
    
    const patterns = loadGitignorePatterns(testDir);
    
    assert.ok(patterns.length >= 5, 'Should parse all non-comment patterns');
  });
  
  it('should handle read errors gracefully', () => {
    // Test with a directory that doesn't exist
    const patterns = loadGitignorePatterns('/nonexistent/path');
    assert.deepStrictEqual(patterns, [], 'Should return empty array on error');
  });
});
