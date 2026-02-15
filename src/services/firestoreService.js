import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// ==================== USER PROFILE ====================

// ==================== USER PROFILE ====================

export const getUserProfile = async (userId) => {
    const docRef = doc(db, 'users', userId, 'profile', 'data');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

export const updateUserProfile = async (userId, profileData) => {
    const docRef = doc(db, 'users', userId, 'profile', 'data');
    await setDoc(docRef, profileData, { merge: true });
};

export const subscribeToProfile = (userId, callback) => {
    const docRef = doc(db, 'users', userId, 'profile', 'data');
    return onSnapshot(docRef, (docSnap) => {
        callback(docSnap.exists() ? docSnap.data() : null);
    });
};

// ==================== WORKOUTS ====================

export const getWorkouts = async (userId, limitCount = null) => {
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    let q = query(workoutsRef, orderBy('date', 'desc'));

    if (limitCount) {
        q = query(workoutsRef, orderBy('date', 'desc'), limit(limitCount));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addWorkout = async (userId, workoutData) => {
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const docRef = await addDoc(workoutsRef, {
        ...workoutData,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

export const deleteWorkout = async (userId, workoutId) => {
    const docRef = doc(db, 'users', userId, 'workouts', workoutId);
    await deleteDoc(docRef);
};

// Listen for real-time workout updates
export const subscribeToWorkouts = (userId, callback, limitCount = 50) => {
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const q = query(workoutsRef, orderBy('date', 'desc'), limit(limitCount));

    return onSnapshot(q, (snapshot) => {
        const workouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(workouts);
    });
};

// ==================== GOALS ====================

export const getGoals = async (userId) => {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const querySnapshot = await getDocs(goalsRef);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addGoal = async (userId, goalData) => {
    const goalsRef = collection(db, 'users', userId, 'goals');
    const docRef = await addDoc(goalsRef, goalData);
    return docRef.id;
};

export const updateGoal = async (userId, goalId, goalData) => {
    const docRef = doc(db, 'users', userId, 'goals', goalId);
    await updateDoc(docRef, goalData);
};

export const deleteGoal = async (userId, goalId) => {
    const docRef = doc(db, 'users', userId, 'goals', goalId);
    await deleteDoc(docRef);
};

export const subscribeToGoals = (userId, callback) => {
    const goalsRef = collection(db, 'users', userId, 'goals');
    return onSnapshot(goalsRef, (snapshot) => {
        const goals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(goals);
    });
};

// ==================== BODY WEIGHT ====================

export const getBodyWeightHistory = async (userId, limitCount = null) => {
    const weightRef = collection(db, 'users', userId, 'bodyWeight');
    let q = query(weightRef, orderBy('date', 'desc'));
    if (limitCount) {
        q = query(weightRef, orderBy('date', 'desc'), limit(limitCount));
    }
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Keep internal return sorted ascending for graphs
};
// Alias for consistency
export const getBodyWeight = getBodyWeightHistory;

export const addBodyWeight = async (userId, weightData) => {
    const weightRef = collection(db, 'users', userId, 'bodyWeight');
    const docRef = await addDoc(weightRef, weightData);
    return docRef.id;
};

export const updateBodyWeight = async (userId, weightId, weightData) => {
    const docRef = doc(db, 'users', userId, 'bodyWeight', weightId);
    await updateDoc(docRef, weightData);
};

export const deleteBodyWeight = async (userId, weightId) => {
    const docRef = doc(db, 'users', userId, 'bodyWeight', weightId);
    await deleteDoc(docRef);
};

export const subscribeToBodyWeight = (userId, callback) => {
    const weightRef = collection(db, 'users', userId, 'bodyWeight');
    const q = query(weightRef, orderBy('date', 'desc'), limit(90));
    return onSnapshot(q, (snapshot) => {
        const weights = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        callback(weights);
    });
};

// ==================== RECOVERY TRACKING ====================

export const getRecoveryHistory = async (userId, limitCount = null) => {
    const recoveryRef = collection(db, 'users', userId, 'recovery');
    let q = query(recoveryRef, orderBy('date', 'desc'));
    if (limitCount) {
        q = query(recoveryRef, orderBy('date', 'desc'), limit(limitCount));
    }
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};
// Alias for consistency
export const getRecovery = getRecoveryHistory;

export const addRecoveryEntry = async (userId, recoveryData) => {
    const recoveryRef = collection(db, 'users', userId, 'recovery');
    const docRef = await addDoc(recoveryRef, recoveryData);
    return docRef.id;
};
// Alias for consistency
export const addRecovery = addRecoveryEntry;

export const updateRecovery = async (userId, recoveryId, recoveryData) => {
    const docRef = doc(db, 'users', userId, 'recovery', recoveryId);
    await updateDoc(docRef, recoveryData);
};

export const subscribeToRecovery = (userId, callback) => {
    const recoveryRef = collection(db, 'users', userId, 'recovery');
    const q = query(recoveryRef, orderBy('date', 'desc'), limit(90));
    return onSnapshot(q, (snapshot) => {
        const recovery = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(recovery);
    });
};

// ==================== PLANNED WORKOUTS ====================

export const getPlannedWorkouts = async (userId) => {
    const plannedRef = collection(db, 'users', userId, 'plannedWorkouts');
    const querySnapshot = await getDocs(plannedRef);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addPlannedWorkout = async (userId, plannedData) => {
    const plannedRef = collection(db, 'users', userId, 'plannedWorkouts');
    const docRef = await addDoc(plannedRef, plannedData);
    return docRef.id;
};

export const updatePlannedWorkout = async (userId, plannedId, plannedData) => {
    const docRef = doc(db, 'users', userId, 'plannedWorkouts', plannedId);
    await updateDoc(docRef, plannedData);
};

export const deletePlannedWorkout = async (userId, plannedId) => {
    const docRef = doc(db, 'users', userId, 'plannedWorkouts', plannedId);
    await deleteDoc(docRef);
};

// ==================== CALENDAR NOTES ====================

export const getCalendarNotes = async (userId) => {
    const notesRef = collection(db, 'users', userId, 'calendarNotes');
    const querySnapshot = await getDocs(notesRef);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addCalendarNote = async (userId, noteData) => {
    const notesRef = collection(db, 'users', userId, 'calendarNotes');
    const docRef = await addDoc(notesRef, noteData);
    return docRef.id;
};

// ==================== AI PROGRAM & QUESTIONNAIRE ====================

export const getAICoachingData = async (userId) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return { program: null, questionnaire: null };
    const data = docSnap.data();
    return {
        program: data.program || null,
        questionnaire: data.questionnaire || null
    };
};

export const getAIProgram = async (userId) => {
    const data = await getAICoachingData(userId);
    return data.program;
};

export const saveAIProgram = async (userId, programData) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    await setDoc(docRef, { program: programData }, { merge: true });
};

export const getQuestionnaire = async (userId) => {
    const data = await getAICoachingData(userId);
    return data.questionnaire;
};

export const saveQuestionnaire = async (userId, questionnaireData) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    await setDoc(docRef, { questionnaire: questionnaireData }, { merge: true });
};

export const clearAIProgram = async (userId) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    await setDoc(docRef, { program: null }, { merge: true });
};

// ==================== CUSTOM EXERCISES ====================

export const getCustomExercises = async (userId) => {
    const exercisesRef = collection(db, 'users', userId, 'customExercises');
    const querySnapshot = await getDocs(exercisesRef);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const subscribeToCustomExercises = (userId, callback) => {
    const exercisesRef = collection(db, 'users', userId, 'customExercises');
    return onSnapshot(exercisesRef, (snapshot) => {
        const exercises = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(exercises);
    });
};

export const addCustomExercise = async (userId, exerciseData) => {
    const exercisesRef = collection(db, 'users', userId, 'customExercises');
    const docRef = await addDoc(exercisesRef, exerciseData);
    return docRef.id;
};

// ==================== SETTINGS ====================

export const getSettings = async (userId) => {
    const docRef = doc(db, 'users', userId, 'profile', 'data');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().settings : { unit: 'kg' };
};

export const updateSettings = async (userId, settings) => {
    const docRef = doc(db, 'users', userId, 'profile', 'data');
    await setDoc(docRef, { settings }, { merge: true });
};

// ==================== BOOTSTRAP ====================

const BOOTSTRAP_CACHE_KEY = 'ironlogic_bootstrap_cache';

export const getCachedBootstrapData = () => {
    try {
        const cached = localStorage.getItem(BOOTSTRAP_CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        console.error('Error reading bootstrap cache:', e);
        return null;
    }
};

export const getBootstrapData = async (userId) => {
    const profileRef = doc(db, 'users', userId, 'profile', 'data');
    const [profileSnap, workouts, weights, recovery, coaching, goals] = await Promise.all([
        getDoc(profileRef),
        getWorkouts(userId, 50),
        getBodyWeightHistory(userId, 90),
        getRecoveryHistory(userId, 90),
        getAICoachingData(userId),
        getGoals(userId)
    ]);

    const profileData = profileSnap.exists() ? profileSnap.data() : {};

    const data = {
        profile: profileData,
        settings: profileData.settings || { unit: 'kg' },
        maxes: profileData.maxes || {},
        workouts,
        weights,
        recovery,
        coaching,
        goals
    };

    // Save to cache for next instant load
    try {
        localStorage.setItem(BOOTSTRAP_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save bootstrap cache:', e);
    }

    return data;
};

export const getDataInRange = async (userId, collectionName, startDate, endDate) => {
    const colRef = collection(db, 'users', userId, collectionName);
    const q = query(
        colRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
