/**
 * SyncService.js - General Purpose Offline Sync Engine
 * Handles background persistence with retries, idempotency, and local-first reliability.
 */

import * as firestoreService from './firestoreService';
import { logger } from '../utils/logger';

const QUEUE_STORAGE_KEY = 'ironlogic_sync_queue';
const RETRY_CONFIG = {
    maxAttempts: 5,
    baseDelay: 1000 // 1s
};

class SyncService {
    constructor() {
        this.queue = this.loadQueue();
        this.isProcessing = false;
        
        // Listen for online status to trigger processing
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
        }
    }

    loadQueue() {
        try {
            const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
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
     * Enqueue a new task.
     * @param {string} type - 'finalize_session' | 'add_set'
     * @param {object} payload - Task data
     * @param {string} taskId - Optional unique ID for idempotency
     */
    enqueue(type, payload, taskId = null) {
        const id = taskId || `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Prevent duplicates
        if (this.queue.some(t => t.id === id)) {
            logger.info('Task already in queue, skipping enqueue', { id });
            return id;
        }

        const task = {
            id,
            type,
            payload,
            attempts: 0,
            enqueuedAt: new Date().toISOString(),
            lastAttemptAt: null,
            error: null
        };

        this.queue.push(task);
        this.saveQueue();
        
        logger.info('Task enqueued', { id, type });
        
        // Try processing immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }

        return id;
    }

    // Specific helper for Session Finalization
    enqueueSessionFinalization(userId, dateStr, metadata) {
        const taskId = `finalize_${userId}_${dateStr}`;
        return this.enqueue('finalize_session', { userId, dateStr, metadata }, taskId);
    }

    // Specific helper for Adding Sets
    enqueueWorkoutSets(userId, sets) {
        // Enqueue each set as an individual task to ensure each one persists
        sets.forEach((set, index) => {
            const taskId = `set_${userId}_${set.date}_${set.exerciseId}_${Date.now()}_${index}`;
            this.enqueue('add_set', { userId, set }, taskId);
        });
    }

    async processQueue() {
        if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) return;

        this.isProcessing = true;
        logger.info('Starting sync queue processing', { count: this.queue.length });

        const tasksToProcess = [...this.queue];
        
        for (const task of tasksToProcess) {
            try {
                await this.executeTask(task);
                // Success! Remove from queue
                this.queue = this.queue.filter(t => t.id !== task.id);
                this.saveQueue();
                logger.info('Task sync successful', { id: task.id });
            } catch (error) {
                task.attempts++;
                task.lastAttemptAt = new Date().toISOString();
                task.error = error.message;
                
                logger.warn('Task sync failed, scheduled for retry', { 
                    id: task.id, 
                    attempt: task.attempts, 
                    error: error.message 
                });

                if (task.attempts >= RETRY_CONFIG.maxAttempts) {
                    logger.error('Task reached max retries, dropping from queue', { id: task.id });
                    this.queue = this.queue.filter(t => t.id !== task.id);
                    this.saveQueue();
                } else {
                    // Stop processing for now, wait for next attempt (exponential backoff handled by outer retry logic if added)
                    // For now we just wait for the next periodic check or online event
                    break; 
                }
            }
        }

        this.isProcessing = false;
        this.saveQueue();
    }

    async executeTask(task) {
        const { type, payload } = task;
        
        // Defensive: Remove any undefined values that would cause Firestore to throw
        const sanitizedPayload = this.sanitize(payload);

        switch (type) {
            case 'finalize_session':
                return await firestoreService.finalizeWorkoutSession(sanitizedPayload.userId, sanitizedPayload.dateStr, sanitizedPayload.metadata);
            
            case 'add_set':
                return await firestoreService.addWorkout(sanitizedPayload.userId, sanitizedPayload.set);
                
            default:
                throw new Error(`Unknown task type: ${type}`);
        }
    }

    sanitize(obj) {
        if (Array.isArray(obj)) {
            return obj.map(v => this.sanitize(v));
        } else if (obj !== null && typeof obj === 'object') {
            return Object.fromEntries(
                Object.entries(obj)
                    .filter(([_, v]) => v !== undefined)
                    .map(([k, v]) => [k, this.sanitize(v)])
            );
        }
        return obj;
    }

    getPendingCount() {
        return this.queue.length;
    }
}

export const syncService = new SyncService();
