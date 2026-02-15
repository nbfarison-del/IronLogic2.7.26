import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import * as firestoreService from '../services/firestoreService';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const { user } = useAuth();
    const { settings } = useData();

    const unit = settings?.unit || 'kg';

    const toggleUnit = async () => {
        const newUnit = unit === 'kg' ? 'lbs' : 'kg';
        if (user) {
            try {
                await firestoreService.updateSettings(user.id, { unit: newUnit });
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        }
    };

    const value = useMemo(() => ({
        unit,
        toggleUnit
    }), [unit, user]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
