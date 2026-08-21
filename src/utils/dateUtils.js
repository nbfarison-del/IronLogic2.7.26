export const getDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const toLocalDateStr = (value) => {
    const str = String(value ?? '');
    if (!str.includes('T')) return str;
    const parsed = new Date(str);
    return Number.isNaN(parsed.getTime()) ? str.split('T')[0] : getDateStr(parsed);
};

export const parseWorkoutDate = (value) => {
    if (!value) return null;
    const parsed = new Date(`${toLocalDateStr(value)}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isWithinRecentDays = (dateValue, days, now = new Date()) => {
    if (!dateValue) return false;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return toLocalDateStr(dateValue) >= getDateStr(cutoff);
};
