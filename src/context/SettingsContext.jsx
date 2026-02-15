import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import * as firestoreService from '../services/firestoreService';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const { user } = useAuth();
    const [unit, setUnit] = useState('kg');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSettings = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const settings = await firestoreService.getSettings(user.id);
                if (settings?.unit) {
                    setUnit(settings.unit);
                }
            } catch (error) {
                console.error('Error loading settings:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [user]);

    const toggleUnit = async () => {
        const newUnit = unit === 'kg' ? 'lbs' : 'kg';
        setUnit(newUnit);

        if (user) {
            try {
                await firestoreService.updateSettings(user.id, { unit: newUnit });
            } catch (error) {
                console.error('Error saving settings:', error);
            }
        }
    };

    const value = {
        unit,
        setUnit,
        toggleUnit
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
