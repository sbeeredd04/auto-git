/**
 * Markdown rendering utilities for GitCue terminal
 * Provides clean, formatted markdown rendering for terminal output
 */

export interface MarkdownRenderOptions {
  maxWidth?: number;
  colors?: {
    header: string;
    code: string;
    bold: string;
    italic: string;
    list: string;
    quote: string;
    reset: string;
    dim: string;
  };
}

export class MarkdownRenderer {
  private options: Required<MarkdownRenderOptions>;

  constructor(options: MarkdownRenderOptions = {}) {
    this.options = {
      maxWidth: options.maxWidth || 80,
      colors: {
        header: '\x1b[1m\x1b[34m',    // Bold blue
        code: '\x1b[36m',             // Cyan
        bold: '\x1b[1m',              // Bold
        italic: '\x1b[3m',            // Italic
        list: '\x1b[32m',             // Green
        quote: '\x1b[90m',            // Gray
        reset: '\x1b[0m',             // Reset
        dim: '\x1b[2m',               // Dim
        ...options.colors
      }
    };
  }

  /**
   * Render markdown content to terminal-friendly format
   */
  render(content: string): string {
    const lines = content.split('\n');
    const rendered: string[] = [];
    let inCodeBlock = false;
    let codeBlockLanguage = '';

    for (let line of lines) {
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          inCodeBlock = false;
          rendered.push(this.options.colors.dim + '└─' + this.options.colors.reset);
        } else {
          inCodeBlock = true;
          codeBlockLanguage = line.substring(3).trim();
          rendered.push(this.options.colors.dim + '┌─ ' + (codeBlockLanguage || 'code') + this.options.colors.reset);
        }
        continue;
      }

      if (inCodeBlock) {
        rendered.push(this.options.colors.code + '│ ' + line + this.options.colors.reset);
        continue;
      }

      // Process the line for inline formatting
      const processedLine = this.processInlineFormatting(line);
      rendered.push(processedLine);
    }

    return rendered.join('\r\n');
  }

  /**
   * Process inline markdown formatting
   */
  private processInlineFormatting(line: string): string {
    // Skip empty lines
    if (line.trim() === '') {
      return '';
    }

    // Handle headers
    if (line.startsWith('####')) {
      return this.options.colors.header + '▸ ' + line.substring(4).trim() + this.options.colors.reset;
    }
    if (line.startsWith('###')) {
      return this.options.colors.header + '▶ ' + line.substring(3).trim() + this.options.colors.reset;
    }
    if (line.startsWith('##')) {
      return this.options.colors.header + '■ ' + line.substring(2).trim() + this.options.colors.reset;
    }
    if (line.startsWith('#')) {
      return this.options.colors.header + '● ' + line.substring(1).trim() + this.options.colors.reset;
    }

    // Handle lists
    if (line.match(/^\s*[-*+]\s/)) {
      return line.replace(/^(\s*)([-*+])(\s)/, `$1${this.options.colors.list}•${this.options.colors.reset}$3`);
    }

    // Handle numbered lists
    if (line.match(/^\s*\d+\.\s/)) {
      return line.replace(/^(\s*)(\d+\.)(\s)/, `$1${this.options.colors.list}$2${this.options.colors.reset}$3`);
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      return this.options.colors.quote + '│ ' + line.substring(1).trim() + this.options.colors.reset;
    }

    // Handle inline formatting
    let processed = line;

    // Bold text **text**
    processed = processed.replace(/\*\*(.*?)\*\*/g, this.options.colors.bold + '$1' + this.options.colors.reset);

    // Italic text *text*
    processed = processed.replace(/\*(.*?)\*/g, this.options.colors.italic + '$1' + this.options.colors.reset);

    // Inline code `code`
    processed = processed.replace(/`(.*?)`/g, this.options.colors.code + '$1' + this.options.colors.reset);

    return processed;
  }

  /**
   * Create a simple box around text
   */
  createBox(text: string, title?: string): string {
    const lines = text.split('\n');
    const maxLength = Math.max(...lines.map(line => this.stripAnsi(line).length), title ? title.length : 0);
    const width = Math.min(maxLength + 4, this.options.maxWidth);

    let box = this.options.colors.dim + '┌' + '─'.repeat(width - 2) + '┐' + this.options.colors.reset + '\r\n';

    if (title) {
      const padding = Math.max(0, width - title.length - 4);
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      box += this.options.colors.dim + '│ ' + this.options.colors.reset + 
             ' '.repeat(leftPad) + this.options.colors.bold + title + this.options.colors.reset + 
             ' '.repeat(rightPad) + this.options.colors.dim + ' │' + this.options.colors.reset + '\r\n';
      box += this.options.colors.dim + '├' + '─'.repeat(width - 2) + '┤' + this.options.colors.reset + '\r\n';
    }

    lines.forEach(line => {
      const cleanLine = this.stripAnsi(line);
      const padding = Math.max(0, width - cleanLine.length - 4);
      box += this.options.colors.dim + '│ ' + this.options.colors.reset + 
             line + ' '.repeat(padding) + 
             this.options.colors.dim + ' │' + this.options.colors.reset + '\r\n';
    });

    box += this.options.colors.dim + '└' + '─'.repeat(width - 2) + '┘' + this.options.colors.reset;

    return box;
  }

  /**
   * Strip ANSI escape codes from text
   */
  private stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, '');
  }

  /**
   * Wrap text to specified width
   */
  wrapText(text: string, width?: number): string {
    const maxWidth = width || this.options.maxWidth;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          lines.push(word);
        }
      } else {
        currentLine += word + ' ';
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    return lines.join('\r\n');
  }
}

/**
 * Default markdown renderer instance
 */
export const defaultMarkdownRenderer = new MarkdownRenderer();

/**
 * Quick render function for markdown content
 */
export function renderMarkdown(content: string, options?: MarkdownRenderOptions): string {
  const renderer = new MarkdownRenderer(options);
  return renderer.render(content);
}

/**
 * Create a formatted error suggestion box
 */
export function createErrorSuggestionBox(suggestion: string): string {
  const renderer = new MarkdownRenderer();
  const rendered = renderer.render(suggestion);
  return renderer.createBox(rendered, '�� AI Analysis');
} 