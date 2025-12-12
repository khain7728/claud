/**
 * Sync Message Validator
 * Validates broadcast messages to prevent malicious/invalid data
 * Protects against hackers using browser console to inject fake sync events
 */

const SyncValidator = {
    // Security: Maximum message age (reject old messages)
    MAX_MESSAGE_AGE: 10000, // 10 seconds
    
    // Security: Rate limiting (prevent spam attacks)
    rateLimits: new Map(), // action -> {count, resetTime}
    MAX_CALLS_PER_MINUTE: 60,
    
    /**
     * Rate limiter to prevent spam attacks
     */
    checkRateLimit(action) {
        const now = Date.now();
        const limit = this.rateLimits.get(action);
        
        if (!limit || now > limit.resetTime) {
            // Reset counter every minute
            this.rateLimits.set(action, {
                count: 1,
                resetTime: now + 60000
            });
            return true;
        }
        
        if (limit.count >= this.MAX_CALLS_PER_MINUTE) {
            console.error(`[Sync Security] Rate limit exceeded for ${action}`);
            return false;
        }
        
        limit.count++;
        return true;
    },
    
    /**
     * Validate timestamp (reject old or future messages)
     */
    validateTimestamp(timestamp) {
        if (!timestamp || typeof timestamp !== 'number') {
            console.warn('[Sync] Missing or invalid timestamp');
            return false;
        }
        
        const age = Date.now() - timestamp;
        
        // Reject messages from the future (clock manipulation)
        if (age < -1000) {
            console.warn('[Sync] Message from the future rejected:', age);
            return false;
        }
        
        // Reject messages older than MAX_MESSAGE_AGE
        if (age > this.MAX_MESSAGE_AGE) {
            console.warn('[Sync] Stale message rejected (age:', age, 'ms)');
            return false;
        }
        
        return true;
    },
    
    /**
     * Sanitize string input (prevent XSS)
     */
    sanitizeString(str, maxLength = 255) {
        if (typeof str !== 'string') return null;
        
        // Remove HTML tags and trim
        const sanitized = str.replace(/<[^>]*>/g, '').trim();
        
        // Limit length
        return sanitized.substring(0, maxLength);
    },
    
    /**
     * Validate WORD_LEARNED/WORD_UNLEARNED payload
     */
    validateWordAction(payload) {
        if (!payload || typeof payload !== 'object') {
            console.warn('[Sync] Invalid payload type');
            return false;
        }
        
        // Check rate limit
        if (!this.checkRateLimit('WORD_ACTION')) {
            return false;
        }
        
        // Validate wordId
        if (typeof payload.wordId !== 'number' || payload.wordId <= 0 || payload.wordId > 999999) {
            console.warn('[Sync] Invalid wordId:', payload.wordId);
            return false;
        }
        
        // Validate courseId
        if (typeof payload.courseId !== 'number' || payload.courseId <= 0 || payload.courseId > 999999) {
            console.warn('[Sync] Invalid courseId:', payload.courseId);
            return false;
        }
        
        // Validate timestamp
        if (!this.validateTimestamp(payload.timestamp)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate COURSE_CREATED/UPDATED/DELETED/JOINED payload
     */
    validateCourseAction(payload) {
        if (!payload || typeof payload !== 'object') {
            console.warn('[Sync] Invalid payload type');
            return false;
        }
        
        // Check rate limit
        if (!this.checkRateLimit('COURSE_ACTION')) {
            return false;
        }
        
        // Validate courseId
        if (typeof payload.courseId !== 'number' || payload.courseId <= 0 || payload.courseId > 999999) {
            console.warn('[Sync] Invalid courseId:', payload.courseId);
            return false;
        }
        
        // Validate courseName (if provided)
        if (payload.courseName !== undefined) {
            const sanitized = this.sanitizeString(payload.courseName, 100);
            if (!sanitized || sanitized.length < 1) {
                console.warn('[Sync] Invalid course name');
                return false;
            }
        }
        
        // Validate timestamp
        if (!this.validateTimestamp(payload.timestamp)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate PROFILE_UPDATED payload
     */
    validateProfileAction(payload) {
        if (!payload || typeof payload !== 'object') {
            console.warn('[Sync] Invalid payload type');
            return false;
        }
        
        // Check rate limit (stricter for profile updates)
        const limit = this.rateLimits.get('PROFILE_ACTION');
        if (limit && limit.count > 10) {
            console.error('[Sync Security] Too many profile updates');
            return false;
        }
        
        if (!this.checkRateLimit('PROFILE_ACTION')) {
            return false;
        }
        
        // Validate name
        if (payload.name !== undefined) {
            const sanitized = this.sanitizeString(payload.name, 100);
            if (!sanitized || sanitized.length < 2) {
                console.warn('[Sync] Invalid name:', payload.name);
                return false;
            }
            
            // Check for suspicious patterns (SQL injection attempts)
            if (/['";\\]/.test(payload.name)) {
                console.error('[Sync Security] Suspicious characters in name');
                return false;
            }
        }
        
        // Validate avatar path
        if (payload.avatar !== undefined) {
            const sanitized = this.sanitizeString(payload.avatar, 255);
            if (!sanitized) {
                console.warn('[Sync] Invalid avatar path');
                return false;
            }
            
            // Check for path traversal attempts
            if (sanitized.includes('..') || sanitized.includes('\\')) {
                console.error('[Sync Security] Path traversal attempt blocked');
                return false;
            }
            
            // Only allow image extensions
            const ext = sanitized.split('.').pop().toLowerCase();
            if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                console.warn('[Sync] Invalid avatar file extension:', ext);
                return false;
            }
        }
        
        // Validate timestamp
        if (!this.validateTimestamp(payload.timestamp)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate AVATAR_UPDATED payload
     */
    validateAvatarAction(payload) {
        if (!payload || typeof payload !== 'object') {
            console.warn('[Sync] Invalid payload type');
            return false;
        }
        
        // Check rate limit
        if (!this.checkRateLimit('AVATAR_ACTION')) {
            return false;
        }
        
        // Validate avatar path
        if (!payload.avatar || typeof payload.avatar !== 'string') {
            console.warn('[Sync] Missing avatar path');
            return false;
        }
        
        const sanitized = this.sanitizeString(payload.avatar, 255);
        
        // Check for path traversal
        if (sanitized.includes('..') || sanitized.includes('\\')) {
            console.error('[Sync Security] Path traversal blocked');
            return false;
        }
        
        // Validate timestamp
        if (!this.validateTimestamp(payload.timestamp)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate QUIZ_COMPLETED/REVIEW_COMPLETED payload
     */
    validateQuizAction(payload) {
        if (!payload || typeof payload !== 'object') {
            console.warn('[Sync] Invalid payload type');
            return false;
        }
        
        // Check rate limit
        if (!this.checkRateLimit('QUIZ_ACTION')) {
            return false;
        }
        
        // Validate score (if provided)
        if (payload.score !== undefined) {
            if (typeof payload.score !== 'number' || payload.score < 0 || payload.score > 100) {
                console.warn('[Sync] Invalid score:', payload.score);
                return false;
            }
        }
        
        // Validate courseId
        if (payload.courseId !== undefined) {
            if (typeof payload.courseId !== 'number' || payload.courseId <= 0 || payload.courseId > 999999) {
                console.warn('[Sync] Invalid courseId:', payload.courseId);
                return false;
            }
        }
        
        // Validate review type
        if (payload.type !== undefined) {
            const validTypes = ['flashcard', 'multiple-choice', 'fill-blank'];
            if (!validTypes.includes(payload.type)) {
                console.warn('[Sync] Invalid review type:', payload.type);
                return false;
            }
        }
        
        // Validate timestamp
        if (!this.validateTimestamp(payload.timestamp)) {
            return false;
        }
        
        return true;
    },
    
    /**
     * Validate USER_LOCKED/USER_UNLOCKED payload (CRITICAL - Admin actions)
     */
    validateAdminAction(payload) {
        if (!payload || typeof payload !== 'object') {
            console.warn('[Sync] Invalid payload type');
            return false;
        }
        
        // Strict rate limit for admin actions
        const limit = this.rateLimits.get('ADMIN_ACTION');
        if (limit && limit.count > 5) {
            console.error('[Sync Security] Too many admin actions - POSSIBLE ATTACK');
            return false;
        }
        
        if (!this.checkRateLimit('ADMIN_ACTION')) {
            return false;
        }
        
        // Validate userId
        if (typeof payload.userId !== 'number' || payload.userId <= 0 || payload.userId > 999999) {
            console.warn('[Sync] Invalid userId:', payload.userId);
            return false;
        }
        
        // Admin actions MUST have timestamp
        if (!payload.timestamp) {
            console.error('[Sync Security] Admin action missing timestamp - BLOCKED');
            return false;
        }
        
        // Stricter timestamp validation (5 seconds max)
        const age = Date.now() - payload.timestamp;
        if (age > 5000 || age < -1000) {
            console.error('[Sync Security] Admin action timestamp invalid - BLOCKED');
            return false;
        }
        
        return true;
    },
    
    /**
     * Master validation function - routes to specific validators
     */
    validate(action, payload) {
        // Security: Block if payload is too large (DOS attack prevention)
        const payloadSize = JSON.stringify(payload).length;
        if (payloadSize > 10000) { // 10KB max
            console.error('[Sync Security] Payload too large:', payloadSize, 'bytes - BLOCKED');
            return false;
        }
        
        // Route to specific validator based on action
        switch(action) {
            case window.SYNC_ACTIONS?.WORD_LEARNED:
            case window.SYNC_ACTIONS?.WORD_UNLEARNED:
                return this.validateWordAction(payload);
                
            case window.SYNC_ACTIONS?.COURSE_CREATED:
            case window.SYNC_ACTIONS?.COURSE_UPDATED:
            case window.SYNC_ACTIONS?.COURSE_DELETED:
            case window.SYNC_ACTIONS?.COURSE_JOINED:
                return this.validateCourseAction(payload);
                
            case window.SYNC_ACTIONS?.PROFILE_UPDATED:
                return this.validateProfileAction(payload);
                
            case window.SYNC_ACTIONS?.AVATAR_UPDATED:
                return this.validateAvatarAction(payload);
                
            case window.SYNC_ACTIONS?.QUIZ_COMPLETED:
            case window.SYNC_ACTIONS?.REVIEW_COMPLETED:
                return this.validateQuizAction(payload);
                
            case window.SYNC_ACTIONS?.USER_LOCKED:
            case window.SYNC_ACTIONS?.USER_UNLOCKED:
                return this.validateAdminAction(payload);
                
            default:
                console.warn('[Sync] Unknown action type:', action);
                return false;
        }
    },
    
    /**
     * Security report (for debugging)
     */
    getSecurityReport() {
        // console.log('=== Sync Security Report ===');
        // console.log('Rate Limits:', Array.from(this.rateLimits.entries()));
        // console.log('Max Message Age:', this.MAX_MESSAGE_AGE + 'ms');
        // console.log('Max Calls/Min:', this.MAX_CALLS_PER_MINUTE);
    }
};

// Export to global scope
if (typeof window !== 'undefined') {
    window.SyncValidator = SyncValidator;
    
    if (window.location.hostname === 'localhost') {
        // console.log('✅ SyncValidator loaded');
    }
}
