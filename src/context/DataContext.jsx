import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import * as firestoreService from '../services/firestoreService';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();

    // Initialize from Cache for 0ms First Paint
    const cachedData = useMemo(() => firestoreService.getCachedBootstrapData(), []);

    const [workouts, setWorkouts] = useState(cachedData?.workouts || []);
    const [weights, setWeights] = useState(cachedData?.weights || []);
    const [recovery, setRecovery] = useState(cachedData?.recovery || []);
    const [goals, setGoals] = useState(cachedData?.goals || []);
    const [profile, setProfile] = useState(cachedData?.profile || null);
    const [customExercises, setCustomExercises] = useState([]); // Custom exercises don't change often, fetch OK
    const [coaching, setCoaching] = useState(cachedData?.coaching || { program: null, questionnaire: null });
    const [plannedWorkouts, setPlannedWorkouts] = useState(cachedData?.plannedWorkouts || []);
    const [notesHistory, setNotesHistory] = useState(cachedData?.notesHistory || []);
    const [mobilityLogs, setMobilityLogs] = useState(cachedData?.mobilityLogs || []);

    // Sync Status Tracking
    const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'online' : 'offline');
    const [syncTimestamps, setSyncTimestamps] = useState({});
    const [syncError, setSyncError] = useState(null);

    // Status - Don't show global loader if we have cached data to show
    const [isLoading, setIsLoading] = useState(!cachedData);

    useEffect(() => {
        const handleOnline = () => setSyncStatus('online');
        const handleOffline = () => setSyncStatus('offline');

        const handleError = (source) => (err) => {
            console.error(`${source} Sync Error:`, err);
            setSyncError(`${source}: ${err.message || 'Unknown error'}`);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!user) {
            setIsLoading(false);
            return;
        }

        // Only show loading if we have absolutely nothing (no cache, no previous fetch)
        if (!cachedData && workouts.length === 0) {
            setIsLoading(true);
        }

        // Start all real-time listeners in parallel
        const unsubWorkouts = firestoreService.subscribeToWorkouts(user.id, (data) => {
            setWorkouts(data);
            setSyncTimestamps(prev => ({ ...prev, workouts: new Date().toLocaleTimeString() }));
            setIsLoading(false);
        }, handleError('Workouts'));

        const unsubWeights = firestoreService.subscribeToBodyWeight(user.id, (data) => {
            setWeights(data);
            setSyncTimestamps(prev => ({ ...prev, weights: new Date().toLocaleTimeString() }));
            setIsLoading(false);
        }, handleError('Weights'));

        const unsubRecovery = firestoreService.subscribeToRecovery(user.id, (data) => {
            setRecovery(data);
            setSyncTimestamps(prev => ({ ...prev, recovery: new Date().toLocaleTimeString() }));
            setIsLoading(false);
        }, handleError('Recovery'));

        const unsubGoals = firestoreService.subscribeToGoals(user.id, (data) => {
            setGoals(data);
            setSyncTimestamps(prev => ({ ...prev, goals: new Date().toLocaleTimeString() }));
            setIsLoading(false);
        }, handleError('Goals'));

        const unsubProfile = firestoreService.subscribeToProfile(user.id, (data) => {
            setProfile(data);
            setSyncTimestamps(prev => ({ ...prev, profile: new Date().toLocaleTimeString() }));
            setIsLoading(false);
        }, handleError('Profile'));

        const unsubCustom = firestoreService.subscribeToCustomExercises(user.id, (data) => {
            setCustomExercises(data);
            setSyncTimestamps(prev => ({ ...prev, customExercises: new Date().toLocaleTimeString() }));
        }, handleError('CustomExercises'));

        const unsubPlanned = firestoreService.subscribeToPlannedWorkouts(user.id, (data) => {
            setPlannedWorkouts(data);
            setSyncTimestamps(prev => ({ ...prev, plannedWorkouts: new Date().toLocaleTimeString() }));
        }, handleError('PlannedWorkouts'));

        const unsubNotes = firestoreService.subscribeToCalendarNotes(user.id, (data) => {
            setNotesHistory(data);
            setSyncTimestamps(prev => ({ ...prev, calendarNotes: new Date().toLocaleTimeString() }));
        }, handleError('CalendarNotes'));

        const unsubCoaching = firestoreService.subscribeToAICoachingData(user.id, (data) => {
            setCoaching(data);
            setSyncTimestamps(prev => ({ ...prev, coaching: new Date().toLocaleTimeString() }));
        }, handleError('Coaching'));

        const unsubMobility = firestoreService.subscribeToMobilityLogs(user.id, (data) => {
            setMobilityLogs(data);
            setSyncTimestamps(prev => ({ ...prev, mobilityLogs: new Date().toLocaleTimeString() }));
        }, handleError('Mobility'));

        return () => {
            unsubWorkouts();
            unsubWeights();
            unsubRecovery();
            unsubGoals();
            unsubProfile();
            unsubCustom();
            unsubPlanned();
            unsubNotes();
            unsubCoaching();
            unsubMobility();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user]);

    // --- SHADOW CACHE (Debounced Persistence) ---
    // Writes to localStorage 2 seconds after the last update to avoid blocking the UI thread during interaction.
    useEffect(() => {
        if (!user) return;

        const dataToCache = {
            profile,
            settings: profile?.settings || { unit: 'kg' },
            maxes: profile?.maxes || {},
            workouts: (workouts || []).slice(0, 50), // Only cache the "Head"
            weights: (weights || []).slice(0, 90),
            recovery: (recovery || []).slice(0, 90),
            coaching,
            goals,
            plannedWorkouts: plannedWorkouts || [],
            notesHistory: notesHistory || [],
            mobilityLogs: mobilityLogs || []
        };

        const timer = setTimeout(() => {
            localStorage.setItem('ironlogic_bootstrap_cache', JSON.stringify(dataToCache));
        }, 2000);

        return () => clearTimeout(timer);
    }, [user, workouts, weights, recovery, goals, profile, coaching, mobilityLogs]);

    const value = useMemo(() => ({
        workouts,
        weights,
        recovery,
        goals,
        profile,
        customExercises,
        coaching,
        plannedWorkouts,
        notesHistory,
        mobilityLogs,
        isLoading,
        syncStatus,
        syncTimestamps,
        syncError,
        settings: profile?.settings || { unit: 'kg' },
        maxes: profile?.maxes || {}
    }), [workouts, weights, recovery, goals, profile, customExercises, coaching, plannedWorkouts, notesHistory, mobilityLogs, isLoading, syncStatus, syncTimestamps, syncError]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
