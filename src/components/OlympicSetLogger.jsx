import { calculateLoadFromPercentage } from '../utils/olympicWeightlifting';

const compactButtonStyle = {
    minWidth: '34px',
    height: '32px',
    padding: '0 0.45rem',
    fontSize: '0.75rem'
};

const OlympicSetLogger = ({
    row,
    oneRepMax,
    onChange,
    onAdjustWeight,
    onDuplicate,
    onRemove,
    canRemove,
    isFocusMode
}) => {
    const applyPercentage = (percentage) => {
        const nextWeight = calculateLoadFromPercentage(oneRepMax, percentage);
        onChange('percentageOf1RM', String(percentage));
        if (nextWeight !== '') onChange('weight', String(nextWeight));
    };

    const adjustRpe = (amount) => {
        const current = parseFloat(row.actualRpe || row.targetRpe || 7);
        const next = Math.min(10, Math.max(1, current + amount));
        onChange('actualRpe', String(next));
    };

    return (
        <div className="glass" style={{ padding: isFocusMode ? '1rem' : '0.75rem', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.65rem', alignItems: 'end' }}>
                <div className="input-group" style={{ margin: 0 }}>
                    <label>Load</label>
                    <input
                        type="number"
                        value={row.weight}
                        onChange={(e) => onChange('weight', e.target.value)}
                        className="pro-input"
                    />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                    <label>% 1RM</label>
                    <input
                        type="number"
                        value={row.percentageOf1RM || ''}
                        onChange={(e) => {
                            onChange('percentageOf1RM', e.target.value);
                            const nextWeight = calculateLoadFromPercentage(oneRepMax, e.target.value);
                            if (nextWeight !== '') onChange('weight', String(nextWeight));
                        }}
                        className="pro-input"
                    />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                    <label>Reps</label>
                    <input
                        type="number"
                        value={row.reps}
                        onChange={(e) => onChange('reps', e.target.value)}
                        className="pro-input"
                    />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                    <label>RPE</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={row.actualRpe}
                        onChange={(e) => onChange('actualRpe', e.target.value)}
                        className="pro-input"
                    />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                    <label>Quality</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={row.technicalQualityScore || ''}
                        onChange={(e) => onChange('technicalQualityScore', e.target.value)}
                        className="pro-input"
                    />
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                    <label>Speed</label>
                    <select
                        value={row.barSpeedRating || ''}
                        onChange={(e) => onChange('barSpeedRating', e.target.value)}
                    >
                        <option value="">--</option>
                        <option value="fast">Fast</option>
                        <option value="crisp">Crisp</option>
                        <option value="steady">Steady</option>
                        <option value="slow">Slow</option>
                        <option value="grindy">Grindy</option>
                    </select>
                </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem', alignItems: 'center' }}>
                {[70, 75, 80, 85, 90].map(percentage => (
                    <button key={percentage} type="button" className="btn" style={compactButtonStyle} onClick={() => applyPercentage(percentage)}>
                        {percentage}%
                    </button>
                ))}
                <button type="button" className="btn" style={compactButtonStyle} onClick={() => onAdjustWeight(-5)}>-5</button>
                <button type="button" className="btn" style={compactButtonStyle} onClick={() => onAdjustWeight(-2.5)}>-2.5</button>
                <button type="button" className="btn" style={compactButtonStyle} onClick={() => onAdjustWeight(2.5)}>+2.5</button>
                <button type="button" className="btn" style={compactButtonStyle} onClick={() => onAdjustWeight(5)}>+5</button>
                <button type="button" className="btn" style={compactButtonStyle} onClick={() => adjustRpe(-0.5)}>RPE -</button>
                <button type="button" className="btn" style={compactButtonStyle} onClick={() => adjustRpe(0.5)}>RPE +</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto', fontSize: '0.85rem' }}>
                    <input
                        type="checkbox"
                        checked={Boolean(row.missedLift)}
                        onChange={(e) => onChange('missedLift', e.target.checked)}
                    />
                    Miss
                </label>
                <button type="button" className="btn" style={compactButtonStyle} onClick={onDuplicate}>Duplicate</button>
                {canRemove && (
                    <button type="button" className="btn" style={{ ...compactButtonStyle, color: 'var(--accent-error)' }} onClick={onRemove}>
                        Remove
                    </button>
                )}
            </div>
        </div>
    );
};

export default OlympicSetLogger;
