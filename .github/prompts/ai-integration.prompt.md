# AI Integration Prompt

## Context

This repository extensively uses Google Gemini AI for intelligent Git automation. The AI integration powers:

1. **Commit Message Generation** - Creating meaningful conventional commit messages
2. **Commit Decision Making** - Analyzing whether changes warrant a commit
3. **Error Analysis** - Providing solutions for Git and command errors
4. **Interactive Assistance** - Helping users with Git operations

The AI integration must be reliable, efficient, and user-friendly while respecting rate limits and API quotas.

## Objective

Implement, maintain, and enhance AI integration features that provide intelligent Git automation while ensuring robust error handling, efficient API usage, and excellent user experience.

## Architecture Overview

### AI Integration Components

**Auto-Git CLI:**
```
lib/gemini.js           # Core AI integration
lib/rateLimiter.js      # API rate limiting
lib/config.js           # API key management
```

**GitCue Extension:**
```
src/utils/ai.ts         # AI utility functions
src/services/commitService.ts  # AI-powered commits
src/terminal/interactivePty.ts # AI terminal integration
```

### AI Capabilities

1. **Commit Message Generation**: Analyzes diffs and generates conventional commits
2. **Commit Decision Making**: Determines if changes warrant committing
3. **Error Suggestion**: Provides solutions for command failures
4. **Interactive Chat**: Answers Git and development questions

## Requirements

### Google Gemini Integration

**Model Configuration:**
- Primary Model: `gemini-2.0-flash`
- Fallback Model: `gemini-1.5-pro` (if needed)
- Temperature: 0.1 for commit messages (deterministic)
- Temperature: 0.7 for interactive chat (creative)
- Max Tokens: 500 for commit messages, 2000 for analysis

**API Client Setup:**
```javascript
import { GoogleGenAI } from '@google/genai';

let ai = null;

function getAIClient() {
  if (!ai) {
    const { apiKey } = validateConfig();
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}
```

### Function Calling Implementation

**Commit Decision Function Declaration:**
```javascript
const shouldCommitFunctionDeclaration = {
  name: 'should_commit_changes',
  description: 'Analyzes code changes and determines if they warrant a commit',
  parameters: {
    type: Type.OBJECT,
    properties: {
      shouldCommit: {
        type: Type.BOOLEAN,
        description: 'Whether changes meet threshold and completeness requirements'
      },
      reason: {
        type: Type.STRING,
        description: 'Detailed explanation for the commit decision'
      },
      commitMessage: {
        type: Type.STRING,
        description: 'Suggested commit message if shouldCommit is true'
      },
      significance: {
        type: Type.STRING,
        enum: ['trivial', 'minor', 'medium', 'major', 'critical'],
        description: 'Significance level of the changes'
      },
      completeness: {
        type: Type.STRING,
        enum: ['incomplete', 'partial', 'complete'],
        description: 'Whether changes represent complete implementation'
      },
      changeType: {
        type: Type.STRING,
        enum: ['feature', 'bugfix', 'refactor', 'docs', 'style', 'test', 'chore'],
        description: 'Primary type of change'
      },
      riskLevel: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high'],
        description: 'Risk level of the changes'
      }
    },
    required: ['shouldCommit', 'reason', 'significance', 'completeness']
  }
};
```

### Rate Limiting Strategy

**Implementation Requirements:**
- Maximum 15 API calls per minute (configurable)
- Sliding window rate limiting
- Graceful degradation when limits exceeded
- Clear user feedback on rate limit status
- Automatic cleanup of old timestamps

**Rate Limiter Class:**
```javascript
class RateLimiter {
  constructor(maxCallsPerMinute = 15) {
    this.maxCalls = maxCallsPerMinute;
    this.calls = [];
    this.windowSize = 60000; // 1 minute
  }
  
  canMakeCall() {
    this.cleanupOldCalls();
    return this.calls.length < this.maxCalls;
  }
  
  recordCall() {
    this.calls.push(Date.now());
  }
  
  getTimeUntilNextCall() {
    if (this.calls.length === 0) return 0;
    const oldestCall = this.calls[0];
    const timeElapsed = Date.now() - oldestCall;
    return Math.max(0, this.windowSize - timeElapsed);
  }
}
```

