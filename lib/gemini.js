import { GoogleGenAI, Type } from '@google/genai';
import { validateConfig } from './config.js';
import { rateLimiter } from './rateLimiter.js';
import logger from '../utils/logger.js';

// Configure the client
let ai = null;

function getAIClient() {
  if (!ai) {
    const { apiKey } = validateConfig();
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Function declaration for intelligent commit decisions
const shouldCommitFunctionDeclaration = {
  name: 'should_commit_changes',
  description: 'Analyzes code changes and determines if they warrant a commit based on significance, completeness, and configurable thresholds.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      shouldCommit: {
        type: Type.BOOLEAN,
        description: 'Whether the changes meet the threshold and completeness requirements for a commit'
      },
      reason: {
        type: Type.STRING,
        description: 'Detailed explanation for the commit decision, including threshold and completeness analysis'
      },
      commitMessage: {
        type: Type.STRING,
        description: 'Suggested commit message if shouldCommit is true'
      },
      significance: {
        type: Type.STRING,
        enum: ['trivial', 'minor', 'medium', 'major', 'critical'],
        description: 'The significance level of the changes: trivial (formatting, comments), minor (small fixes), medium (features, refactoring), major (new functionality, breaking changes), critical (security, major features)'
      },
      completeness: {
        type: Type.STRING,
        enum: ['incomplete', 'partial', 'complete'],
        description: 'Whether the changes represent a complete implementation: incomplete (work in progress), partial (functional but missing pieces), complete (ready for commit)'
      },
      changeType: {
        type: Type.STRING,
        enum: ['feature', 'bugfix', 'refactor', 'docs', 'style', 'test', 'chore', 'performance', 'security'],
        description: 'The primary type of change being made'
      },
      riskLevel: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high'],
        description: 'Risk level of the changes: low (safe changes), medium (moderate impact), high (breaking changes, major refactoring)'
      }
    },
    required: ['shouldCommit', 'reason', 'significance', 'completeness', 'changeType']
  }
};

