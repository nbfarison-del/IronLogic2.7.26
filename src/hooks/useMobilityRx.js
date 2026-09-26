import { useState, useMemo, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { prescribeForToday, TRAINING_TYPES } from '../services/MobilityPrescription';
import { getDateStr } from '../utils/dateUtils';

const KEY = 'ironlogic.trainingType';

/**
 * Today's mobility prescription, driven by a one-tap training-type chip
 * (persisted per-day in localStorage) plus mobility logs from Firestore.
 */
export function useMobilityRx() {
    const { mobilityLogs } = useData();
    const today = getDateStr(new Date());

    const [stored, setStored] = useState(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed.date === today ? parsed.type : null;
        } catch {
            return null;
        }
    });

    const setTrainingType = useCallback((type) => {
        setStored(type);
        try {
            localStorage.setItem(KEY, JSON.stringify({ date: today, type }));
        } catch {
            /* storage unavailable — selection lasts the session */
        }
    }, [today]);

    const prescription = useMemo(
        () => prescribeForToday({ trainingType: stored, mobilityLogs: mobilityLogs || [] }),
        [stored, mobilityLogs]
    );

    return { prescription, trainingType: stored, setTrainingType, trainingTypes: TRAINING_TYPES };
}
