import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    const [unit, setUnit] = useState(() => {
        return localStorage.getItem('fitnessAppUnit') || 'kg';
    });

    useEffect(() => {
        localStorage.setItem('fitnessAppUnit', unit);
    }, [unit]);

    const toggleUnit = () => {
        setUnit(prev => prev === 'kg' ? 'lbs' : 'kg');
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
