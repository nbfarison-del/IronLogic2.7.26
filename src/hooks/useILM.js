import { useState, useEffect, useCallback } from 'react';
import * as firestoreService from '../services/firestoreService';
import { runWeeklyCheckIn } from '../services/DMAICService';

/**
 * useILM hook
 * Handles data fetching, caching, and state management for the ILM/DMAIC engine.
 */
export const useILM = (athleteId) => {
    const [fetchingData, setFetchingData] = useState(true);
    const [loading, setLoading] = useState(false);
    const [readiness, setReadiness] = useState({
        sleep: 7,
        soreness: 3,
        fatigue: 3,
        weight: '',
        injuries: '',
        overarchingGoal: '',
        weeklySmallGoal: ''
    });
    const [checkInData, setCheckInData] = useState(null);
    const [error, setError] = useState(null);

    // Initial Prefill (Cached/Intelligent)
    useEffect(() => {
        if (!athleteId) return;

        const prefillData = async () => {
            setFetchingData(true);
            try {
                // Parallel fetch for speed
                const [weights, recovery, profile] = await Promise.all([
                    firestoreService.getBodyWeightHistory(athleteId, 1),
                    firestoreService.getRecoveryHistory(athleteId, 1),
                    firestoreService.getUserProfile(athleteId)
                ]);

                setReadiness(prev => ({
                    ...prev,
                    weight: weights.length > 0 ? weights[0].weight : '',
                    sleep: recovery.length > 0 ? (recovery[0].sleepHours || 7) : 7,
                    soreness: recovery.length > 0 ? (recovery[0].muscularSoreness || 3) : 3,
                    fatigue: recovery.length > 0 ? (recovery[0].overallFatigue || 3) : 3,
                    overarchingGoal: profile?.overarchingGoal || ''
                }));
            } catch (err) {
                console.error("ILM Fetch Error:", err);
                setError("Failed to sync readiness data.");
            } finally {
                setFetchingData(false);
            }
        };

        prefillData();
    }, [athleteId]);

    const performCheckIn = useCallback(async (currentReadiness) => {
        setLoading(true);
        setError(null);
        try {
            const result = await runWeeklyCheckIn(athleteId, currentReadiness);
            setCheckInData(result);
            return result;
        } catch (e) {
            console.error("Check-in Error:", e);
            setError("Analysis failed. Please try again.");
            throw e;
        } finally {
            setLoading(false);
        }
    }, [athleteId]);

    return {
        fetchingData,
        loading,
        readiness,
        setReadiness,
        checkInData,
        performCheckIn,
        error
    };
};
