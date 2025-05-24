import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';

/**
 * Centralized logging utility for Auto-Git
 * Provides colorized, boxed, and professional console output
 */
class Logger {
  constructor() {
    this.spinner = null;
    this.verbose = false;
  }

  /**
   * Set verbose mode for detailed logging
   */
  setVerbose(verbose = true) {
    this.verbose = verbose;
  }

  /**
   * Create a styled box for important messages
   */
  _createBox(message, options = {}) {
    return boxen(message, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue',
      ...options
    });
  }

  /**
   * Success message with green box
   */
  success(message, details = null) {
    const content = details 
      ? `${chalk.bold.green('SUCCESS')}\n\n${message}\n\n${chalk.dim(details)}`
      : `${chalk.bold.green('SUCCESS')}\n\n${message}`;
    
    console.log(this._createBox(content, {
      borderColor: 'green',
      borderStyle: 'double'
    }));
  }

  /**
   * Error message with red box
   */
  error(message, details = null) {
    const content = details 
      ? `${chalk.bold.red('ERROR')}\n\n${message}\n\n${chalk.dim(details)}`
      : `${chalk.bold.red('ERROR')}\n\n${message}`;
    
    console.error(this._createBox(content, {
      borderColor: 'red',
      borderStyle: 'double'
    }));
  }

  /**
   * Warning message with yellow box
   */
  warning(message, details = null) {
    const content = details 
      ? `${chalk.bold.yellow('WARNING')}\n\n${message}\n\n${chalk.dim(details)}`
      : `${chalk.bold.yellow('WARNING')}\n\n${message}`;
    
    console.warn(this._createBox(content, {
      borderColor: 'yellow'
    }));
  }

  /**
   * Info message with blue styling
   */
  info(message, title = 'INFO') {
    console.log(chalk.blue(`[${title}]`), chalk.white(message));
  }

  /**
   * Debug message (only shown in verbose mode)
   */
  debug(message) {
    if (this.verbose) {
      console.log(chalk.dim(`[DEBUG] ${message}`));
    }
  }

  /**
   * Status update with colored prefix
   */
  status(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      processing: chalk.cyan
    };
    
    const color = colors[type] || chalk.white;
    console.log(color('▶'), chalk.white(message));
  }

  /**
   * Section header with styled box
   */
  section(title, subtitle = null) {
    const content = subtitle 
      ? `${chalk.bold.white(title)}\n${chalk.dim(subtitle)}`
      : chalk.bold.white(title);
    
    console.log(this._createBox(content, {
      borderColor: 'cyan',
      borderStyle: 'classic',
      padding: { top: 0, bottom: 0, left: 2, right: 2 }
    }));
  }

  /**
   * Configuration display
   */
  config(title, items) {
    let content = chalk.bold.blue(title) + '\n\n';
    
    Object.entries(items).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean' 
        ? (value ? chalk.green('✓ Yes') : chalk.red('✗ No'))
        : chalk.white(value);
      
      content += `${chalk.cyan(key.padEnd(20))} ${displayValue}\n`;
    });

    console.log(this._createBox(content.trim(), {
      borderColor: 'blue',
      padding: 1
    }));
  }

  /**
   * Repository status display
   */
  repoStatus(branch, hasRemote, apiKeySet) {
    const items = {
      'Repository': chalk.green('✓ Valid Git repository'),
      'Branch': chalk.white(branch),
      'Remote': hasRemote ? chalk.green('✓ Configured') : chalk.yellow('✗ Not configured'),
      'API Key': apiKeySet ? chalk.green('✓ Set') : chalk.red('✗ Missing')
    };

    this.config('REPOSITORY STATUS', items);
  }

  /**
   * Watch configuration display
   */
  watchConfig(paths, debounceMs, recursive) {
    const items = {
      'Watch Paths': paths.join(', '),
      'Debounce Time': `${debounceMs}ms`,
      'Recursive': recursive,
      'Mode': 'File watching active'
    };

    this.config('WATCH CONFIGURATION', items);
  }

  /**
   * File change notification
   */
  fileChange(event, path) {
    console.log(
      chalk.cyan('▶ File Change:'),
      chalk.yellow(event),
      chalk.dim('→'),
      chalk.white(path)
    );
  }

  /**
   * Processing stage indicator
   */
  stage(message, type = 'info') {
    const symbols = {
      info: '▶',
      success: '✓',
      error: '✗',
      processing: '●'
    };
    
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      processing: chalk.cyan
    };
    
    const symbol = symbols[type] || '▶';
    const color = colors[type] || chalk.white;
    
    console.log(color(symbol), chalk.white(message));
  }

  /**
   * Start a spinner for long operations
   */
  startSpinner(text, type = 'dots') {
    this.stopSpinner(); // Stop any existing spinner
    this.spinner = ora({
      text: chalk.cyan(text),
      spinner: type,
      color: 'cyan'
    }).start();
    return this.spinner;
  }

  /**
   * Update spinner text
   */
  updateSpinner(text) {
    if (this.spinner) {
      this.spinner.text = chalk.cyan(text);
    }
  }

  /**
   * Stop spinner with success
   */
  succeedSpinner(text) {
    if (this.spinner) {
      this.spinner.succeed(chalk.green(text));
      this.spinner = null;
    }
  }

  /**
   * Stop spinner with failure
   */
  failSpinner(text) {
    if (this.spinner) {
      this.spinner.fail(chalk.red(text));
      this.spinner = null;
    }
  }

  /**
   * Stop spinner without message
   */
  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  /**
   * Simple divider line
   */
  divider() {
    console.log(chalk.dim('─'.repeat(process.stdout.columns || 80)));
  }

  /**
   * Blank line for spacing
   */
  space() {
    console.log();
  }

  /**
   * Final result display
   */
  result(success, message, details = null) {
    if (success) {
      this.success(message, details);
    } else {
      this.error(message, details);
    }
  }

  /**
   * Setup instructions display
   */
  setup(steps) {
    const content = steps.map((step, index) => 
      `${chalk.bold.cyan(`${index + 1}.`)} ${step}`
    ).join('\n\n');

    console.log(this._createBox(
      `${chalk.bold.blue('AUTO-GIT SETUP')}\n\n${content}`,
      {
        borderColor: 'blue',
        borderStyle: 'double',
        padding: 1
      }
    ));
  }

  /**
   * Commit summary display
   */
  commitSummary(message, hasRemote) {
    const operation = hasRemote ? 'Committed and Pushed' : 'Committed (Local Only)';
    const content = `${chalk.bold.green(operation)}\n\n${chalk.white(message)}`;
    
    console.log(this._createBox(content, {
      borderColor: 'green',
      borderStyle: hasRemote ? 'double' : 'single'
    }));
  }
}

// Export singleton instance
export default new Logger(); 