### Diff Hash Optimization

**Purpose**: Prevent redundant API calls for unchanged content

**Implementation:**
```javascript
let lastDiffHash = null;

function createDiffHash(diffText) {
  if (!diffText) return null;
  
  let hash = 0;
  for (let i = 0; i < diffText.length; i++) {
    const char = diffText.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

// Before making API call
const currentHash = createDiffHash(diff);
if (currentHash === lastDiffHash) {
  logger.debug('Diff unchanged, skipping API call');
  return;
}
lastDiffHash = currentHash;
```

## Guidelines

### API Call Best Practices

1. **Always Validate First:**
```javascript
validateConfig(); // Check API key exists
if (!rateLimiter.canMakeCall()) {
  throw new Error('Rate limit exceeded');
}
```

2. **Use Appropriate Models:**
- `gemini-2.0-flash` for production (fast, efficient)
- `gemini-1.5-pro` for complex analysis (if needed)

3. **Set Proper Timeouts:**
```javascript
const response = await aiClient.models.generateContent({
  model: 'gemini-2.0-flash',
  contents: [/* content */],
  config: {
    timeout: 30000 // 30 seconds
  }
});
```

4. **Handle Errors Gracefully:**
```javascript
try {
  const response = await makeAICall();
  rateLimiter.recordCall();
  return response;
} catch (error) {
  if (error.status === 429) {
    // Rate limit from API
    const waitTime = rateLimiter.getTimeUntilNextCall();
    throw new Error(`Rate limited. Wait ${waitTime}ms`);
  } else if (error.status === 401) {
    throw new Error('Invalid API key');
  } else {
    throw new Error('AI service temporarily unavailable');
  }
}
```

### Prompt Engineering

**Commit Message Prompts:**
```javascript
const prompt = `Generate a conventional commit message for these changes.

Rules:
- Use conventional commit format: type(scope): description
- Types: feat, fix, docs, style, refactor, test, chore
- Keep subject under 50 characters
- Use imperative mood
- No emojis
- Be specific and concise

Changes:
${diffText}`;
```

**Commit Decision Prompts:**
```javascript
const prompt = `Analyze these code changes and determine if they warrant a commit.

Threshold: ${threshold.toUpperCase()}
Completeness Required: ${requireCompleteness}

Analysis Framework:
1. Significance Assessment (trivial → minor → medium → major → critical)
2. Completeness Assessment (incomplete → partial → complete)
3. Change Type Classification
4. Risk Assessment

Changes:
${diffText}`;
```

**Error Analysis Prompts:**
```javascript
const prompt = `Analyze this error and provide actionable solutions.

Rules:
- Provide specific commands to resolve the issue
- Focus on most common solutions first
- Be concise (under 200 words)
- Use standard best practices
- Include explanations

Error:
${sanitizedError}`;
```

### Data Sanitization

**Remove Sensitive Information:**
```javascript
function sanitizeErrorText(errorText) {
  let sanitized = errorText;
  
  // Remove usernames from paths
  sanitized = sanitized.replace(/\/Users\/[^\/\s]+/g, '/Users/[username]');
  sanitized = sanitized.replace(/\/home\/[^\/\s]+/g, '/home/[username]');
  
  // Remove potential API keys or tokens
  sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, '[TOKEN]');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[\w.+-]+@[\w.-]+\.\w+/g, '[email]');
  
  // Remove URLs with credentials
  sanitized = sanitized.replace(/https?:\/\/[^@\s]+@[^\s]+/g, '[URL]');
  
  return sanitized;
}
```

### Response Processing

