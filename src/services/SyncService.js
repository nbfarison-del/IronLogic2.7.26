import * as firestoreService from './firestoreService';
import { logger } from '../utils/logger';

const QUEUE_STORAGE_KEY = 'ironlogic_sync_queue';
const RETRY_CONFIG = {
    maxAttempts: 5,
    baseDelay: 1000, // 1 second
};

class SyncService {
    constructor() {
        this.queue = this.loadQueue();
        this.isProcessing = false;
        this.retryCounts = {};

        // Listen for online status
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                logger.info('Device online, processing sync queue');
                this.processQueue();
            });
        }
    }

    loadQueue() {
        try {
            const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            logger.error('Failed to load sync queue', { error: e.message });
            return [];
        }
    }

    saveQueue() {
        try {
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            logger.error('Failed to save sync queue', { error: e.message });
        }
    }

    /**
     * Enqueue a session finalization task.
     * @param {string} userId 
     * @param {string} dateStr 
     * @param {object} metadata 
     */
    enqueueSessionFinalization(userId, dateStr, metadata) {
        const taskId = `finalize_${userId}_${dateStr}`;
        
        // Prevent duplicate tasks for the same session (Idempotency)
        if (this.queue.some(task => task.id === taskId)) {
            logger.warn('Task already in queue, skipping enqueue', { taskId });
            return;
        }

        const task = {
            id: taskId,
            type: 'FINALIZE_SESSION',
            payload: { userId, dateStr, metadata },
            attempts: 0,
            enqueuedAt: new Date().toISOString()
        };

        this.queue.push(task);
        this.saveQueue();
        logger.info('Task enqueued', { taskId });

        // Trigger processing immediately
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
            return;
        }

        this.isProcessing = true;
        logger.info('Processing sync queue', { size: this.queue.length });

        const remainingTasks = [];

        for (const task of this.queue) {
            try {
                await this.executeTask(task);
                logger.info('Task completed successfully', { taskId: task.id });
            } catch (error) {
                task.attempts += 1;
                logger.error('Task failed', { taskId: task.id, attempts: task.attempts, error: error.message });

                if (task.attempts < RETRY_CONFIG.maxAttempts) {
                    remainingTasks.push(task);
                    this.scheduleRetry(task);
                } else {
                    logger.error('Task abandoned after max attempts', { taskId: task.id });
                    // Here we could notify the user or move to a "dead letter" queue
                }
            }
        }

        this.queue = remainingTasks;
        this.saveQueue();
        this.isProcessing = false;
        
        // If we still have tasks, they are scheduled for retry
    }

    async executeTask(task) {
        if (task.type === 'FINALIZE_SESSION') {
            const { userId, dateStr, metadata } = task.payload;
            await firestoreService.finalizeWorkoutSession(userId, dateStr, metadata);
        }
    }

    scheduleRetry(task) {
        const delay = RETRY_CONFIG.baseDelay * Math.pow(2, task.attempts - 1);
        logger.info('Scheduling retry', { taskId: task.id, delay });
        
        setTimeout(() => {
            this.processQueue();
        }, delay);
    }

    getQueueStatus() {
        return {
            pendingCount: this.queue.length,
            isProcessing: this.isProcessing,
            isOnline: navigator.onLine
        };
    }
}

// Singleton instance
export const syncService = new SyncService();
