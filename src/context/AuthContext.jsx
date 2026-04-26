import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    confirmPasswordReset
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            console.error("AUTH OBJECT MISSING: Check Firebase Config / Environment Variables");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const { getUserProfile } = await import('../services/firestoreService');
                    const profile = await getUserProfile(firebaseUser.uid);

                    const isAdmin = firebaseUser.email === 'nbfarison@gmail.com';
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: profile?.name || firebaseUser.email.split('@')[0],
                        role: isAdmin ? 'admin' : (profile?.role || 'athlete'),
                        coachId: profile?.coach_id || null,
                        subscriptionStatus: profile?.subscription_status || 'beta'
                    });
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    const isAdmin = firebaseUser.email === 'nbfarison@gmail.com';
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.email.split('@')[0],
                        role: isAdmin ? 'admin' : 'athlete'
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error('Login error:', error.message);
            throw error;
        }
    };

    const register = async (email, password) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            return userCredential;
        } catch (error) {
            console.error('Registration error:', error.message);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error('Password reset email error:', error.message);
            throw error;
        }
    };

    const confirmReset = async (code, newPassword) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            await confirmPasswordReset(auth, code, newPassword);
        } catch (error) {
            console.error('Confirm reset error:', error.message);
            throw error;
        }
    };

    const logout = async () => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error.message);
            throw error;
        }
    };

    const value = useMemo(() => ({
        user,
        loading,
        login,
        register,
        resetPassword,
        confirmReset,
        logout
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
