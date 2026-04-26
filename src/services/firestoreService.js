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

export {
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
};

import { db } from '../config/firebaseConfig';
export { db };

// ==================== ADMIN & TRACKING ====================

export const recordUserSignup = async (userId, email) => {
    const docRef = doc(db, 'registered_users', userId);
    await setDoc(docRef, {
        email,
        signupDate: new Date().toISOString(),
        role: 'athlete',
        subscription_status: 'beta'
    }, { merge: true });

    const profileRef = doc(db, 'users', userId, 'profile', 'data');
    await setDoc(profileRef, {
        email,
        role: 'athlete',
        subscription_status: 'beta',
        createdAt: new Date().toISOString()
    }, { merge: true });
};

export const getAllRegisteredUsers = async () => {
    const usersRef = collection(db, 'registered_users');
    const q = query(usersRef, orderBy('signupDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const updateUserRole = async (userId, role) => {
    const regDocRef = doc(db, 'registered_users', userId);
    const profileDocRef = doc(db, 'users', userId, 'profile', 'data');
    const updates = { role };
    await Promise.all([
        updateDoc(regDocRef, updates),
        setDoc(profileDocRef, updates, { merge: true })
    ]);
};

export const updateSubscriptionStatus = async (userId, status) => {
    const regDocRef = doc(db, 'registered_users', userId);
    const profileDocRef = doc(db, 'users', userId, 'profile', 'data');
    const updates = { subscription_status: status };
    await Promise.all([
        updateDoc(regDocRef, updates),
        setDoc(profileDocRef, updates, { merge: true })
    ]);
};

export const assignAthleteToCoach = async (athleteId, coachId) => {
    const regDocRef = doc(db, 'registered_users', athleteId);
    const profileDocRef = doc(db, 'users', athleteId, 'profile', 'data');
    const updates = { coach_id: coachId };
    await Promise.all([
        updateDoc(regDocRef, updates),
        setDoc(profileDocRef, updates, { merge: true })
    ]);
};

export const getAssignedAthletes = async (coachId) => {
    const usersRef = collection(db, 'registered_users');
    const q = query(usersRef, where('coach_id', '==', coachId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

// ==================== WORKOUT COMMENTS ====================

export const addWorkoutComment = async (userId, workoutId, commentData) => {
    const commentsRef = collection(db, 'users', userId, 'workouts', workoutId, 'comments');
    const docRef = await addDoc(commentsRef, {
        ...commentData,
        timestamp: new Date().toISOString()
    });
    return docRef.id;
};

export const subscribeToWorkoutComments = (userId, workoutId, callback) => {
    const commentsRef = collection(db, 'users', userId, 'workouts', workoutId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const comments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(comments);
    });
};

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

export const subscribeToWorkouts = (userId, callback, errorCallback, limitCount = 50) => {
    const workoutsRef = collection(db, 'users', userId, 'workouts');
    const q = query(workoutsRef, orderBy('date', 'desc'), limit(limitCount));
    return onSnapshot(q, (snapshot) => {
        const workouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(workouts);
    }, errorCallback);
};

// ==================== SESSIONS ====================

export const markSessionComplete = async (userId, dateStr, isComplete) => {
    const sessionRef = doc(db, 'users', userId, 'sessions', dateStr);
    await setDoc(sessionRef, { isComplete }, { merge: true });
};

export const subscribeToSessionStatus = (userId, dateStr, callback) => {
    const sessionRef = doc(db, 'users', userId, 'sessions', dateStr);
    return onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data().isComplete || false);
        } else {
            callback(false);
        }
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

export const subscribeToGoals = (userId, callback, errorCallback) => {
    const goalsRef = collection(db, 'users', userId, 'goals');
    return onSnapshot(goalsRef, (snapshot) => {
        const goals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(goals);
    }, errorCallback);
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
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
};
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

export const subscribeToBodyWeight = (userId, callback, errorCallback) => {
    const weightRef = collection(db, 'users', userId, 'bodyWeight');
    const q = query(weightRef, orderBy('date', 'desc'), limit(90));
    return onSnapshot(q, (snapshot) => {
        const weights = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        callback(weights);
    }, errorCallback);
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
export const getRecovery = getRecoveryHistory;

export const addRecoveryEntry = async (userId, recoveryData) => {
    const recoveryRef = collection(db, 'users', userId, 'recovery');
    const docRef = await addDoc(recoveryRef, recoveryData);
    return docRef.id;
};
export const addRecovery = addRecoveryEntry;

export const updateRecovery = async (userId, recoveryId, recoveryData) => {
    const docRef = doc(db, 'users', userId, 'recovery', recoveryId);
    await updateDoc(docRef, recoveryData);
};

export const subscribeToRecovery = (userId, callback, errorCallback) => {
    const recoveryRef = collection(db, 'users', userId, 'recovery');
    const q = query(recoveryRef, orderBy('date', 'desc'), limit(90));
    return onSnapshot(q, (snapshot) => {
        const recovery = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(recovery);
    }, errorCallback);
};

// ==================== SEPARATED PROGRAMMING PATHS ====================

export const saveCoachPersonalWorkout = async (coachId, workoutData) => {
    const ref = collection(db, 'users', coachId, 'coachPrograms');
    const docRef = await addDoc(ref, {
        ...workoutData,
        updatedAt: new Date().toISOString()
    });
    return docRef.id;
};

export const saveAthleteProgram = async (athleteId, coachId, programData) => {
    const ref = collection(db, 'users', athleteId, 'athletePrograms');
    const docRef = await addDoc(ref, {
        ...programData,
        authorId: coachId,
        assignedAt: new Date().toISOString()
    });
    return docRef.id;
};

export const getAthletePrograms = async (athleteId) => {
    const ref = collection(db, 'users', athleteId, 'athletePrograms');
    const qSnap = await getDocs(ref);
    return qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const subscribeToAthletePrograms = (athleteId, callback) => {
    const ref = collection(db, 'users', athleteId, 'athletePrograms');
    return onSnapshot(ref, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
};

export const deleteAthleteProgram = async (athleteId, programId) => {
    const docRef = doc(db, 'users', athleteId, 'athletePrograms', programId);
    await deleteDoc(docRef);
};

export const updateAthleteProgram = async (athleteId, programId, updates) => {
    const docRef = doc(db, 'users', athleteId, 'athletePrograms', programId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
};

// ==================== PROGRAM TEMPLATES ====================

export const getProgramTemplates = async (includePrivate = false) => {
    const templatesRef = collection(db, 'program_templates');
    let q;
    if (includePrivate) {
        q = query(templatesRef, orderBy('createdAt', 'desc'));
    } else {
        q = query(templatesRef, where('visibility', '==', 'public'), orderBy('createdAt', 'desc'));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addProgramTemplate = async (templateData, authorId) => {
    const templatesRef = collection(db, 'program_templates');
    const docRef = await addDoc(templatesRef, {
        ...templateData,
        authorId,
        isTemplate: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    return docRef.id;
};

export const updateProgramTemplate = async (templateId, updates) => {
    const docRef = doc(db, 'program_templates', templateId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
};

export const deleteProgramTemplate = async (templateId) => {
    const docRef = doc(db, 'program_templates', templateId);
    await deleteDoc(docRef);
};

export const importProgramToCalendar = async (userId, templateId, startDateStr) => {
    const templateRef = doc(db, 'program_templates', templateId);
    const templateSnap = await getDoc(templateRef);
    if (!templateSnap.exists()) throw new Error("Template not found");
    const template = templateSnap.data();
    
    const startDate = new Date(startDateStr + 'T12:00:00');
    const promises = [];
    
    if (template.weeks && Array.isArray(template.weeks)) {
        template.weeks.forEach((week, weekIdx) => {
            if (week.days && Array.isArray(week.days)) {
                week.days.forEach((day) => {
                    const daysToAdd = (weekIdx * 7) + (day.dayOfWeek - 1);
                    const workoutDate = new Date(startDate);
                    workoutDate.setDate(startDate.getDate() + daysToAdd);
                    const dateStr = workoutDate.toISOString().split('T')[0];
                    
                    promises.push(saveAthleteProgram(userId, 'system', {
                        name: day.name || `Week ${weekIdx + 1} Day ${day.dayOfWeek}`,
                        date: dateStr,
                        exercises: day.exercises || [],
                        notes: day.notes || '',
                        isFromTemplate: true,
                        templateId: templateId
                    }));
                });
            }
        });
    }
    
    await Promise.all(promises);
};

// ==================== LEGACY COMPATIBILITY ====================

export const getPlannedWorkouts = getAthletePrograms;
export const addPlannedWorkout = (uid, data) => saveAthleteProgram(uid, data.authorId || uid, data);
export const deletePlannedWorkout = deleteAthleteProgram;
export const updatePlannedWorkout = updateAthleteProgram;
export const subscribeToPlannedWorkouts = subscribeToAthletePrograms;
export const assignProgramToAthlete = saveAthleteProgram;

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

export const updateCalendarNote = async (userId, noteId, updates) => {
    const docRef = doc(db, 'users', userId, 'calendarNotes', noteId);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
};

export const deleteCalendarNote = async (userId, noteId) => {
    const docRef = doc(db, 'users', userId, 'calendarNotes', noteId);
    await deleteDoc(docRef);
};

export const subscribeToCalendarNotes = (userId, callback, errorCallback) => {
    const notesRef = collection(db, 'users', userId, 'calendarNotes');
    return onSnapshot(notesRef, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(notes);
    }, errorCallback);
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

export const subscribeToAICoachingData = (userId, callback, errorCallback) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    return onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) {
            callback({ program: null, questionnaire: null });
        } else {
            const data = docSnap.data();
            callback({
                program: data.program || null,
                questionnaire: data.questionnaire || null
            });
        }
    }, errorCallback);
};

export const getAIProgram = async (userId) => {
    const data = await getAICoachingData(userId);
    return data.program;
};

export const saveAIProgram = async (userId, programData) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    await setDoc(docRef, { program: programData, dismissed: false }, { merge: true });
};

export const getQuestionnaire = async (userId) => {
    const data = await getAICoachingData(userId);
    return data.questionnaire;
};

export const saveQuestionnaire = async (userId, questionnaireData) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    await setDoc(docRef, { questionnaire: questionnaireData, program: null, dismissed: false }, { merge: true });
};

export const clearAIProgram = async (userId) => {
    const docRef = doc(db, 'users', userId, 'aiProgram', 'data');
    await setDoc(docRef, { program: null, dismissed: true }, { merge: true });
};

// ==================== CHAT HISTORY ====================

export const saveChatMessage = async (userId, message) => {
    const chatRef = collection(db, 'users', userId, 'chatHistory');
    await addDoc(chatRef, {
        ...message,
        timestamp: new Date().toISOString()
    });
};

export const getChatHistory = async (userId, limitCount = 50) => {
    const chatRef = collection(db, 'users', userId, 'chatHistory');
    const q = query(chatRef, orderBy('timestamp', 'asc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const clearChatHistory = async (userId) => {
    const chatRef = collection(db, 'users', userId, 'chatHistory');
    const querySnapshot = await getDocs(chatRef);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
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

export const subscribeToCustomExercises = (userId, callback, errorCallback) => {
    const exercisesRef = collection(db, 'users', userId, 'customExercises');
    return onSnapshot(exercisesRef, (snapshot) => {
        const exercises = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(exercises);
    }, errorCallback);
};

export const addCustomExercise = async (userId, exerciseData, customId = null) => {
    const exercisesRef = collection(db, 'users', userId, 'customExercises');
    if (customId) {
        const docRef = doc(exercisesRef, customId);
        await setDoc(docRef, exerciseData);
        return customId;
    } else {
        const docRef = await addDoc(exercisesRef, exerciseData);
        return docRef.id;
    }
};

export const ensureCustomExercisesExist = async (userId, program) => {
    if (!program || !program.weeks) return;
    const existingCustom = await getCustomExercises(userId);
    const existingIds = new Set(existingCustom.map(e => e.id));
    const newExercises = [];
    program.weeks.forEach(week => {
        week.days.forEach(day => {
            day.exercises.forEach(ex => {
                if (ex.isNew && ex.exerciseId && !existingIds.has(ex.exerciseId)) {
                    newExercises.push({
                        id: ex.exerciseId,
                        data: {
                            name: ex.name || ex.exerciseId,
                            category: ex.category || 'Custom',
                            createdAt: new Date().toISOString()
                        }
                    });
                    existingIds.add(ex.exerciseId);
                }
            });
        });
    });
    if (newExercises.length > 0) {
        const promises = newExercises.map(ex => addCustomExercise(userId, ex.data, ex.id));
        await Promise.all(promises);
    }
};

// ==================== MOBILITY LOGS ====================

export const getMobilityLogs = async (userId, limitCount = null) => {
    const mobilityRef = collection(db, 'users', userId, 'mobilityLogs');
    let q = query(mobilityRef, orderBy('date', 'desc'));
    if (limitCount) {
        q = query(mobilityRef, orderBy('date', 'desc'), limit(limitCount));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const addMobilityLog = async (userId, mobilityData) => {
    const mobilityRef = collection(db, 'users', userId, 'mobilityLogs');
    const docRef = await addDoc(mobilityRef, {
        ...mobilityData,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

export const subscribeToMobilityLogs = (userId, callback, errorCallback) => {
    const mobilityRef = collection(db, 'users', userId, 'mobilityLogs');
    const q = query(mobilityRef, orderBy('date', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(logs);
    }, errorCallback);
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
    const [profileSnap, workouts, weights, recovery, coaching, goals, mobilityLogs] = await Promise.all([
        getDoc(profileRef),
        getWorkouts(userId, 50),
        getBodyWeightHistory(userId, 90),
        getRecoveryHistory(userId, 90),
        getAICoachingData(userId),
        getGoals(userId),
        getMobilityLogs(userId, 100)
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
        goals,
        mobilityLogs
    };
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
