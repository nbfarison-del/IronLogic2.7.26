import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import * as firestoreService from '../services/firestoreService';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();

    // Core State
    const [workouts, setWorkouts] = useState([]);
    const [weights, setWeights] = useState([]);
    const [recovery, setRecovery] = useState([]);
    const [goals, setGoals] = useState([]);
    const [profile, setProfile] = useState(null);
    const [customExercises, setCustomExercises] = useState([]);
    const [coaching, setCoaching] = useState({ program: null, questionnaire: null });

    // Status
    const [isLoading, setIsLoading] = useState(true);
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

        // For coaching data, we'll keep it as a fetch for now as it changes less frequently
        // but we can subscribe later if needed.
        firestoreService.getAICoachingData(user.id).then(setCoaching);

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