**Extract Structured Data:**
```javascript
// For function calling
if (response.functionCalls && response.functionCalls.length > 0) {
  const functionCall = response.functionCalls[0];
  if (functionCall.name === 'should_commit_changes') {
    return functionCall.args;
  }
}

// For text responses
const text = response.text?.trim();
if (!text) {
  throw new Error('AI returned empty response');
}

// Clean up response
const cleaned = text
  .split('\n')[0] // First line for commit messages
  .replace(/^["']|["']$/g, '') // Remove quotes
  .trim();
```

### Error Recovery

**Retry Strategy:**
```javascript
async function makeAICallWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await makeAICall();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
      logger.debug(`Retry ${attempt}/${maxRetries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}
```

**Fallback Behavior:**
```javascript
async function generateCommitMessage(diff) {
  try {
    return await generateWithAI(diff);
  } catch (error) {
    logger.error('AI generation failed: ' + error.message);
    // Fallback to simple message
    return 'chore: automated commit via GitCue';
  }
}
```

## Output Format

### AI Response Structure

**Commit Message Response:**
```javascript
{
  message: "feat(scope): concise description",
  confidence: 0.95,
  apiCallDuration: 234, // milliseconds
  tokensUsed: 150
}
```

**Commit Decision Response:**
```javascript
{
  shouldCommit: true,
  reason: "Complete feature implementation with tests",
  significance: "medium",
  completeness: "complete",
  changeType: "feature",
  riskLevel: "low",
  commitMessage: "feat(auth): add user authentication"
}
```

**Error Suggestion Response:**
```javascript
{
  summary: "Push rejected due to non-fast-forward",
  solution: "git pull --rebase origin main && git push",
  explanation: "Your local branch is behind the remote",
  alternatives: ["git pull && git push", "git push --force-with-lease"]
}
```

## Best Practices

### API Usage Optimization

1. **Cache Results**: Cache AI responses for identical inputs
2. **Batch Requests**: Combine multiple small requests when possible
3. **Use Streaming**: For long responses, use streaming API
4. **Monitor Usage**: Track API calls and costs
5. **Set Quotas**: Implement user-level quotas if needed

### Quality Assurance

1. **Validate Responses**: Check AI output meets requirements
2. **Handle Edge Cases**: Test with various input types
3. **Monitor Accuracy**: Track commit message quality
4. **User Feedback**: Allow users to correct AI suggestions
5. **Continuous Improvement**: Update prompts based on outcomes

### Security Considerations

1. **API Key Protection**: Never log or expose API keys
2. **Input Validation**: Sanitize all inputs to AI
3. **Output Validation**: Verify AI outputs are safe
4. **Rate Limiting**: Prevent abuse through rate limits
5. **Error Handling**: Don't expose system details in errors

## Testing

### AI Integration Testing

**Mock AI Responses:**
```javascript
class MockAIClient {
  async generateContent({ contents }) {
    // Return predictable responses for testing
    return {
      text: 'feat(test): mock commit message',
      functionCalls: [{
        name: 'should_commit_changes',
        args: {
          shouldCommit: true,
          reason: 'Test reason',
          significance: 'medium'
        }
      }]
    };
  }
}
```

**Test Scenarios:**
- API key validation
- Rate limit enforcement
- Error handling (401, 429, 500 errors)
- Response parsing
- Fallback behavior
- Diff hash optimization
- Function calling extraction

## Validation

### AI Integration Checklist

- [ ] API key is validated before calls
- [ ] Rate limiting is enforced
- [ ] Diff hash optimization is working
- [ ] Function calling is properly structured
- [ ] Responses are validated
- [ ] Errors are handled gracefully
- [ ] Sensitive data is sanitized
- [ ] Fallback behavior is implemented
- [ ] API usage is logged
- [ ] User feedback is clear

## Notes

- Google Gemini API has generous free tier (15 RPM)
- Function calling provides structured, consistent responses
- Diff hash optimization reduces API usage by ~80%
- Always provide fallback behavior for AI failures
- Monitor API usage to stay within quotas
- Consider caching for frequently accessed data
- Update prompts based on real-world performance
- Balance API usage with user experience
