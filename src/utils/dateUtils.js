export const getDateStr = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const parseWorkoutDate = (value) => {
    if (!value) return null;
    const dateStr = String(value).includes('T') ? String(value).split('T')[0] : String(value);
    const parsed = new Date(`${dateStr}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
