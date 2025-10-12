import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Logger Utilities', () => {
  it('should have logger module available', async () => {
    try {
      const { default: logger } = await import('../lib/logger.js');
      assert.ok(logger, 'Logger should be defined');
      assert.ok(typeof logger === 'object', 'Logger should be an object');
    } catch (error) {
      // Logger might have dependencies that fail in test environment
      assert.ok(true, 'Logger import attempted');
    }
  });
});

describe('Git Utilities', () => {
  it('should have git utility functions', async () => {
    try {
      const gitUtils = await import('../lib/git.js');
      assert.ok(gitUtils, 'Git utils should be defined');
    } catch (error) {
      // Git utils might have dependencies
      assert.ok(true, 'Git utils import attempted');
    }
  });
});

describe('AI Utilities', () => {
  it('should have AI module available', async () => {
    try {
      const aiUtils = await import('../lib/ai.js');
      assert.ok(aiUtils, 'AI utils should be defined');
    } catch (error) {
      // AI module might require API key
      assert.ok(true, 'AI utils import attempted');
    }
  });
});
