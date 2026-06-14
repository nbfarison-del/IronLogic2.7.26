/**
 * Automated Tests for Workout Session Finalization Pipeline
 * Focus: Idempotency, Fault Tolerance, and Data Integrity.
 */

import { jest } from '@jest/globals';

// Mock localStorage and navigator globals before importing modules
let store = {};
global.localStorage = {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = String(value); }),
    clear: jest.fn(() => { store = {}; }),
    removeItem: jest.fn(key => { delete store[key]; })
};
global.navigator = {
    onLine: true
};

// Mock firestoreService using Jest ESM mock API
jest.unstable_mockModule('../services/firestoreService', () => ({
    finalizeWorkoutSession: jest.fn(),
    addWorkout: jest.fn()
}));

// Mock logger to avoid console noise during tests
jest.unstable_mockModule('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

// Dynamically import modules after registering mock modules
const { syncService } = await import('../services/SyncService');
const firestoreService = await import('../services/firestoreService');
const { logger } = await import('../utils/logger');

describe('Workout Session Finalization Pipeline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        syncService.queue = [];
    });

    test('Requirement 1: Idempotency (Double Tap Finalize)', async () => {
        const userId = 'user123';
        const dateStr = '2026-05-16';
        const metadata = { rpe: 8 };

        // Simulate two rapid enqueues
        syncService.enqueueSessionFinalization(userId, dateStr, metadata);
        syncService.enqueueSessionFinalization(userId, dateStr, metadata);

        // Verify only one task is in the queue
        expect(syncService.queue.length).toBe(1);
        expect(syncService.queue[0].id).toBe(`finalize_${userId}_${dateStr}`);
    });

    test('Requirement 2: Fault Tolerance (Slow Network / API Timeout)', async () => {
        const userId = 'user123';
        const dateStr = '2026-05-16';
        
        // Mock failure for the first attempt
        firestoreService.finalizeWorkoutSession
            .mockRejectedValueOnce(new Error('Network Timeout'))
            .mockResolvedValueOnce({ success: true });

        // Force offline initially to prevent immediate processing
        const originalOnline = navigator.onLine;
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

        syncService.enqueueSessionFinalization(userId, dateStr, { rpe: 7 });
        
        expect(syncService.queue.length).toBe(1);
        expect(syncService.queue[0].attempts).toBe(0);

        // Bring online and process
        Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        await syncService.processQueue();

        // Should have failed once and still be in queue for retry
        expect(syncService.queue.length).toBe(1);
        expect(syncService.queue[0].attempts).toBe(1);

        // Trigger manual retry (simulating timer)
        await syncService.processQueue();

        // Should be successful now
        expect(syncService.queue.length).toBe(0);
        expect(firestoreService.finalizeWorkoutSession).toHaveBeenCalledTimes(2);

        // Cleanup
        Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true });
    });

    test('Requirement 3: Persistence (App Closed During Save)', () => {
        const userId = 'user123';
        const dateStr = '2026-05-16';
        
        // Add a task to the queue and save to localStorage
        syncService.enqueueSessionFinalization(userId, dateStr, { rpe: 9 });
        
        // Verify it's in localStorage
        const stored = JSON.parse(localStorage.getItem('ironlogic_sync_queue'));
        expect(stored.length).toBe(1);
        expect(stored[0].payload.dateStr).toBe(dateStr);

        // Simulate app restart by creating a new instance
        // In a real test we would reload the module
        const newSyncService = new (syncService.constructor)();
        expect(newSyncService.queue.length).toBe(1);
        expect(newSyncService.queue[0].id).toBe(`finalize_${userId}_${dateStr}`);
    });

    test('Requirement 4: Partial DB Failure Reconciliation', async () => {
        const userId = 'user123';
        const dateStr = '2026-05-16';

        // Mock a failure that persists
        firestoreService.finalizeWorkoutSession.mockRejectedValue(new Error('Database Error'));

        syncService.enqueueSessionFinalization(userId, dateStr, { rpe: 5 });

        // Process until max attempts
        for(let i=0; i<6; i++) {
            await syncService.processQueue();
        }

        // Task should be abandoned after max attempts (currently 5)
        expect(syncService.queue.length).toBe(0);
        expect(firestoreService.finalizeWorkoutSession).toHaveBeenCalledTimes(5);
    });
});