export async function generateCommitMessage(diffText) {
  validateConfig();
  
  if (!diffText || diffText.trim().length === 0) {
    throw new Error('No diff text provided for commit message generation');
  }

  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = Math.ceil(rateLimiter.getTimeUntilNextCall() / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`);
  }

  logger.debug('Calling Gemini API for commit message generation...');

  try {
    const aiClient = getAIClient();
    
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Generate a conventional commit message for these changes. Use format: type(scope): description

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep messages under 50 characters for the subject line
- Be specific but concise
- Focus on what changed, not how
- Use imperative mood (e.g., "add" not "added")

Examples:
- feat(auth): add user login validation
- fix(api): resolve null pointer exception
- docs(readme): update installation steps
- refactor(utils): simplify date formatting

Changes to analyze:
${diffText}`
        }]
      }]
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty commit message');
    }

    // Clean up the response - remove any extra formatting or explanations
    const commitMessage = response.text
      .split('\n')[0] // Take only the first line
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .trim();

    if (!commitMessage) {
      throw new Error('Gemini returned an empty commit message');
    }

    // Record the API call for rate limiting
    rateLimiter.recordCall();
    
    logger.debug(`Generated commit message: "${commitMessage}"`);
    return commitMessage;
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to generate commit message: ${error.message}`);
    }
    throw error;
  }
}

export async function analyzeChangesForCommit(diffText, commitThreshold = 'medium', requireCompleteness = true) {
  validateConfig();
  
  if (!diffText || diffText.trim().length === 0) {
    throw new Error('No diff text provided for commit analysis');
  }

  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = Math.ceil(rateLimiter.getTimeUntilNextCall() / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`);
  }

  logger.debug(`Calling Gemini API for intelligent commit analysis with threshold: ${commitThreshold}, requireCompleteness: ${requireCompleteness}`);

  try {
    const aiClient = getAIClient();
    
    // Build threshold-specific guidance
    const thresholdGuidance = getThresholdGuidance(commitThreshold);
    const completenessGuidance = requireCompleteness ? 
      '\n\n**CRITICAL: Only commit if changes are COMPLETE implementations. Do not commit work-in-progress, partial implementations, or incomplete features.**' : 
      '\n\n**Completeness is preferred but not required for commits.**';

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [{
          text: `Analyze these code changes and determine if they warrant a commit based on the configured threshold and completeness requirements.

**COMMIT THRESHOLD: ${commitThreshold.toUpperCase()}**
${thresholdGuidance}${completenessGuidance}

**Analysis Framework:**

1. **Significance Assessment** (trivial → minor → medium → major → critical):
   - **Trivial**: Whitespace, formatting, comments only
   - **Minor**: Small bug fixes, typos, minor tweaks
   - **Medium**: Feature additions, meaningful refactoring, substantial bug fixes
   - **Major**: New functionality, breaking changes, architectural changes
   - **Critical**: Security fixes, major features, system-wide changes

2. **Completeness Assessment** (incomplete → partial → complete):
   - **Incomplete**: Work in progress, debugging code, temporary changes
   - **Partial**: Functional but missing tests, documentation, or edge cases
   - **Complete**: Fully implemented, tested, documented, ready for production

3. **Change Type Classification**:
   - Identify the primary type: feature, bugfix, refactor, docs, style, test, chore, performance, security

4. **Risk Assessment**:
   - **Low**: Safe changes with minimal impact
   - **Medium**: Changes that could affect existing functionality
   - **High**: Breaking changes, major refactoring, architectural modifications

**Decision Logic:**
- Must meet or exceed the significance threshold: ${commitThreshold}
- Must meet completeness requirement: ${requireCompleteness ? 'complete' : 'any'}
- Consider if changes form a logical, atomic unit
- Avoid committing broken, incomplete, or experimental code
- Prioritize clean, meaningful commits over frequent commits

**Files and Changes to Analyze:**
${diffText}`
        }]
      }],
      config: {
        tools: [{
          functionDeclarations: [shouldCommitFunctionDeclaration]
        }]
      }
    });

    // Check for function calls in the response
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      
      if (functionCall.name === 'should_commit_changes') {
        // Record the API call for rate limiting
        rateLimiter.recordCall();
        
        const args = functionCall.args;
        logger.debug(`Commit analysis result: ${JSON.stringify(args)}`);
        
        // Apply threshold filtering
        const meetsThreshold = checkSignificanceThreshold(args.significance, commitThreshold);
        const meetsCompleteness = !requireCompleteness || args.completeness === 'complete';
        
        // Override shouldCommit based on threshold and completeness
        const finalShouldCommit = args.shouldCommit && meetsThreshold && meetsCompleteness;
        
        if (args.shouldCommit && !finalShouldCommit) {
          const reasons = [];
          if (!meetsThreshold) reasons.push(`significance '${args.significance}' below threshold '${commitThreshold}'`);
          if (!meetsCompleteness) reasons.push(`completeness '${args.completeness}' does not meet requirement`);
          args.reason += ` (Filtered out: ${reasons.join(', ')})`;
        }
        
        return {
          shouldCommit: finalShouldCommit,
          reason: args.reason,
          commitMessage: args.commitMessage || null,
          significance: args.significance,
          completeness: args.completeness || 'unknown',
          changeType: args.changeType || 'unknown',
          riskLevel: args.riskLevel || 'medium'
        };
      }
    }
    
    // Fallback if no function call was made
    throw new Error('Gemini did not provide a structured commit analysis');
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to analyze changes for commit: ${error.message}`);
    }
    throw error;
  }
}

function getThresholdGuidance(threshold) {
  switch (threshold) {
    case 'any':
      return `
