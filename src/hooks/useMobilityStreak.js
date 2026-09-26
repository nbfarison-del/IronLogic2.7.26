import { useMemo } from 'react';
import { getDateStr } from '../utils/dateUtils';

const DAY_MS = 86400000;
// Noon-anchored so DST transitions can't split a day
const toDayNum = (dateStr) => Math.floor(new Date(`${dateStr}T12:00:00`).getTime() / DAY_MS);

/**
 * Pure streak math over YYYY-MM-DD strings. Testable without React.
 * current: consecutive days ending today (or yesterday if today isn't logged yet)
 */
export function computeMobilityStreak(dateStrs, todayStr) {
    const days = new Set((dateStrs || []).filter(Boolean));
    if (days.size === 0) return { current: 0, longest: 0, total: 0 };

    const nums = [...days].map(toDayNum).sort((a, b) => a - b);
    const numSet = new Set(nums);

    let longest = 1, run = 1;
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] === nums[i - 1] + 1) run++;
        else if (nums[i] !== nums[i - 1]) { longest = Math.max(longest, run); run = 1; }
    }
    longest = Math.max(longest, run);

    const todayNum = toDayNum(todayStr);
    let cursor = numSet.has(todayNum) ? todayNum : todayNum - 1;
    let current = 0;
    while (numSet.has(cursor)) { current++; cursor--; }

    return { current, longest, total: days.size };
}

export function useMobilityStreak(mobilityLogs = []) {
    return useMemo(() => {
        const dates = mobilityLogs.map(m => m.date);
        return computeMobilityStreak(dates, getDateStr(new Date()));
    }, [mobilityLogs]);
}
