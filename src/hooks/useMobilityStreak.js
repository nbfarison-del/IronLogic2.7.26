import { useMemo } from 'react';
import { getDateStr } from '../utils/dateUtils';

const DAY_MS = 86400000;
const FREEZE_KEY = 'ironlogic.streakFreeze';
// Noon-anchored so DST transitions can't split a day
const toDayNum = (dateStr) => Math.floor(new Date(`${dateStr}T12:00:00`).getTime() / DAY_MS);
const fromDayNum = (num) => getDateStr(new Date(num * DAY_MS + DAY_MS / 2));

/** Monday (YYYY-MM-DD) of the week containing dateStr. One freeze per week. */
export function weekStartOf(dateStr) {
    const d = new Date(`${dateStr}T12:00:00`);
    const dow = (d.getDay() + 6) % 7; // Mon=0
    d.setDate(d.getDate() - dow);
    return getDateStr(d);
}

function loadFreezeState(todayStr) {
    const weekStart = weekStartOf(todayStr);
    try {
        const raw = localStorage.getItem(FREEZE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.weekStart === weekStart) return { weekStart, consumedDates: parsed.consumedDates || [] };
        }
    } catch { /* fall through to fresh */ }
    return { weekStart, consumedDates: [] };
}

/**
 * Pure streak math over YYYY-MM-DD strings. Testable without React.
 * current: consecutive days ending today (or yesterday if today isn't logged yet).
 * A streak freeze auto-covers a single missed day when one is banked
 * (1 per calendar week); frozen days count toward the streak.
 *
 * @param {string[]} dateStrs logged mobility dates
 * @param {string} todayStr YYYY-MM-DD
 * @param {string[]} consumedDates dates already covered by a freeze
 * @returns {{current, longest, total, freezesAvailable, newFreezes}}
 */
export function computeMobilityStreak(dateStrs, todayStr, consumedDates = []) {
    const days = new Set((dateStrs || []).filter(Boolean));
    const consumed = new Set((consumedDates || []).filter(Boolean));
    const covered = new Set([...days, ...consumed]);
    if (covered.size === 0) return { current: 0, longest: 0, total: 0, freezesAvailable: 1, newFreezes: [] };

    const nums = [...covered].map(toDayNum).sort((a, b) => a - b);
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
    const newFreezes = [];
    const freezesAvailable = Math.max(0, 1 - consumed.size);
    const minLoggedNum = Math.min(...[...days].map(toDayNum));

    while (true) {
        if (numSet.has(cursor)) { current++; cursor--; continue; }
        const dateStr = fromDayNum(cursor);
        // Never freeze today (the day isn't over), future days, or days
        // before the streak's history began — a freeze bridges a gap,
        // it doesn't extend the streak backward.
        const bridgesHistory = minLoggedNum < cursor;
        if (cursor < todayNum && bridgesHistory && !consumed.has(dateStr) && newFreezes.length < freezesAvailable) {
            newFreezes.push(dateStr);
            current++; cursor--; continue;
        }
        break;
    }

    return { current, longest, total: days.size, freezesAvailable: freezesAvailable - newFreezes.length, newFreezes };
}

export function useMobilityStreak(mobilityLogs = []) {
    const todayStr = getDateStr(new Date());
    // Freeze consumption is derived during render and persisted idempotently:
    // once a freeze is written to localStorage, later renders reload it as
    // already-consumed, so a freeze can never be double-counted (even under
    // StrictMode's double-render).
    return useMemo(() => {
        const dates = mobilityLogs.map(m => m.date);
        const freezeState = loadFreezeState(todayStr);
        const r = computeMobilityStreak(dates, todayStr, freezeState.consumedDates);
        if (r.newFreezes.length > 0) {
            const next = {
                ...freezeState,
                consumedDates: [...new Set([...freezeState.consumedDates, ...r.newFreezes])],
            };
            try { localStorage.setItem(FREEZE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        }
        const { newFreezes: _nf, ...rest } = r;
        return {
            ...rest,
            freezeUsedThisWeek: freezeState.consumedDates.length + r.newFreezes.length > 0,
        };
    }, [mobilityLogs, todayStr]);
}
