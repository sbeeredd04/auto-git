import { getCommitConfig } from './config.js';
import logger from '../utils/logger.js';

class RateLimiter {
  constructor() {
    this.callHistory = [];
  }

  canMakeCall() {
    const config = getCommitConfig();
    const now = Date.now();
    const oneMinuteAgo = now - 60000; // 60 seconds ago

    // Remove calls older than 1 minute
    this.callHistory = this.callHistory.filter(timestamp => timestamp > oneMinuteAgo);

    // Check if we're under the limit
    const canCall = this.callHistory.length < config.rateLimiting.maxCallsPerMinute;
    
    if (!canCall) {
      logger.warning(`Rate limit reached: ${this.callHistory.length}/${config.rateLimiting.maxCallsPerMinute} calls in the last minute`);
    }

    return canCall;
  }

  recordCall() {
    this.callHistory.push(Date.now());
  }

  getCallsInLastMinute() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    this.callHistory = this.callHistory.filter(timestamp => timestamp > oneMinuteAgo);
    return this.callHistory.length;
  }

  getTimeUntilNextCall() {
    if (this.callHistory.length === 0) return 0;
    
    const config = getCommitConfig();
    if (this.callHistory.length < config.rateLimiting.maxCallsPerMinute) return 0;

    const oldestCall = Math.min(...this.callHistory);
    const timeUntilReset = (oldestCall + 60000) - Date.now();
    return Math.max(0, timeUntilReset);
  }
}

// Export a singleton instance
export const rateLimiter = new RateLimiter(); 