import chalk from 'chalk';

/**
 * Markdown utility for formatting AI responses with syntax highlighting
 */

// ANSI color codes for markdown formatting
const colors = {
  heading: chalk.cyan.bold,
  subheading: chalk.blue.bold,
  code: chalk.yellow,
  codeBlock: chalk.gray,
  bold: chalk.white.bold,
  italic: chalk.white.italic,
  link: chalk.blue.underline,
  quote: chalk.gray.italic,
  list: chalk.green,
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow,
  info: chalk.blue,
  gray: chalk.gray
};

/**
 * Parse and format markdown text for terminal display
 * @param {string} markdown - Raw markdown text
 * @returns {string} - Formatted text for terminal
 */
export function formatMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return markdown;
  }

  let formatted = markdown;

  // Format headings
  formatted = formatted.replace(/^### (.*$)/gm, colors.subheading('### $1'));
  formatted = formatted.replace(/^## (.*$)/gm, colors.heading('## $1'));
  formatted = formatted.replace(/^# (.*$)/gm, colors.heading('# $1'));

  // Format code blocks
  formatted = formatted.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split('\n');
    const language = lines[0].replace('```', '').trim();
    const code = lines.slice(1, -1).join('\n');
    
    return colors.codeBlock('```' + language + '\n' + code + '\n```');
  });

  // Format inline code
  formatted = formatted.replace(/`([^`]+)`/g, colors.code('`$1`'));

  // Format bold text
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, colors.bold('$1'));

  // Format italic text
  formatted = formatted.replace(/\*(.*?)\*/g, colors.italic('$1'));

  // Format links
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, colors.link('$1') + colors.gray(' ($2)'));

  // Format blockquotes
  formatted = formatted.replace(/^> (.*$)/gm, colors.quote('> $1'));

  // Format lists
  formatted = formatted.replace(/^[\s]*[-*+] (.*$)/gm, colors.list('• $1'));
  formatted = formatted.replace(/^[\s]*\d+\. (.*$)/gm, colors.list('$&'));

  return formatted;
}

/**
 * Format AI suggestion with proper styling and line wrapping
 * @param {string} suggestion - AI suggestion text
 * @returns {string} - Formatted suggestion
 */
export function formatAISuggestion(suggestion) {
  const formatted = formatMarkdown(suggestion);
  
  // Wrap long lines to fit terminal width
  const maxWidth = Math.min(process.stdout.columns || 80, 80) - 4; // Leave space for borders
  const wrappedLines = [];
  
  formatted.split('\n').forEach(line => {
    const cleanLine = stripAnsi(line);
    if (cleanLine.length <= maxWidth) {
      wrappedLines.push(line);
    } else {
      // Split long lines into multiple lines
      const words = line.split(' ');
      let currentLine = '';
      let currentCleanLine = '';
      
      for (const word of words) {
        const cleanWord = stripAnsi(word);
        const testLine = currentCleanLine + (currentCleanLine ? ' ' : '') + cleanWord;
        
        if (testLine.length <= maxWidth) {
          currentLine += (currentLine ? ' ' : '') + word;
          currentCleanLine = testLine;
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine);
          }
          currentLine = word;
          currentCleanLine = cleanWord;
        }
      }
      
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }
  });
  
  // Create box with consistent width
  const boxWidth = Math.min(maxWidth + 2, 78);
  const border = '─'.repeat(boxWidth);
  
  const content = wrappedLines.map(line => {
    const cleanLine = stripAnsi(line);
    const padding = boxWidth - cleanLine.length - 2;
    return `│ ${line}${' '.repeat(Math.max(0, padding))} │`;
  }).join('\n');
  
  return `\n┌${border}┐\n${content}\n└${border}┘\n`;
}

/**
 * Format command suggestions with syntax highlighting
 * @param {string[]} commands - Array of command suggestions
 * @returns {string} - Formatted commands
 */
export function formatCommandSuggestions(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    return '';
  }

  const formatted = commands.map((cmd, index) => {
    const number = colors.info(`${index + 1}.`);
    const command = colors.code(cmd);
    return `  ${number} ${command}`;
  }).join('\n');

  return `\n${colors.heading('Suggested Commands:')}\n${formatted}\n`;
}

/**
 * Format error message with context
 * @param {string} error - Error message
 * @param {string} context - Additional context
 * @returns {string} - Formatted error
 */
export function formatError(error, context = '') {
  const formattedError = colors.error('✗ ') + error;
  const formattedContext = context ? colors.gray(`Context: ${context}`) : '';
  
  return formattedContext ? `${formattedError}\n${formattedContext}` : formattedError;
}

/**
 * Format success message
 * @param {string} message - Success message
 * @returns {string} - Formatted success message
 */
export function formatSuccess(message) {
  return colors.success('✓ ') + message;
}

/**
 * Format warning message
 * @param {string} message - Warning message
 * @returns {string} - Formatted warning message
 */
export function formatWarning(message) {
  return colors.warning('⚠ ') + message;
}

/**
 * Format info message
 * @param {string} message - Info message
 * @returns {string} - Formatted info message
 */
export function formatInfo(message) {
  return colors.info('ℹ ') + message;
}

/**
 * Strip ANSI escape codes from text
 * @param {string} text - Text with ANSI codes
 * @returns {string} - Clean text
 */
function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Create a formatted box around text
 * @param {string} text - Text to box
 * @param {string} title - Optional title for the box
 * @returns {string} - Boxed text
 */
export function createBox(text, title = '') {
  const lines = text.split('\n');
  const maxLength = Math.max(...lines.map(line => stripAnsi(line).length));
  const width = Math.min(maxLength + 4, 80);
  
  const topBorder = title 
    ? `┌─ ${colors.heading(title)} ${'─'.repeat(Math.max(0, width - title.length - 5))}┐`
    : `┌${'─'.repeat(width)}┐`;
  
  const bottomBorder = `└${'─'.repeat(width)}┘`;
  
  const content = lines.map(line => {
    const padding = width - stripAnsi(line).length - 2;
    return `│ ${line}${' '.repeat(Math.max(0, padding))} │`;
  }).join('\n');
  
  return `${topBorder}\n${content}\n${bottomBorder}`;
}

/**
 * Format git command with syntax highlighting
 * @param {string} command - Git command
 * @returns {string} - Formatted command
 */
export function formatGitCommand(command) {
  if (!command.startsWith('git ')) {
    return colors.code(command);
  }
  
  const parts = command.split(' ');
  const git = colors.success('git');
  const subcommand = colors.info(parts[1]);
  const args = parts.slice(2).map(arg => {
    if (arg.startsWith('--')) {
      return colors.warning(arg);
    } else if (arg.startsWith('-')) {
      return colors.yellow(arg);
    }
    return colors.code(arg);
  }).join(' ');
  
  return `${git} ${subcommand} ${args}`.trim();
}

export default {
  formatMarkdown,
  formatAISuggestion,
  formatCommandSuggestions,
  formatError,
  formatSuccess,
  formatWarning,
  formatInfo,
  createBox,
  formatGitCommand
}; 