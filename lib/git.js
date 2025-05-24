import { execa } from 'execa';
import logger from '../utils/logger.js';

export async function isGitRepository() {
  try {
    await execa('git', ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

export async function hasChanges() {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain']);
    return stdout.trim().length > 0;
  } catch (error) {
    throw new Error(`Failed to check git status: ${error.message}`);
  }
}

export async function getDiff() {
  try {
    // Get both staged and unstaged changes
    const [unstaged, staged] = await Promise.all([
      execa('git', ['diff']).then(r => r.stdout).catch(() => ''),
      execa('git', ['diff', '--cached']).then(r => r.stdout).catch(() => '')
    ]);
    
    let diff = '';
    if (unstaged) diff += `Unstaged changes:\n${unstaged}\n\n`;
    if (staged) diff += `Staged changes:\n${staged}\n\n`;
    
    // If no diff from standard commands, check for untracked files
    if (!diff.trim()) {
      const { stdout: untracked } = await execa('git', ['ls-files', '--others', '--exclude-standard']);
      if (untracked.trim()) {
        diff = `New untracked files:\n${untracked}`;
      }
    }
    
    return diff.trim();
  } catch (error) {
    throw new Error(`Failed to get git diff: ${error.message}`);
  }
}

export async function getStatus() {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain']);
    return stdout;
  } catch (error) {
    throw new Error(`Failed to get git status: ${error.message}`);
  }
}

export async function addAll() {
  try {
    logger.debug('Staging all changes with git add .');
    await execa('git', ['add', '.']);
  } catch (error) {
    throw new Error(`Failed to stage changes: ${error.message}`);
  }
}

export async function commit(message) {
  try {
    logger.debug(`Executing git commit with message: "${message}"`);
    await execa('git', ['commit', '-m', message]);
  } catch (error) {
    throw new Error(`Failed to commit: ${error.message}`);
  }
}

export async function push() {
  try {
    logger.debug('Pushing changes to remote repository');
    await execa('git', ['push']);
  } catch (error) {
    // Check if it's because no upstream is set
    if (error.message.includes('no upstream branch')) {
      const { stdout } = await execa('git', ['branch', '--show-current']);
      const currentBranch = stdout.trim();
      logger.debug(`Setting upstream for branch "${currentBranch}"`);
      await execa('git', ['push', '--set-upstream', 'origin', currentBranch]);
    } else {
      throw new Error(`Failed to push: ${error.message}`);
    }
  }
}

export async function getCurrentBranch() {
  try {
    const { stdout } = await execa('git', ['branch', '--show-current']);
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to get current branch: ${error.message}`);
  }
}

export async function hasRemote() {
  try {
    const { stdout } = await execa('git', ['remote']);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
} 