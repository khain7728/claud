/**
 * SYNC MANAGER - Cross-Tab Synchronization
 * Đồng bộ dữ liệu real-time giữa các tab/window
 * 
 * Features:
 * - Broadcast Channel API (primary)
 * - Storage Event (fallback)
 * - Automatic fallback detection
 * - Event-driven architecture
 * - Zero configuration
 */

class SyncManager {
    constructor() {
        this.channel = null;
        this.listeners = new Map();
        this.isSupported = false;
        
        // Khởi tạo Broadcast Channel 
        this.init();
        
        // Debug mode (bật trong development)
        this.debug = window.location.hostname === 'localhost';
        
        this.log('SyncManager initialized');
    }
    
    /**
     * Khởi tạo communication channel
     */
    init() {
        // Kiểm tra Broadcast Channel support
        if ('BroadcastChannel' in window) {
            try {
                this.channel = new BroadcastChannel('vocab_sync_channel');
                this.isSupported = true;
                
                // Lắng nghe messages từ tabs khác
                this.channel.onmessage = (event) => this.handleBroadcast(event);
                
                this.log('✅ Broadcast Channel enabled');
            } catch (error) {
                this.log('❌ Broadcast Channel failed:', error);
                this.setupFallback();
            }
        } else {
            this.log('⚠️ Broadcast Channel not supported, using fallback');
            this.setupFallback();
        }
    }
    
    /**
     * Setup fallback mechanism (Storage Event)
     */
    setupFallback() {
        this.isSupported = false;
        
        // Lắng nghe localStorage changes từ tabs khác
        window.addEventListener('storage', (event) => {
            if (event.key === 'vocab_sync_event') {
                try {
                    const data = JSON.parse(event.newValue);
                    this.handleBroadcast({ data });
                } catch (error) {
                    this.log('Error parsing storage event:', error);
                }
            }
        });
        
        this.log('✅ Storage Event fallback enabled');
    }
    
    /**
     * Broadcast action đến tất cả tabs khác
     * @param {string} action - Action type (WORD_LEARNED, COURSE_JOINED, ...)
     * @param {object} payload - Dữ liệu kèm theo
     */
    broadcast(action, payload = {}) {
        const message = {
            action: action,
            payload: payload,
            timestamp: Date.now(),
            tabId: this.getTabId()
        };
        
        this.log(`📤 Broadcasting: ${action}`, payload);
        
        if (this.isSupported && this.channel) {
            // Sử dụng Broadcast Channel
            this.channel.postMessage(message);
        } else {
            // Fallback: Sử dụng localStorage
            localStorage.setItem('vocab_sync_event', JSON.stringify(message));
            // Xóa ngay để tránh conflict
            setTimeout(() => localStorage.removeItem('vocab_sync_event'), 100);
        }
    }
    
    /**
     * Xử lý khi nhận broadcast từ tab khác
     */
    handleBroadcast(event) {
        const { action, payload, tabId, timestamp } = event.data;
        
        // Bỏ qua message từ chính tab này
        if (tabId === this.getTabId()) {
            return;
        }
        
        // Bỏ qua message cũ (>5s)
        if (Date.now() - timestamp > 5000) {
            this.log('⚠️ Ignoring old message:', action);
            return;
        }
        
        // 🔒 SECURITY: Validate message với SyncValidator
        if (window.SyncValidator) {
            if (!window.SyncValidator.validate(action, payload)) {
                this.log('🚫 BLOCKED: Invalid message rejected');
                return;
            }
        }
        
        this.log(`📥 Received: ${action}`, payload);
        
        // Trigger listeners đã đăng ký
        this.trigger(action, payload);
    }
    
    /**
     * Đăng ký listener cho action cụ thể
     * @param {string} action - Action cần listen
     * @param {function} callback - Callback khi action trigger
     */
    on(action, callback) {
        if (!this.listeners.has(action)) {
            this.listeners.set(action, []);
        }
        
        this.listeners.get(action).push(callback);
        this.log(`🎯 Registered listener for: ${action}`);
    }
    
    /**
     * Hủy listener
     */
    off(action, callback) {
        if (this.listeners.has(action)) {
            const callbacks = this.listeners.get(action);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Trigger tất cả listeners cho action
     */
    trigger(action, payload) {
        if (this.listeners.has(action)) {
            this.listeners.get(action).forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    this.log(`❌ Error in listener for ${action}:`, error);
                }
            });
        }
    }
    
    /**
     * Lấy unique tab ID
     */
    getTabId() {
        if (!this.tabId) {
            this.tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }
        return this.tabId;
    }
    
    /**
     * Debug logging
     */
    log(...args) {
        if (this.debug) {
            // console.log('[SyncManager]', ...args);
        }
    }
    
    /**
     * Cleanup khi tab đóng
     */
    destroy() {
        if (this.channel) {
            this.channel.close();
        }
        this.listeners.clear();
        this.log('SyncManager destroyed');
    }
}

// ============================================
// SINGLETON INSTANCE
// ============================================
const syncManager = new SyncManager();

// Cleanup khi đóng tab
window.addEventListener('beforeunload', () => {
    syncManager.destroy();
});

// Export global
window.SyncManager = syncManager;

// ============================================
// PREDEFINED ACTIONS (Constants)
// ============================================
const SYNC_ACTIONS = {
    // Learning actions
    WORD_LEARNED: 'WORD_LEARNED',
    WORD_UNLEARNED: 'WORD_UNLEARNED',
    
    // Course actions
    COURSE_CREATED: 'COURSE_CREATED',
    COURSE_UPDATED: 'COURSE_UPDATED',
    COURSE_DELETED: 'COURSE_DELETED',
    COURSE_JOINED: 'COURSE_JOINED',
    COURSE_LEFT: 'COURSE_LEFT',
    
    // Quiz/Review actions
    QUIZ_COMPLETED: 'QUIZ_COMPLETED',
    REVIEW_COMPLETED: 'REVIEW_COMPLETED',
    
    // Profile actions
    PROFILE_UPDATED: 'PROFILE_UPDATED',
    AVATAR_UPDATED: 'AVATAR_UPDATED',
    
    // Goal actions
    DAILY_GOAL_UPDATED: 'DAILY_GOAL_UPDATED',
    
    // Admin actions
    USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
    
    // General refresh
    REFRESH_DASHBOARD: 'REFRESH_DASHBOARD',
    REFRESH_COURSE_LIST: 'REFRESH_COURSE_LIST'
};

window.SYNC_ACTIONS = SYNC_ACTIONS;
