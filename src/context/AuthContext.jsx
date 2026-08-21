import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    confirmPasswordReset,
    verifyPasswordResetCode
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { getRegisteredUserByEmail, getUserProfile } from '../services/firestoreService';
import { SUPER_ADMIN_EMAIL } from '../config/constants';

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
                    const profile = await getUserProfile(firebaseUser.uid);

                    const isAdmin = firebaseUser.email === SUPER_ADMIN_EMAIL;
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
                    const isAdmin = firebaseUser.email === SUPER_ADMIN_EMAIL;
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
        const trimmedEmail = email?.trim().toLowerCase();
        if (!trimmedEmail) throw new Error("Please enter a valid email address.");

        try {
            const registeredUser = await getRegisteredUserByEmail(trimmedEmail);
            if (!registeredUser) {
                throw Object.assign(new Error("No account was found for that email address."), {
                    code: 'auth/user-not-found'
                });
            }

            const actionCodeSettings = {
                url: `${window.location.origin}/reset-password`,
                handleCodeInApp: true
            };

            console.log("Firebase Auth: Requesting password reset", {
                email: trimmedEmail,
                userId: registeredUser.id,
                actionUrl: actionCodeSettings.url
            });
            const response = await sendPasswordResetEmail(auth, trimmedEmail, actionCodeSettings);
            console.log("Firebase Auth: Password reset email response", response ?? { status: 'sent' });
            return response;
        } catch (error) {
            console.error('Firebase Auth: Password reset email error:', error.code, error.message);
            throw error;
        }
    };

    const verifyResetCode = async (code) => {
        if (!auth) throw new Error("Firebase Auth not initialized");
        try {
            return await verifyPasswordResetCode(auth, code);
        } catch (error) {
            console.error('Verify reset code error:', error.code, error.message);
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
        verifyResetCode,
        confirmReset,
        logout
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
