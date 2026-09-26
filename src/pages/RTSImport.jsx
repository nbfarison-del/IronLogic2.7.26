import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import * as firestoreService from '../services/firestoreService';
import {
    FIELD_ALIASES, REQUIRED_FIELDS,
    parseCSV, detectColumns, rowsToWorkouts,
} from '../services/RTSImport';

const FIELDS = Object.keys(FIELD_ALIASES);

const RTSImport = () => {
    const { user } = useAuth();
    const { unit: appUnit } = useSettings();
    const { showToast } = useToast();

    const [step, setStep] = useState('pick'); // pick | map | importing | done
    const [headers, setHeaders] = useState([]);
    const [rows, setRows] = useState([]);
    const [colMap, setColMap] = useState({});
    const [csvUnit, setCsvUnit] = useState('kg');
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [result, setResult] = useState(null);

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const { headers: h, rows: r } = parseCSV(text);
            if (h.length === 0 || r.length === 0) {
                showToast('Could not parse that CSV — is it the RTS training data export?', 'error');
                return;
            }
            setHeaders(h);
            setRows(r);
            setColMap(detectColumns(h));
            setStep('map');
        } catch {
            showToast('Could not read that file.', 'error');
        }
    };

    const preview = rowsToWorkouts(rows.slice(0, 5), colMap, { csvUnit, appUnit });

    const canImport = REQUIRED_FIELDS.every(f => colMap[f] >= 0);

    const handleImport = async () => {
        const { workouts, skipped } = rowsToWorkouts(rows, colMap, { csvUnit, appUnit });
        if (workouts.length === 0) {
            showToast('Nothing to import — check the column mapping.', 'error');
            return;
        }
        setStep('importing');
        setProgress({ done: 0, total: workouts.length });
        let imported = 0;
        try {
            for (const w of workouts) {
                await firestoreService.addWorkout(user.id, w);
                imported++;
                if (imported % 5 === 0 || imported === workouts.length) {
                    setProgress({ done: imported, total: workouts.length });
                }
            }
            setResult({ imported, skipped });
            setStep('done');
        } catch (err) {
            console.error('RTS import failed:', err);
            showToast(`Import stopped after ${imported} sets: ${err.message}`, 'error');
            setResult({ imported, skipped });
            setStep('done');
        }
    };

    return (
        <div className="animate-in" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
            <p className="page-kicker">Data Import</p>
            <h1 style={{ marginTop: 0 }}>Import from RTS</h1>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Export your training data from Reactive Training Systems as CSV, upload it here,
                and each row becomes a logged set in IronLogic. RTS stays your system of record —
                this is a one-way copy.
            </p>

            {step === 'pick' && (
                <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📥</div>
                    <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                        Choose CSV file
                        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
                    </label>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
                        In RTS: Training Log → Export Training Data → download the CSV.
                    </p>
                </div>
            )}

            {step === 'map' && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ marginTop: 0 }}>Match your columns</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {rows.length} rows found. Date and exercise are required.
                        </p>
                        {FIELDS.map(field => (
                            <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                                <label style={{ width: '110px', fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                    {field}{REQUIRED_FIELDS.includes(field) && ' *'}
                                </label>
                                <select
                                    value={colMap[field] ?? -1}
                                    onChange={e => setColMap({ ...colMap, [field]: parseInt(e.target.value, 10) })}
                                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', background: '#222', color: 'white', border: '1px solid #444' }}
                                >
                                    <option value={-1}>— ignore —</option>
                                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Weights in the CSV are in</label>
                            <select
                                value={csvUnit}
                                onChange={e => setCsvUnit(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: '8px', background: '#222', color: 'white', border: '1px solid #444' }}
                            >
                                <option value="kg">kg</option>
                                <option value="lb">lb</option>
                            </select>
                            {csvUnit !== appUnit && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Will convert to {appUnit} on import.
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: '1.25rem' }}>
                        <h3 style={{ marginTop: 0 }}>Preview</h3>
                        {preview.workouts.length === 0 ? (
                            <p style={{ color: '#f66' }}>No rows map cleanly — check date and exercise columns.</p>
                        ) : (
                            preview.workouts.map((w, i) => (
                                <div key={i} style={{ fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid #222' }}>
                                    {w.date} · <strong>{w.exerciseName}</strong>
                                    {w.weight != null && ` · ${w.weight}`}×{w.reps ?? '–'}
                                    {w.actualRpe != null && ` @${w.actualRpe}`}
                                </div>
                            ))
                        )}
                    </div>

                    <button className="btn btn-primary" disabled={!canImport || preview.workouts.length === 0} onClick={handleImport}
                        style={{ opacity: canImport && preview.workouts.length > 0 ? 1 : 0.4 }}>
                        Import {rowsToWorkouts(rows, colMap, { csvUnit, appUnit }).workouts.length} sets
                    </button>
                </div>
            )}

            {step === 'importing' && (
                <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <h3>Importing…</h3>
                    <div style={{ height: '8px', background: '#333', borderRadius: '4px', margin: '1.5rem 0' }}>
                        <div style={{
                            height: '100%', background: 'var(--primary)', borderRadius: '4px',
                            width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                            transition: 'width 0.2s'
                        }} />
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>{progress.done} / {progress.total} sets</p>
                </div>
            )}

            {step === 'done' && result && (
                <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h2>Import complete</h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {result.imported} sets imported{result.skipped > 0 && `, ${result.skipped} rows skipped`}.
                    </p>
                    <button className="btn" onClick={() => { setStep('pick'); setResult(null); }}>
                        Import another file
                    </button>
                </div>
            )}
        </div>
    );
};

export default RTSImport;
