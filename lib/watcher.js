import chokidar from 'chokidar';
import { getDiff, addAll, commit, push, hasChanges, isGitRepository, hasRemote } from './git.js';
import { generateCommitMessage } from './gemini.js';
import { getConfig, getWatchPatterns, getWatchOptions } from './config.js';

let debounceTimer = null;
let isProcessing = false;

export function startWatcher(paths = null) {
  return new Promise((resolve, reject) => {
    const config = getConfig();
    
    // Use provided paths or fall back to config defaults
    const watchPaths = paths || getWatchPatterns();
    const watchOptions = getWatchOptions();
    
    // Validate we're in a git repository
    isGitRepository().then(isRepo => {
      if (!isRepo) {
        reject(new Error('Not a git repository. Please run this command in a git repository.'));
        return;
      }
      
      console.log('🔍 Starting file watcher...');
      console.log(`📁 Watching paths: ${watchPaths.join(', ')}`);
      console.log(`⏱️  Debounce time: ${config.debounceMs}ms`);
      console.log(`🔧 Recursive watching: ${watchOptions.depth === undefined ? 'Yes (all levels)' : 'Limited'}`);
      
      const watcher = chokidar.watch(watchPaths, watchOptions);

      let ready = false;

      watcher.on('ready', () => {
        ready = true;
        console.log('✅ File watcher ready. Monitoring for changes recursively...');
        console.log('📂 Watching all files and subdirectories in the repository');
        console.log('💡 Press Ctrl+C to stop watching');
        resolve(watcher);
      });

      watcher.on('error', error => {
        console.error('❌ Watcher error:', error);
        reject(error);
      });

      watcher.on('all', async (event, filePath) => {
        if (!ready || isProcessing) return;
        
        console.log(`📝 Detected ${event} on ${filePath}`);
        
        // Clear existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        // Set new timer
        debounceTimer = setTimeout(async () => {
          await handleChange();
        }, config.debounceMs);
      });
    }).catch(reject);
  });
}

async function handleChange() {
  if (isProcessing) return;
  
  isProcessing = true;
  
  try {
    console.log('\n🔄 Processing changes...');
    
    // Check if there are any changes
    const hasAnyChanges = await hasChanges();
    if (!hasAnyChanges) {
      console.log('ℹ️  No changes detected, skipping commit.');
      return;
    }
    
    // Get the diff
    const diff = await getDiff();
    if (!diff || diff.trim().length === 0) {
      console.log('ℹ️  No meaningful diff found, skipping commit.');
      return;
    }
    
    console.log('📊 Changes detected, generating commit message...');
    
    // Generate commit message
    const message = await generateCommitMessage(diff);
    
    // Perform git operations
    await addAll();
    await commit(message);
    
    // Only push if we have a remote
    const remote = await hasRemote();
    if (remote) {
      await push();
      console.log('✅ Successfully committed and pushed!');
    } else {
      console.log('✅ Successfully committed! (No remote configured for push)');
    }
    
    console.log(`📝 Commit message: "${message}"`);
    console.log('👀 Watching for more changes...\n');
    
  } catch (error) {
    console.error('❌ Auto-commit failed:', error.message);
    
    // If it's an API error, be more specific
    if (error.message.includes('GEMINI_API_KEY')) {
      console.error('💡 Make sure to set your GEMINI_API_KEY environment variable');
    } else if (error.message.includes('API error')) {
      console.error('💡 Check your API key and internet connection');
    }
    
    console.log('👀 Continuing to watch for changes...\n');
  } finally {
    isProcessing = false;
  }
}

export async function performSingleCommit() {
  console.log('🔄 Performing single commit...');
  
  // Validate we're in a git repository
  const isRepo = await isGitRepository();
  if (!isRepo) {
    throw new Error('Not a git repository. Please run this command in a git repository.');
  }
  
  // Check if there are any changes
  const hasAnyChanges = await hasChanges();
  if (!hasAnyChanges) {
    console.log('ℹ️  No changes to commit.');
    return;
  }
  
  // Get the diff
  const diff = await getDiff();
  if (!diff || diff.trim().length === 0) {
    console.log('ℹ️  No meaningful diff found.');
    return;
  }
  
  console.log('📊 Analyzing changes...');
  
  // Generate commit message
  const message = await generateCommitMessage(diff);
  
  // Perform git operations
  await addAll();
  await commit(message);
  
  // Only push if we have a remote
  const remote = await hasRemote();
  if (remote) {
    await push();
    console.log('✅ Successfully committed and pushed!');
  } else {
    console.log('✅ Successfully committed! (No remote configured for push)');
  }
  
  console.log(`📝 Commit message: "${message}"`);
} 