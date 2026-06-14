export const getFriendlyErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
    const code = error?.code || '';
    const message = error?.message || '';

    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return 'The email or password does not match our records.';
    }

    if (code === 'auth/email-already-in-use') {
        return 'An account already exists for that email address.';
    }

    if (code === 'auth/weak-password') {
        return 'Choose a stronger password with at least 6 characters.';
    }

    if (code === 'auth/invalid-email') {
        return 'Enter a valid email address.';
    }

    if (code === 'auth/network-request-failed' || /network|offline/i.test(message)) {
        return 'Network connection failed. Check your connection and try again.';
    }

    if (/Firebase Auth not initialized|FIREBASE CONFIG/i.test(message)) {
        return 'The app is not configured correctly yet. Please check the Firebase environment settings.';
    }

    if (/permission.denied/i.test(code) || /Missing or insufficient permissions/i.test(message)) {
        return 'You do not have permission to view or change that data.';
    }

    return message && !/^Firebase:/i.test(message) ? message : fallback;
};
