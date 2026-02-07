import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    // Check localStorage for persisted user to simulate session persistence
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('fitnessAppUser');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = (email, password) => {
        // Mock login logic
        const mockUser = { id: 1, email, name: email.split('@')[0] };
        setUser(mockUser);
        localStorage.setItem('fitnessAppUser', JSON.stringify(mockUser));
        return true;
    };

    const register = (email, password) => {
        // Mock register logic
        const mockUser = { id: 1, email, name: email.split('@')[0] };
        setUser(mockUser);
        localStorage.setItem('fitnessAppUser', JSON.stringify(mockUser));
        return true;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('fitnessAppUser');
    };

    const value = {
        user,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
