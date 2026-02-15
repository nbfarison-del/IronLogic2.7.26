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

    // Status - Don't show global loader if we have cached data to show
    const [isLoading, setIsLoading] = useState(!cachedData);
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Start all real-time listeners in parallel
        const unsubWorkouts = firestoreService.subscribeToWorkouts(user.id, (data) => {
            setWorkouts(data);
            setLastUpdated(new Date());
            setIsLoading(false);
        });

        const unsubWeights = firestoreService.subscribeToBodyWeight(user.id, (data) => {
            setWeights(data);
            setIsLoading(false);
        });

        const unsubRecovery = firestoreService.subscribeToRecovery(user.id, (data) => {
            setRecovery(data);
            setIsLoading(false);
        });

        const unsubGoals = firestoreService.subscribeToGoals(user.id, (data) => {
            setGoals(data);
            setIsLoading(false);
        });

        const unsubProfile = firestoreService.subscribeToProfile(user.id, (data) => {
            setProfile(data);
            setIsLoading(false);
        });

        const unsubCustom = firestoreService.subscribeToCustomExercises(user.id, (data) => {
            setCustomExercises(data);
        });

        // For coaching data, use cache first then update
        firestoreService.getAICoachingData(user.id).then(setCoaching);

        // Update the bootstrap cache periodically with fresh data
        firestoreService.getBootstrapData(user.id);

        return () => {
            unsubWorkouts();
            unsubWeights();
            unsubRecovery();
            unsubGoals();
            unsubProfile();
            unsubCustom();
        };
    }, [user]);

    const value = useMemo(() => ({
        workouts,
        weights,
        recovery,
        goals,
        profile,
        customExercises,
        coaching,
        isLoading,
        lastUpdated,
        settings: profile?.settings || { unit: 'kg' },
        maxes: profile?.maxes || {}
    }), [workouts, weights, recovery, goals, profile, customExercises, coaching, isLoading, lastUpdated]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
