/**
 * One-tap "what's today's training?" chips. Not a log — just the single
 * signal the mobility prescription needs.
 */
const TrainingTypeSelector = ({ trainingTypes, value, onChange }) => {
    return (
        <div>
            <p className="page-kicker" style={{ margin: '0 0 0.5rem' }}>What&apos;s today&apos;s training?</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {trainingTypes.map(t => {
                    const active = value === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => onChange(active ? null : t.key)}
                            aria-pressed={active}
                            style={{
                                border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: active ? 'rgba(var(--primary-rgb), 0.16)' : 'var(--card-bg)',
                                color: active ? 'var(--primary)' : 'var(--text)',
                                borderRadius: '999px',
                                padding: '0.5rem 0.95rem',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                            }}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TrainingTypeSelector;
