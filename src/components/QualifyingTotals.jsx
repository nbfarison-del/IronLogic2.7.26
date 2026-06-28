import { useMemo, useState } from 'react';
import { WEIGHT_CLASSES, OPEN_QUALIFYING_TOTALS, MASTERS_QUALIFYING_TOTALS, getQualifyingStatus } from '../data/qualifyingTotals';

const QualifyingTotals = ({ athleteTotal, bodyWeightKg, gender, age, unit }) => {
    const [view, setView] = useState('status');
    const [selectedGender, setSelectedGender] = useState(gender || 'men');
    const status = useMemo(() => {
        if (!athleteTotal || !bodyWeightKg) return null;
        return getQualifyingStatus({ athleteTotal, bodyWeightKg, gender: gender || 'men', age: age || 25 });
    }, [athleteTotal, bodyWeightKg, gender, age]);

    const openTable = OPEN_QUALIFYING_TOTALS[selectedGender];
    const mastersTable = MASTERS_QUALIFYING_TOTALS[selectedGender];
    const weightClasses = useMemo(() => WEIGHT_CLASSES[selectedGender] || [], [selectedGender]);

    const ageGroups = useMemo(() => {
        return Object.keys(mastersTable?.[weightClasses[0]] || {});
    }, [mastersTable, weightClasses]);

    return (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div>
                    <p className="page-kicker">Qualifying Totals</p>
                    <h2 style={{ marginTop: 0 }}>Open & Masters Standards</h2>
                </div>
                <div className="segmented-control" style={{ margin: 0 }}>
                    <button type="button" className={view === 'status' ? 'active' : ''} onClick={() => setView('status')}>My Status</button>
                    <button type="button" className={view === 'open' ? 'active' : ''} onClick={() => setView('open')}>Open</button>
                    <button type="button" className={view === 'masters' ? 'active' : ''} onClick={() => setView('masters')}>Masters</button>
                </div>
            </div>

            {view === 'status' && (
                <div>
                    {status ? (
                        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="card" style={{ padding: '1rem', background: status.openQualified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${status.openQualified ? 'var(--accent-success)' : 'var(--text-muted)'}` }}>
                                    <small style={{ fontWeight: 600 }}>Open Qualification</small>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem' }}>
                                        {status.openQualified ? 'Qualified' : `${status.openPercent}%`}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {status.weightClass} need {status.openTotal} {unit} | Your total: {athleteTotal} {unit}
                                    </div>
                                </div>
                                <div className="card" style={{ padding: '1rem', background: status.mastersQualified ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${status.mastersQualified ? 'var(--accent-success)' : 'var(--text-muted)'}` }}>
                                    <small style={{ fontWeight: 600 }}>Masters Qualification</small>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '0.25rem' }}>
                                        {status.mastersAgeGroup ? (status.mastersQualified ? 'Qualified' : `${status.mastersPercent}%`) : 'N/A (under 35)'}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {status.mastersAgeGroup ? `${status.mastersAgeGroup} need ${status.mastersTotal} ${unit}` : 'Masters starts at age 35'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '0.65rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                Body weight: {bodyWeightKg} kg | Class: {status.weightClass} | 
                                {status.mastersAgeGroup ? ` Age group: ${status.mastersAgeGroup}` : ' Open class'}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ marginTop: '0.75rem' }}>
                            Log your body weight and a competition total to see your qualifying status.
                        </div>
                    )}
                </div>
            )}

            {view === 'open' && (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
                        <button className={`btn ${selectedGender === 'men' ? 'btn-primary' : ''}`} style={{ fontSize: '0.85rem' }} onClick={() => setSelectedGender('men')}>Men</button>
                        <button className={`btn ${selectedGender === 'women' ? 'btn-primary' : ''}`} style={{ fontSize: '0.85rem' }} onClick={() => setSelectedGender('women')}>Women</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '500px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>Class</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>Snatch</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>C&J</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>Total</th>
                                    {status && <th style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>My Total</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {weightClasses.map(wc => {
                                    const data = openTable?.[wc];
                                    const isMyClass = status?.weightClass === wc;
                                    return (
                                        <tr key={wc} style={{ background: isMyClass ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent' }}>
                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', fontWeight: 700 }}>{wc}</td>
                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'center' }}>{data?.snatch || '--'}</td>
                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'center' }}>{data?.cleanJerk || '--'}</td>
                                            <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'center', fontWeight: 700 }}>{data?.total || '--'}</td>
                                            {status && (
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'center', color: isMyClass ? 'var(--primary)' : 'var(--text-subtle)' }}>
                                                    {isMyClass ? athleteTotal : '--'}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {view === 'masters' && (
                <div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <button className={`btn ${selectedGender === 'men' ? 'btn-primary' : ''}`} style={{ fontSize: '0.85rem' }} onClick={() => setSelectedGender('men')}>Men</button>
                        <button className={`btn ${selectedGender === 'women' ? 'btn-primary' : ''}`} style={{ fontSize: '0.85rem' }} onClick={() => setSelectedGender('women')}>Women</button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '800px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)' }}>
                                    <th style={{ textAlign: 'left', padding: '0.4rem', borderBottom: '1px solid var(--border-glass)' }}>Class</th>
                                    {ageGroups.map(ag => (
                                        <th key={ag} style={{ textAlign: 'center', padding: '0.4rem', borderBottom: '1px solid var(--border-glass)' }}>{ag}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {weightClasses.map(wc => {
                                    const row = mastersTable?.[wc];
                                    const isMyClass = status?.weightClass === wc;
                                    return (
                                        <tr key={wc} style={{ background: isMyClass ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent' }}>
                                            <td style={{ padding: '0.4rem', borderBottom: '1px solid var(--border-glass)', fontWeight: 700 }}>{wc}</td>
                                            {ageGroups.map(ag => {
                                                const val = row?.[ag];
                                                const isMyAgeGroup = isMyClass && ag === status?.mastersAgeGroup;
                                                return (
                                                    <td key={ag} style={{
                                                        padding: '0.4rem',
                                                        borderBottom: '1px solid var(--border-glass)',
                                                        textAlign: 'center',
                                                        fontWeight: isMyAgeGroup ? 800 : 400,
                                                        color: isMyAgeGroup ? 'var(--primary)' : 'var(--text-main)'
                                                    }}>
                                                        {val ?? '--'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                Standards based on USA Weightlifting qualifying totals. Always verify with the official USAW qualifying totals hub before competition entry.
            </div>
        </div>
    );
};

export default QualifyingTotals;
