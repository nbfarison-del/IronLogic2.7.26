import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // SAFETY CHECK: If firebaseConfig failed to init, auth will be undefined.
        if (!auth) {
            console.error("AUTH OBJECT MISSING: Check Firebase Config / Environment Variables");
            setLoading(false);
            // We set loading false so the app renders (and potentially hits ErrorBoundary or just shows empty state)
            // rather than hanging on white screen
            return;
        }

        // Listen for auth state changes (handles session persistence)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Import firestoreService dynamically to avoid circular dependency if any
                    const { getUserProfile } = await import('../services/firestoreService');
                    const profile = await getUserProfile(firebaseUser.uid);

                    // User is signed in
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
                    // Fallback to basic user info if profile fetch fails
                    const isAdmin = firebaseUser.email === 'nbfarison@gmail.com';
                    setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.email.split('@')[0],
                        role: isAdmin ? 'admin' : 'athlete'
                    });
                }
            } else {
                // User is signed out
                setUser(null);
            }
            setLoading(false);
        });

        // Cleanup subscription
        return unsubscribe;
    }, []);

    const login = async (email, password) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
        logout
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

