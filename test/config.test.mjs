import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getConfig } from '../lib/config.js';

describe('Configuration Module', () => {
  it('should return default configuration', () => {
    const config = getConfig();
    
    assert.ok(config, 'Config should be defined');
    assert.ok(typeof config === 'object', 'Config should be an object');
  });

  it('should have required properties', () => {
    const config = getConfig();
    
    assert.ok('commitMode' in config, 'Should have commitMode');
    assert.ok('debounceMs' in config, 'Should have debounceMs');
    assert.ok('watchPaths' in config, 'Should have watchPaths');
  });

  it('should have valid commit mode', () => {
    const config = getConfig();
    
    assert.ok(['periodic', 'intelligent'].includes(config.commitMode), 
      'Commit mode should be either periodic or intelligent');
  });

  it('should have positive debounce value', () => {
    const config = getConfig();
    
    assert.ok(config.debounceMs > 0, 'Debounce should be positive');
    assert.ok(typeof config.debounceMs === 'number', 'Debounce should be a number');
  });
});
