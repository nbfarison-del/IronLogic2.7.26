import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import * as firestoreService from '../services/firestoreService';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();

    const [workouts, setWorkouts] = useState([]);
    const [weights, setWeights] = useState([]);
    const [recovery, setRecovery] = useState([]);
    const [goals, setGoals] = useState([]);
    const [profile, setProfile] = useState(null);
    const [customExercises, setCustomExercises] = useState([]); 
    const [coaching, setCoaching] = useState({ program: null, questionnaire: null });
    const [plannedWorkouts, setPlannedWorkouts] = useState([]);
    const [notesHistory, setNotesHistory] = useState([]);
    const [mobilityLogs, setMobilityLogs] = useState([]);
    const [sessions, setSessions] = useState([]);

    // Sync Status Tracking
    const [syncStatus, setSyncStatus] = useState(navigator.onLine ? 'online' : 'offline');
    const [syncTimestamps, setSyncTimestamps] = useState({});
    const [syncError, setSyncError] = useState(null);

    // Status - Don't show global loader if we have cached data to show
    const [isLoading, setIsLoading] = useState(false);

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
            const resetTimer = window.setTimeout(() => {
                setWorkouts([]);
                setWeights([]);
                setRecovery([]);
                setGoals([]);
                setProfile(null);
                setCustomExercises([]);
                setCoaching({ program: null, questionnaire: null });
                setPlannedWorkouts([]);
                setNotesHistory([]);
                setMobilityLogs([]);
                setSessions([]);
                setIsLoading(false);
            }, 0);

            return () => {
                window.clearTimeout(resetTimer);
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }

        const cachedData = firestoreService.getCachedBootstrapData(user.id);
        const cacheTimer = window.setTimeout(() => {
            if (cachedData) {
                setWorkouts(cachedData.workouts || []);
                setWeights(cachedData.weights || []);
                setRecovery(cachedData.recovery || []);
                setGoals(cachedData.goals || []);
                setProfile(cachedData.profile || null);
                setCoaching(cachedData.coaching || { program: null, questionnaire: null });
                setPlannedWorkouts(cachedData.plannedWorkouts || []);
                setNotesHistory(cachedData.notesHistory || []);
                setMobilityLogs(cachedData.mobilityLogs || []);
                setSessions(cachedData.sessions || []);
            }

            // Only show loading if we have absolutely nothing (no cache, no previous fetch)
            setIsLoading(!cachedData);
        }, 0);

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

        const unsubSessions = firestoreService.subscribeToSessions(user.id, (data) => {
            setSessions(data);
            setSyncTimestamps(prev => ({ ...prev, sessions: new Date().toLocaleTimeString() }));
        }, handleError('Sessions'));

        return () => {
            window.clearTimeout(cacheTimer);
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
            unsubSessions();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [user]);

    // --- SHADOW CACHE (Debounced Persistence) ---
    useEffect(() => {
        if (!user) return;

        const dataToCache = {
            profile,
            settings: profile?.settings || { unit: 'kg' },
            maxes: profile?.maxes || {},
            workouts: (workouts || []).slice(0, 50),
            weights: (weights || []).slice(0, 90),
            recovery: (recovery || []).slice(0, 90),
            coaching,
            goals,
            plannedWorkouts: plannedWorkouts || [],
            notesHistory: notesHistory || [],
            mobilityLogs: mobilityLogs || [],
            sessions: sessions || []
        };

        const timer = setTimeout(() => {
            firestoreService.setCachedBootstrapData(user.id, dataToCache);
        }, 2000);

        return () => clearTimeout(timer);
    }, [user, workouts, weights, recovery, goals, profile, coaching, plannedWorkouts, notesHistory, mobilityLogs, sessions]);

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
        sessions,
        isLoading,
        syncStatus,
        syncTimestamps,
        syncError,
        settings: profile?.settings || { unit: 'kg' },
        trainingMaxes: profile?.trainingMaxes || profile?.maxes || {}
    }), [workouts, weights, recovery, goals, profile, customExercises, coaching, plannedWorkouts, notesHistory, mobilityLogs, sessions, isLoading, syncStatus, syncTimestamps, syncError]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
