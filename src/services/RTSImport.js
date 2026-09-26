// RTS (Reactive Training Systems) CSV import.
// RTS has no public API, so this is a one-way batch import: the user exports
// "Training Data" from RTS as CSV, uploads it here, confirms the column
// mapping, and each row becomes one logged set in IronLogic's workouts.

export const FIELD_ALIASES = {
    date: ['date', 'workout date', 'session date', 'training date', 'day'],
    exercise: ['exercise', 'exercise name', 'lift', 'movement', 'exercise title'],
    weight: ['weight', 'load', 'weight kg', 'weight (kg)', 'weight lbs', 'weight (lbs)', 'weight lb', 'kg', 'lbs'],
    reps: ['reps', 'rep', 'repetitions'],
    rpe: ['rpe', 'rpe rating', '@rpe', 'rpe @', 'intensity'],
    sets: ['sets', 'set'],
    notes: ['notes', 'note', 'comment', 'comments'],
};

export const REQUIRED_FIELDS = ['date', 'exercise'];

/** Minimal RFC-4180-ish parser: handles quoted fields and embedded commas. */
export function parseCSV(text) {
    const rows = [];
    let row = [], field = '', inQuotes = false;
    const pushField = () => { row.push(field); field = ''; };
    const pushRow = () => { rows.push(row); row = []; };

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') { field += '"'; i++; }
                else inQuotes = false;
            } else field += c;
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            pushField();
        } else if (c === '\n') {
            pushField(); pushRow();
        } else if (c === '\r') {
            // ignore; \n handles the break
        } else {
            field += c;
        }
    }
    pushField();
    if (row.length > 1 || row[0] !== '') pushRow();
    if (rows.length === 0) return { headers: [], rows: [] };
    const [headers, ...rest] = rows;
    return { headers: headers.map(h => h.trim()), rows: rest.filter(r => r.some(cell => cell.trim() !== '')) };
}

/** Fuzzy-match headers to canonical fields. Returns { field: columnIndex | -1 }. */
export function detectColumns(headers) {
    const lowered = headers.map(h => h.toLowerCase().trim());
    const map = {};
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
        let idx = -1;
        for (const alias of aliases) {
            idx = lowered.findIndex(h => h === alias || h.includes(alias));
            if (idx !== -1) break;
        }
        map[field] = idx;
    }
    return map;
}

/** Accepts YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY-ish, ISO datetimes. Returns YYYY-MM-DD or null. */
export function normalizeDate(value) {
    if (value == null) return null;
    const s = String(value).trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (m) {
        const year = m[3].length === 2 ? `20${m[3]}` : m[3];
        return `${year}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return null;
}

const slugify = (name) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Convert parsed rows to IronLogic workout set docs.
 * colMap: { field: columnIndex }. opts: { csvUnit: 'kg'|'lb', appUnit: 'kg'|'lb' }.
 * Returns { workouts, skipped }.
 */
export function rowsToWorkouts(rows, colMap, opts = {}) {
    const { csvUnit = 'kg', appUnit = 'kg' } = opts;
    const workouts = [];
    let skipped = 0;

    for (const row of rows) {
        const cell = (field) => {
            const idx = colMap[field];
            return idx >= 0 && idx < row.length ? row[idx].trim() : '';
        };
        const date = normalizeDate(cell('date'));
        const exerciseName = cell('exercise');
        if (!date || !exerciseName) { skipped++; continue; }

        let weight = parseFloat(cell('weight'));
        weight = Number.isFinite(weight) ? weight : null;
        if (weight != null && csvUnit !== appUnit) {
            weight = csvUnit === 'lb' ? weight * 0.45359237 : weight / 0.45359237;
            weight = Math.round(weight * 10) / 10;
        }
        let reps = parseInt(cell('reps'), 10);
        reps = Number.isFinite(reps) ? reps : null;
        let rpe = parseFloat(cell('rpe'));
        rpe = Number.isFinite(rpe) ? rpe : null;

        workouts.push({
            date,
            exerciseId: slugify(exerciseName),
            exerciseName,
            name: exerciseName,
            weight,
            reps,
            actualRpe: rpe,
            sets: 1,
            notes: cell('notes') || '',
            source: 'rts-import',
            importedAt: new Date().toISOString(),
        });
    }
    return { workouts, skipped };
}