**THRESHOLD: ANY** - Commit all meaningful changes, including minor fixes and formatting.
- Commit: Any change that improves the codebase
- Skip: Only completely meaningless changes (empty commits, etc.)`;
    
    case 'medium':
      return `
**THRESHOLD: MEDIUM** - Commit substantial changes, skip trivial ones.
- Commit: Features, bug fixes, meaningful refactoring, documentation updates
- Skip: Formatting only, comment changes, trivial tweaks`;
    
    case 'major':
      return `
**THRESHOLD: MAJOR** - Only commit significant features and important changes.
- Commit: New features, major bug fixes, breaking changes, architectural improvements
- Skip: Minor fixes, small refactoring, documentation updates, formatting`;
    
    default:
      return `**THRESHOLD: ${threshold.toUpperCase()}** - Apply standard commit practices.`;
  }
}

function checkSignificanceThreshold(significance, threshold) {
  const significanceOrder = ['trivial', 'minor', 'medium', 'major', 'critical'];
  const thresholdOrder = { 'any': 0, 'medium': 2, 'major': 3 };
  
  const significanceLevel = significanceOrder.indexOf(significance);
  const requiredLevel = thresholdOrder[threshold] || 2;
  
  return significanceLevel >= requiredLevel;
}

export async function generateErrorSuggestion(errorText) {
  validateConfig();
  
  if (!errorText || errorText.trim().length === 0) {
    throw new Error('No error text provided for suggestion generation');
  }

  // Sanitize error text to remove sensitive information
  const sanitizedError = sanitizeErrorText(errorText);

  try {
    const aiClient = getAIClient();
    
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an expert Git and command-line troubleshooting assistant. Analyze this error and provide clear, actionable solutions.

**Rules:**
- Provide specific, step-by-step commands to resolve the issue
- Focus on the most common and effective solutions first
- Use standard commands and best practices
- Be concise but thorough
- Include explanations for why the solution works
- If multiple solutions exist, mention the safest option first

**Common error patterns and solutions:**
- Git errors: git status, resolve conflicts, git add, git commit
- Push rejected: git pull --rebase, resolve conflicts, git push
- Detached HEAD: git checkout main/master
- Uncommitted changes: git stash, git stash pop
- Authentication issues: check credentials, SSH keys
- Remote tracking: git push --set-upstream origin branch-name
- Command not found: check spelling, install package, check PATH
- Permission denied: check file permissions, use sudo if needed

**Format your response with:**
1. **What went wrong** (1-2 sentences)
2. **Quick fix** (exact command to run)
3. **Alternative solutions** (if applicable)

**Error to analyze:**
${sanitizedError}`,
      config: {
        maxOutputTokens: 500,
        temperature: 0.1
      }
    });

    const suggestion = response.text?.trim();

    if (!suggestion) {
      throw new Error('Gemini returned an empty suggestion');
    }

    logger.debug('Generated error suggestion');
    return suggestion;
    
  } catch (error) {
    if (error.message.includes('API') || error.message.includes('fetch')) {
      throw new Error(`Failed to generate error suggestion: ${error.message}`);
    }
    throw error;
  }
}

function sanitizeErrorText(errorText) {
  // Remove sensitive information from error text
  let sanitized = errorText;
  
  // Remove file paths that might contain usernames
  sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[username]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[username]');
  sanitized = sanitized.replace(/C:\\Users\\[^\\s]+/g, 'C:\\Users\\[username]');
  
  // Remove potential API keys or tokens
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN]');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
  
  // Remove URLs with credentials
  sanitized = sanitized.replace(/https?:\/\/[^@\s]+@[^\s]+/g, 'https://[credentials]@[url]');
  
  // Keep only the essential error information
  const lines = sanitized.split('\n');
  const relevantLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && 
           !trimmed.startsWith('#') && 
           !trimmed.startsWith('On branch') &&
           !trimmed.startsWith('Your branch');
  });
  
  return relevantLines.join('\n').trim();
} 