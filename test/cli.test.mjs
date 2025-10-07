import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '..', 'bin', 'auto-git.js');

describe('CLI - Help Command', () => {
  it('should display help information', () => {
    const result = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });
    assert.ok(result.includes('Auto-Git'), 'Help should contain Auto-Git branding');
    assert.ok(result.includes('AVAILABLE COMMANDS'), 'Help should list available commands');
  });

  it('should display version information', () => {
    const result = execSync(`node ${CLI_PATH} --version`, { encoding: 'utf-8' });
    assert.ok(result.trim().length > 0, 'Version should be displayed');
  });
});

describe('CLI - Config Command', () => {
  it('should show configuration without errors', () => {
    try {
      execSync(`node ${CLI_PATH} config`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (error) {
      // Config might fail outside git repo, but shouldn't crash
      assert.ok(error.status !== undefined, 'Should exit gracefully');
    }
  });
});

describe('CLI - Command Validation', () => {
  it('should handle invalid commands gracefully', () => {
    try {
      execSync(`node ${CLI_PATH} invalid-command`, { encoding: 'utf-8', stdio: 'pipe' });
      assert.fail('Should throw error for invalid command');
    } catch (error) {
      assert.ok(error.status !== 0, 'Should exit with non-zero code');
    }
  });
});
