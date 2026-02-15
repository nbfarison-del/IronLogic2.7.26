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
export const subscribeToWorkouts = (userId, callback) => {
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const q = query(workoutsRef, orderBy('date', 'desc'));

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

// ==================== BODY WEIGHT ====================

export const getBodyWeightHistory = async (userId) => {
    const weightRef = collection(db, 'users', userId, 'bodyWeight');
    const q = query(weightRef, orderBy('date', 'asc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
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

// ==================== RECOVERY TRACKING ====================

export const getRecoveryHistory = async (userId) => {
    const recoveryRef = collection(db, 'users', userId, 'recovery');
    const q = query(recoveryRef, orderBy('date', 'desc'));
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

export const getBootstrapData = async (userId) => {
    const profileRef = doc(db, 'users', userId, 'profile', 'data');
    const [profileSnap, workouts, weights, recovery, coaching] = await Promise.all([
        getDoc(profileRef),
        getWorkouts(userId, 50),
        getBodyWeightHistory(userId),
        getRecoveryHistory(userId),
        getAICoachingData(userId)
    ]);

    const profileData = profileSnap.exists() ? profileSnap.data() : {};

    return {
        profile: profileData,
        settings: profileData.settings || { unit: 'kg' },
        maxes: profileData.maxes || {},
        workouts,
        weights,
        recovery,
        coaching
    };
};
